import "server-only";
import { Files } from "files-sdk";
import { neon } from "files-sdk/neon";
import { isRemoteImageUrl } from "@/lib/media-url";

export const BUCKET = "assets";

export const hasStorage = () => Boolean(process.env.AWS_ENDPOINT_URL_S3 && process.env.AWS_ACCESS_KEY_ID);

let files: Files | undefined;
/** Neon Object Storage (S3-compatible). Bucket `assets` is private: serve via `signedUrl`. */
export const storage = () => (files ??= new Files({ adapter: neon({ bucket: BUCKET }) }));

/** `media.path` is the object key, or a hotlinked image URL (X CDN / YouTube Music art), used as is. */
export const signedUrl = async (key: string, expiresIn = 3600): Promise<string> =>
  isRemoteImageUrl(key) ? key : storage().url(key, { expiresIn });

/** Whether `mediaUrl(path)` can produce a URL: X images always can, bucket keys need storage configured. */
export const canResolveMedia = (path: string) => isRemoteImageUrl(path) || hasStorage();
