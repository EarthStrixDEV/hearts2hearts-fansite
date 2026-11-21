// AI daily blog pipeline (docs/spec.md §6) on Neon Postgres via query() from @/lib/neon/db.
// Never publishes: posts are inserted as source='ai', status='draft'; a human approves in the AI Queue.
import { hasDb, query, queryOne, withTx } from "@/lib/neon/db";
import { callLLM, DEFAULT_MODEL } from "./llm";

// Keep in sync with the `ai_prompt` seed in db/migrations/0003_seed_site_settings.sql.
export const DEFAULT_AI_PROMPT =
  "You write short daily blog posts for H2H·S2U, an unofficial fan site for the K-pop group Hearts2Hearts. " +
  "Tone: warm, upbeat, fan-to-fan, easy English, no hype claims. Length: 250-400 words, Markdown, with a short title. " +
  "Use ONLY the facts given in the context (next event, latest release). Never invent dates, venues, quotes, " +
  "chart positions or member details; if the context is thin, write about the music or the community instead. " +
  "Do not claim to be official. Do not mention that you are an AI.";

// Appended in code (not editable via ai_prompt) so a prompt edit can never break the parser.
const OUTPUT_FORMAT =
  'Respond with ONLY one JSON object, no code fences: {"title": string, "excerpt": string (max 160 chars), ' +
  '"body_md": string (Markdown body, do not repeat the title as an H1)}.';

export type AiBlogResult =
  | { status: "drafted"; runDate: string; jobId: string; postId: string }
  | { status: "skipped"; runDate: string; reason: string }
  | { status: "failed"; runDate: string; jobId?: string; error: string };

/** YYYY-MM-DD in Asia/Bangkok. The cron fires 02:00 UTC = 09:00 ICT, so this is the local "today". */
const bangkokDate = (d = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 2000);

interface Draft {
  title: string;
  excerpt: string | null;
  body_md: string;
}

function parseDraft(raw: string): Draft {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("LLM output has no JSON object");
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(raw.slice(start, end + 1));
  } catch {
    throw new Error("LLM output is not valid JSON");
  }
  const title = typeof obj.title === "string" ? obj.title.trim() : "";
  const body = typeof obj.body_md === "string" ? obj.body_md.trim() : "";
  if (!title || !body) throw new Error("LLM JSON is missing title or body_md");
  const excerpt = typeof obj.excerpt === "string" && obj.excerpt.trim() ? obj.excerpt.trim().slice(0, 300) : null;
  return { title, excerpt, body_md: body };
}

async function buildContext(runDate: string) {
  // Next published, non-cancelled event
  const e = await queryOne<{ title: string; event_type: string; starts_at: string; venue: string | null; city: string | null; country: string | null }>(
    `select title, event_type, to_char(starts_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI"Z"') as starts_at, venue, city, country
       from events
      where status = 'published' and not is_cancelled and starts_at >= now()
      order by starts_at asc
      limit 1`,
  );

  // Latest published release (not in the future); featured track = its title track, else lowest track_no
  const a = await queryOne<{ id: string; title: string; album_type: string; release_date: string | null }>(
    `select id, title, album_type, release_date::text as release_date
       from albums
      where status = 'published' and release_date is not null and release_date <= $1::date
      order by release_date desc
      limit 1`,
    [runDate],
  );
  const track = a
    ? await queryOne<{ title: string }>(
        `select title from tracks where album_id = $1 order by is_title_track desc, track_no asc limit 1`,
        [a.id],
      )
    : null;

  // Editable prompt; fall back to the built-in default if the row is missing or not a string
  const st = await queryOne<{ value: unknown }>(`select value from site_settings where key = 'ai_prompt'`);
  const prompt = typeof st?.value === "string" && st.value.trim() ? st.value : DEFAULT_AI_PROMPT;

  const where = e ? [e.venue, e.city, e.country].filter(Boolean).join(", ") : "";
  const eventLine = e
    ? `Next scheduled event: "${e.title}" (${e.event_type}) on ${e.starts_at}${where ? ` at ${where}` : ""}.`
    : "Next scheduled event: none announced.";
  const releaseLine = a
    ? `Latest release: "${a.title}" (${a.album_type}${a.release_date ? `, released ${a.release_date}` : ""})${track ? `; featured track: "${track.title}"` : ""}.`
    : "Latest release: none on record.";

  return {
    system: `${prompt}\n\n${OUTPUT_FORMAT}`,
    user: `Today (Asia/Bangkok): ${runDate}\n${eventLine}\n${releaseLine}\n\nWrite today's post.`,
  };
}

export async function runAiBlog(): Promise<AiBlogResult> {
  const runDate = bangkokDate();
  if (!hasDb()) return { status: "failed", runDate, error: "DATABASE_URL is not configured" };
  const model = process.env.LLM_MODEL || DEFAULT_MODEL;

  // Step 2: claim today. run_date is UNIQUE, so a second run the same day inserts nothing.
  // prompt is NOT NULL but unknown until context is built, so it is '' here and filled in on success.
  let jobId: string;
  try {
    const claim = await queryOne<{ id: string }>(
      `insert into ai_jobs (run_date, prompt, model, state) values ($1::date, '', $2, 'pending')
       on conflict (run_date) do nothing
       returning id`,
      [runDate, model],
    );
    if (!claim) return { status: "skipped", runDate, reason: "already ran today" };
    jobId = claim.id;
  } catch (e) {
    return { status: "failed", runDate, error: `could not create ai_jobs row: ${errMsg(e)}` };
  }

  try {
    // Step 3: context
    const { system, user } = await buildContext(runDate);

    // Step 4: LLM -> title + body markdown
    const draft = parseDraft(await callLLM({ system, user, model }));

    // Step 4/5: insert post as AI draft (never published here) + mark the job drafted, atomically
    const base = `${slugify(draft.title) || "ai-post"}-${runDate}`;
    const postId = await withTx(async (q) => {
      const insertPost = (slug: string) =>
        q<{ id: string }>(
          `insert into posts (slug, title, excerpt, body_md, source, status)
           values ($1, $2, $3, $4, 'ai', 'draft')
           on conflict (slug) do nothing
           returning id`,
          [slug, draft.title, draft.excerpt, draft.body_md],
        );
      let rows = await insertPost(base);
      if (!rows[0]) rows = await insertPost(`${base}-${Math.random().toString(36).slice(2, 6)}`);
      if (!rows[0]) throw new Error("could not allocate a unique post slug");
      await q(
        `update ai_jobs set state = 'drafted', post_id = $2, topic = $3, prompt = $4, error = null where id = $1`,
        [jobId, rows[0].id, draft.title, `${system}\n\n---\n\n${user}`],
      );
      return rows[0].id;
    });

    return { status: "drafted", runDate, jobId, postId };
  } catch (e) {
    // Step 6: any error -> failed + message (visible in AI Queue)
    const error = errMsg(e);
    try {
      await query(`update ai_jobs set state = 'failed', error = $2 where id = $1`, [jobId, error]);
    } catch {
      // keep the original error in the response even if recording it failed
    }
    return { status: "failed", runDate, jobId, error };
  }
}
