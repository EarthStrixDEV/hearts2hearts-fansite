// Minimal LLM client over fetch (no SDK). Anthropic Messages API.
// Env: LLM_API_KEY (required), LLM_MODEL (optional, overrides DEFAULT_MODEL).

export const DEFAULT_MODEL = "claude-sonnet-5-5";

const ENDPOINT = "https://api.anthropic.com/v1/messages";
const TIMEOUT_MS = 45_000;

/** An image sent with the user turn (vision). `data` is base64 without the data: prefix. */
export interface LLMImage { mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif"; data: string }

export async function callLLM(opts: { system: string; user: string; model: string; maxTokens?: number; images?: LLMImage[] }): Promise<string> {
  const key = process.env.LLM_API_KEY;
  if (!key) throw new Error("LLM_API_KEY is not set");

  // Text-only calls keep the plain string content; images turn it into blocks (images first, then the text).
  const content = opts.images?.length
    ? [
        ...opts.images.map((i) => ({ type: "image", source: { type: "base64", media_type: i.mediaType, data: i.data } })),
        { type: "text", text: opts.user },
      ]
    : opts.user;

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 2000,
      system: opts.system,
      messages: [{ role: "user", content }],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    const body = (await res.text().catch(() => "")).slice(0, 300);
    throw new Error(`LLM request failed: HTTP ${res.status} ${body}`);
  }

  const json = (await res.json()) as { content?: { type: string; text?: string }[]; stop_reason?: string };
  const text = (json.content ?? [])
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("");
  if (!text.trim()) throw new Error(`LLM returned no text (stop_reason=${json.stop_reason ?? "unknown"})`);
  return text;
}
