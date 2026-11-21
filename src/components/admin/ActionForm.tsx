"use client";

import { useActionState, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/admin/types";
import { adminToast } from "./toast";

/**
 * <form> wired to a server action. Shows the result as a toast, follows `redirect` and refreshes the page data.
 * `readOnly` disables every control inside (database not configured).
 */
export function ActionForm({
  action, children, className, readOnly, confirm,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
  readOnly?: boolean;
  confirm?: string;
}) {
  const [state, formAction] = useActionState(action, null as ActionState);
  const router = useRouter();

  useEffect(() => {
    if (!state) return;
    adminToast(state.message, state.ok);
    if (state.ok) {
      if (state.redirect) router.replace(state.redirect);
      router.refresh();
    }
  }, [state, router]);

  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      <fieldset disabled={readOnly} style={{ display: "contents" }}>
        {children}
      </fieldset>
    </form>
  );
}

/** Submit button that posts `intent` (draft | publish | archive) and disables itself while the action runs. */
export function SubmitButton({
  children, intent, variant, small, className = "",
}: {
  children: ReactNode;
  intent?: string;
  variant?: "primary" | "danger";
  small?: boolean;
  className?: string;
}) {
  const { pending } = useFormStatus();
  const cls = ["a-btn", variant === "primary" && "a-btn-p", variant === "danger" && "a-btn-d", small && "a-btn-sm", className].filter(Boolean).join(" ");
  return (
    <button type="submit" name={intent ? "intent" : undefined} value={intent} className={cls} disabled={pending} aria-busy={pending || undefined}>
      {children}
    </button>
  );
}
