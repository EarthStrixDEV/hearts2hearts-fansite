import "server-only";
import { Files } from "files-sdk";
import { neon } from "files-sdk/neon";

export const BUCKET = "assets";

export const hasStorage = () => Boolean(process.env.AWS_ENDPOINT_URL_S3 && process.env.AWS_ACCESS_KEY_ID);

let files: Files | undefined;
/** Neon Object Storage (S3-compatible). Bucket `assets` is private: serve via `signedUrl`. */
export const storage = () => (files ??= new Files({ adapter: neon({ bucket: BUCKET }) }));

/** `media.path` is the object key. */
export const signedUrl = (key: string, expiresIn = 3600) => storage().url(key, { expiresIn });
