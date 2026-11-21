"use client";

import { useEffect, useState } from "react";

export function ToastHost() {
  const [toast, setToast] = useState<{ id: number; message: string; ok: boolean } | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let n = 0;
    const on = (e: Event) => {
      const { message, ok } = (e as CustomEvent<{ message: string; ok: boolean }>).detail;
      setToast({ id: ++n, message, ok });
      clearTimeout(timer);
      timer = setTimeout(() => setToast(null), 3000);
    };
    window.addEventListener("admin-toast", on);
    return () => {
      window.removeEventListener("admin-toast", on);
      clearTimeout(timer);
    };
  }, []);

  if (!toast) return null;
  return (
    <div key={toast.id} role="status" aria-live="polite" className={toast.ok ? "a-toast" : "a-toast bad"}>
      {toast.message}
    </div>
  );
}
