// Client-safe capsule constants and input schema (no database imports: the form and the server action share them).
import { z } from "zod";

export const MAX_BODY = 1000;
export const GROUP_NAME = "Hearts2Hearts";

/** Paper colors from the Capsule artboard. The ink on top is always dark, in light and dark mode alike. */
export const PAPERS = [
  { id: "sky", name: "Sky", color: "#DDF0FF" },
  { id: "blush", name: "Blush", color: "#FFE3F1" },
  { id: "lilac", name: "Lilac", color: "#EFE8FF" },
  { id: "lemon", name: "Lemon", color: "#FFF6C9" },
] as const;
export type PaperId = (typeof PAPERS)[number]["id"];

export const paperColor = (id: string): string => PAPERS.find((p) => p.id === id)?.color ?? PAPERS[0].color;

export const EMPTY_ERROR = "Write a few words before sealing.";

/** Input of a new letter. The open date is never part of it: the server computes it. */
export const SealInput = z.object({
  toKind: z.enum(["group", "self"]),
  paper: z.enum(["sky", "blush", "lilac", "lemon"]),
  body: z
    .string()
    .max(MAX_BODY, `Keep it to ${MAX_BODY.toLocaleString("en-US")} characters.`)
    .refine((s) => s.trim().length > 0, EMPTY_ERROR),
  fanbookOptIn: z.boolean(),
});
export type SealInput = z.infer<typeof SealInput>;
