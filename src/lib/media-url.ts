// Pure helpers (safe in client and server code) for images hosted on X's CDN.
// An X image is stored in `media.path` as its canonical https URL instead of an object key in our bucket.
// The DB enforces the same shape (migration 0005), so nothing else can be hotlinked.

const KINDS = "media|profile_images|ext_tw_video_thumb|amplify_video_thumb|tweet_video_thumb";
const X_IMAGE_RE = new RegExp(`^https://pbs\\.twimg\\.com/(${KINDS})/[A-Za-z0-9_\\-./]+(\\?[A-Za-z0-9_=&.\\-]*)?$`);

/** True for a canonical X CDN image URL (what we store in media.path for hotlinked images). */
export const isXImageUrl = (s: string | null | undefined): boolean => !!s && X_IMAGE_RE.test(s);

const YTM_COVER_RE = new RegExp("^https://i\\.ytimg\\.com/vi/[A-Za-z0-9_-]{11}/(maxresdefault|hqdefault|hq720|oar2)\\.jpg$");

/** YouTube Music release art: the thumbnail of the album's art-track video (a square cover centred in a 16:9 frame). */
export const isYtmCoverUrl = (s: string | null | undefined): boolean => !!s && YTM_COVER_RE.test(s);

/** Any image we allow to be hotlinked and stored in media.path: X CDN images and YouTube Music release art. */
export const isRemoteImageUrl = (s: string | null | undefined): boolean => isXImageUrl(s) || isYtmCoverUrl(s);

const SIZE = /^(thumb|small|medium|large|orig|\d{2,4}x\d{2,4})$/;
const FORMAT = /^(jpg|png|webp|gif)$/;

/**
 * Turns any pasted X image link into the canonical form, or null when it is not an X image.
 *   https://pbs.twimg.com/media/ID?format=jpg&name=large   (as copied from "Copy image address")
 *   https://pbs.twimg.com/media/ID.jpg:large               (legacy)
 *   https://pbs.twimg.com/media/ID.jpg
 * → https://pbs.twimg.com/media/ID?format=jpg&name=large
 */
export function normalizeXImageUrl(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || u.hostname !== "pbs.twimg.com" || u.username || u.password || u.port) return null;
  const m = new RegExp(`^/(${KINDS})/(.+)$`).exec(u.pathname);
  if (!m) return null;
  const kind = m[1];
  let rest = m[2];
  let nameFromSuffix: string | null = null;
  rest = rest.replace(/:([a-z0-9]+)$/i, (_, n: string) => ((nameFromSuffix = n.toLowerCase()), ""));

  let out: string;
  if (kind === "media") {
    const ext = /\.(jpe?g|png|webp|gif)$/i.exec(rest);
    let format = u.searchParams.get("format")?.toLowerCase() ?? null;
    if (ext) {
      rest = rest.slice(0, -ext[0].length);
      format ??= ext[1].toLowerCase().replace("jpeg", "jpg");
    }
    format = format && FORMAT.test(format) ? format : "jpg";
    const asked = (u.searchParams.get("name") ?? nameFromSuffix ?? "large").toLowerCase();
    out = `https://pbs.twimg.com/media/${rest}?format=${format}&name=${SIZE.test(asked) ? asked : "large"}`;
  } else {
    out = `https://pbs.twimg.com/${kind}/${rest}`;
  }
  return X_IMAGE_RE.test(out) ? out : null;
}

/** Same image at another X size (small ≈ 680px, medium ≈ 1200px, large ≈ 2048px). Other URLs are returned unchanged. */
export const xImageSize = (url: string, size: "small" | "medium" | "large"): string =>
  isXImageUrl(url) && url.includes("/media/") ? url.replace(/([?&])name=[^&]*/, `$1name=${size}`) : url;

/** mime_type to store for an X image. */
export function xImageMime(url: string): string {
  const f = /[?&]format=(\w+)/.exec(url)?.[1] ?? /\.(jpg|png|webp|gif)$/.exec(url)?.[1] ?? "jpg";
  return f === "png" ? "image/png" : f === "webp" ? "image/webp" : f === "gif" ? "image/gif" : "image/jpeg";
}

/** CSS background for a tile: the cover photo (centre-cropped) when there is one, else the gradient placeholder. */
export const coverBg = (cover: string | null | undefined, grad: string): string =>
  cover ? `center / cover no-repeat url("${cover}")` : grad;
