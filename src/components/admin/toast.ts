"use client";

/** Fire a toast from any client component. <ToastHost> (mounted in the admin shell) renders it. */
export function adminToast(message: string, ok = true) {
  window.dispatchEvent(new CustomEvent("admin-toast", { detail: { message, ok } }));
}
