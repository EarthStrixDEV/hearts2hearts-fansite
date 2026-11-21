/** Result of a server action, consumed by <ActionForm>. `at` makes every result a new object so effects re-fire. */
export type ActionState = { ok: boolean; message: string; redirect?: string; at: number } | null;
