import Link from "next/link";
import type { ContentStatus } from "@/lib/db/types";
import type { ActionState } from "@/lib/admin/types";
import { ActionForm, SubmitButton } from "./ActionForm";

/** Save draft / Publish (+ Archive) buttons shared by every form. Each posts `intent` to the module's save action. */
export function SaveBar({ status, isNew, previewHref, publishLabel }: { status?: ContentStatus; isNew?: boolean; previewHref?: string | null; publishLabel?: string }) {
  const live = status === "published";
  return (
    <div className="a-foot">
      <SubmitButton intent="publish" variant="primary">{publishLabel ?? (live ? "Update" : "Publish")}</SubmitButton>
      <SubmitButton intent="draft">{live ? "Unpublish to draft" : "Save draft"}</SubmitButton>
      {!isNew && status !== "archived" && <SubmitButton intent="archive">Archive</SubmitButton>}
      {previewHref ? (
        <Link href={previewHref} target="_blank" className="a-btn" style={{ marginLeft: "auto" }}>Preview on site</Link>
      ) : null}
    </div>
  );
}

export function DeleteForm({ action, id, what, readOnly }: { action: (prev: ActionState, fd: FormData) => Promise<ActionState>; id: string; what: string; readOnly?: boolean }) {
  return (
    <ActionForm action={action} readOnly={readOnly} confirm={`Delete ${what}? This can't be undone.`} className="a-cluster">
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="danger" small>Delete {what.length > 28 ? "" : what}</SubmitButton>
    </ActionForm>
  );
}
