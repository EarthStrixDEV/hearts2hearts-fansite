/** Dates are shown in KST so server and client render the same day for the same post. */
const TZ = "Asia/Seoul";

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: TZ });

/** Calendar parts of an ISO timestamp in KST. */
export function kstParts(iso: string | number) {
  const d = new Date((typeof iso === "string" ? Date.parse(iso) : iso) + 9 * 3600 * 1000);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate() };
}

const TAG_BG: Record<string, string> = {
  trivia: "#DDF0FF",
  "song-analysis": "#E6DCFF",
  "era-recap": "#FFE3F1",
  fun: "#FFF1D6",
};
export const tagBg = (slug?: string) => (slug && TAG_BG[slug]) || "#FFE3F1";

export const blogHref = (p: { tag?: string; q?: string; page?: number }) => {
  const sp = new URLSearchParams();
  if (p.tag) sp.set("tag", p.tag);
  if (p.q) sp.set("q", p.q);
  if (p.page && p.page > 1) sp.set("page", String(p.page));
  const qs = sp.toString();
  return qs ? `/blog?${qs}` : "/blog";
};
