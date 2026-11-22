// Official embeds only. Both helpers return null for anything that is not a recognised Spotify / YouTube URL,
// so editor-entered URLs can never inject an arbitrary iframe source.
const SPOTIFY = /^https:\/\/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(track|album|playlist)\/([A-Za-z0-9]{10,32})(?:[/?#]|$)/;
const YOUTUBE_HOSTS = new Set(["www.youtube.com", "youtube.com", "m.youtube.com"]);

export function spotifyEmbedUrl(url: string | null | undefined): string | null {
  const m = url ? SPOTIFY.exec(url) : null;
  return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}` : null;
}

/** The 11-character video id of a YouTube watch / youtu.be / embed URL, or null. */
export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    let id: string | null = null;
    if (u.hostname === "youtu.be") id = u.pathname.slice(1);
    else if (YOUTUBE_HOSTS.has(u.hostname)) id = u.pathname === "/watch" ? u.searchParams.get("v") : u.pathname.startsWith("/embed/") ? u.pathname.slice(7) : null;
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function youtubeEmbedUrl(url: string | null | undefined): string | null {
  const id = youtubeId(url);
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}

export { coverBg } from "@/lib/media-url";
