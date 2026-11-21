import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { Badge, Field, PageHead } from "@/components/admin/ui";
import { saveSettings } from "@/lib/admin/actions/settings";
import { getAdminContext } from "@/lib/admin/auth";
import { fmtDate } from "@/lib/admin/form";
import { getAdminSettings, listProfiles } from "@/lib/admin/queries/settings";
import { hasRole } from "@/lib/admin/roles";

export const metadata = { title: "Settings" };

const RAILS = [
  "Every AI post is labeled “AI-written” on the live site.",
  "No quotes attributed to members, ever.",
  "Facts must match CMS data or a cited official source; anything else is flagged.",
  "A person must approve each post before it goes live.",
];

export default async function AdminSettings() {
  const ctx = await getAdminContext();
  if (ctx.configured && !hasRole(ctx.role, "admin")) redirect("/admin/denied"); // middleware already enforces; defence in depth
  const [s, profiles] = await Promise.all([getAdminSettings(), listProfiles()]);
  const ro = !ctx.configured;

  return (
    <div className="a-stack" style={{ maxWidth: 1120, width: "100%", gap: 20 }}>
      <PageHead title="Settings" desc="Site-wide settings. Nothing changes on the live site until you save." />

      <ActionForm action={saveSettings} readOnly={ro} className="a-stack">
        <section className="a-card a-sec" aria-labelledby="s-gen" style={{ gap: 20 }}>
          <div className="a-sec-h"><h2 id="s-gen">General</h2><p>Name, tagline and the disclaimer shown in every footer.</p></div>
          <div className="a-sec-b">
            <Field label="Site name"><input name="site_name" defaultValue={s.site_name} className="a-inp" /></Field>
            <Field label="Tagline"><input name="tagline" defaultValue={s.tagline} className="a-inp" /></Field>
            <Field label="Disclaimer *" hint="Must say the site is unofficial and who owns the rights."><textarea name="disclaimer" defaultValue={s.disclaimer} className="a-inp" required /></Field>
            <div className="a-row" style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
              <span><span className="a-lbl">Event times</span><br /><span className="a-hint">Shown in each visitor’s own timezone, converted from the venue timezone.</span></span>
              <Badge>Automatic</Badge>
            </div>
          </div>
        </section>

        <section className="a-card a-sec" aria-labelledby="s-soc">
          <div className="a-sec-h"><h2 id="s-soc">Social links</h2><p>Shown in the footer and on the About page.</p></div>
          <div className="a-sec-b">
            <Field label="Links" hint="One per line as “Label | https://…”.">
              <textarea name="social_links" defaultValue={s.social_links.map((l) => `${l.label} | ${l.href}`).join("\n")} className="a-inp a-mono" rows={5} />
            </Field>
          </div>
        </section>

        <section className="a-card a-sec" aria-labelledby="s-ai">
          <div className="a-sec-h"><h2 id="s-ai">AI daily post</h2><p>Writes one draft a day. Drafts wait in <Link href="/admin/posts">AI Blog</Link> for a person to approve.</p></div>
          <div className="a-sec-b">
            <label className="a-check"><input type="checkbox" name="ai_enabled" defaultChecked={s.ai_enabled} /><span className="a-lbl" style={{ color: "var(--ink)" }}>Generate a daily draft</span></label>
            <div className="a-g2">
              <Field label="Run time (Asia/Bangkok)"><input name="ai_time" type="time" defaultValue={s.ai_time} className="a-inp" required /></Field>
              <Field label="Model"><input name="ai_model" defaultValue={s.ai_model} placeholder="Set when the LLM is chosen" className="a-inp a-mono" /></Field>
            </div>
            <Field label="Prompt" hint="Base instructions for the writer. The guardrails below are always added.">
              <textarea name="ai_prompt" defaultValue={s.ai_prompt} className="a-inp" rows={6} />
            </Field>
            <div style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "14px 16px", background: "var(--soft)", display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="a-row" style={{ minHeight: 0 }}><span className="a-lbl">Guardrails</span><Badge>Locked</Badge></div>
              {RAILS.map((r) => (
                <div key={r} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, lineHeight: 1.45 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none", marginTop: 2 }}><path d="M5 12l5 5 9-10" /></svg>
                  <span>{r}</span>
                </div>
              ))}
              <span className="a-hint">These can’t be switched off from the admin.</span>
            </div>
          </div>
        </section>

        <div className="a-card a-sticky" role="region" aria-label="Save settings">
          <span style={{ flex: 1, fontWeight: 600 }}>Changes apply to the live site after you save.</span>
          <SubmitButton variant="primary">Save changes</SubmitButton>
        </div>
      </ActionForm>

      <section className="a-card a-sec" aria-labelledby="s-users">
        <div className="a-sec-h">
          <h2 id="s-users">Users &amp; roles</h2>
          <p><strong>Admin</strong> can do everything. <strong>Editor</strong> edits content and media. Role changes and bans move to the Users page.</p>
        </div>
        <div className="a-sec-b">
          <div className="a-card a-scroll">
            <table className="a-tbl">
              <thead><tr><th scope="col">Name</th><th scope="col">Role</th><th scope="col">Since</th><th scope="col">Status</th></tr></thead>
              <tbody>
                {profiles.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.display_name ?? "—"}{p.id === ctx.userId ? <span className="a-sub" style={{ fontWeight: 400 }}> · you</span> : null}</td>
                    <td style={{ textTransform: "capitalize" }}>{p.role}</td>
                    <td className="a-mono" style={{ fontSize: 13 }}>{fmtDate(p.created_at)}</td>
                    <td>{p.is_banned ? <Badge tone="bad">Banned</Badge> : <Badge tone="ok">Active</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {profiles.length === 0 && <p className="a-empty">{ro ? "Connect the database to see admins and editors." : "No admins or editors found."}</p>}
          </div>
        </div>
      </section>
    </div>
  );
}
