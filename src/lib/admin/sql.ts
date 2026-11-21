// Tiny SQL helpers for the admin. Column/table names come from code, never from user input; values always go through $n params.

/** UTC ISO string column (pg would otherwise hand back a Date, but our row types say string). */
export const ts = (col: string, as = col.split(".").pop()!) => `to_char(${col} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as ${as}`;
/** date column as YYYY-MM-DD text. */
export const dt = (col: string, as = col.split(".").pop()!) => `${col}::text as ${as}`;

export const MEMBER_COLS = `id, slug, stage_name, name_ko, real_name, ${dt("birth_date")}, position, color_hex, bio, avatar_id, cover_id, gallery_ids, sort_order, status, ${ts("created_at")}, ${ts("updated_at")}, updated_by`;
export const ALBUM_COLS = `id, slug, title, album_type, ${dt("release_date")}, cover_id, description, spotify_url, status, ${ts("created_at")}, ${ts("updated_at")}, updated_by`;
export const TRACK_COLS = `id, album_id, track_no, title, duration_sec, is_title_track, spotify_url, youtube_url`;
export const POST_COLS = `id, slug, title, excerpt, body_md, cover_id, member_id, source, status, ${ts("published_at")}, ${ts("created_at")}, ${ts("updated_at")}, updated_by`;
export const EVENT_COLS = `id, title, event_type, ${ts("starts_at")}, ${ts("ends_at")}, venue, city, country, ticket_url, poster_id, is_cancelled, status, ${ts("created_at")}, ${ts("updated_at")}, updated_by`;
export const MEDIA_COLS = `id, path, mime_type, width, height, alt, credit, uploaded_by, ${ts("created_at")}`;

/** `%x%` pattern for ilike with LIKE wildcards escaped. */
export const likeOf = (s: string) => `%${s.replace(/[\\%_]/g, (c) => "\\" + c)}%`;

/** Accumulates `where` fragments. Use `?` as the placeholder (all `?` in one fragment share the same value). */
export class Where {
  private parts: string[] = [];
  readonly params: unknown[] = [];
  add(fragment: string, value?: unknown) {
    if (value === undefined) this.parts.push(fragment);
    else {
      this.params.push(value);
      this.parts.push(fragment.replace(/\?/g, `$${this.params.length}`));
    }
    return this;
  }
  get clause() {
    return this.parts.length ? `where ${this.parts.join(" and ")}` : "";
  }
}

export function insertSql(table: string, row: Record<string, unknown>, returning: string) {
  const cols = Object.keys(row);
  return {
    text: `insert into ${table} (${cols.join(", ")}) values (${cols.map((_, i) => `$${i + 1}`).join(", ")}) returning ${returning}`,
    params: cols.map((c) => row[c]),
  };
}

export function updateSql(table: string, row: Record<string, unknown>, id: string, returning: string, touch = true) {
  const cols = Object.keys(row);
  const set = cols.map((c, i) => `${c} = $${i + 1}`).concat(touch ? ["updated_at = now()"] : []);
  return { text: `update ${table} set ${set.join(", ")} where id = $${cols.length + 1} returning ${returning}`, params: [...cols.map((c) => row[c]), id] };
}

/** Postgres error code from a thrown pg error. */
export const pgCode = (e: unknown): string | undefined => (typeof e === "object" && e && "code" in e ? String((e as { code: unknown }).code) : undefined);
