"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";

export default function SignOutPage() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    authClient.signOut().then(({ error }) => {
      if (cancelled) return;
      if (error) setFailed(true);
      else {
        router.replace("/");
        router.refresh();
      }
    }).catch(() => !cancelled && setFailed(true));
    return () => { cancelled = true; };
  }, [router]);

  return (
    <section className="panel au-card" aria-live="polite">
      <h1 className="au-title disp">{failed ? "Couldn’t sign you out" : "Signing you out…"}</h1>
      {failed && (
        <p className="au-sub">Something went wrong. <Link href="/auth/sign-out">Try again</Link> or <Link href="/">go back to the site</Link>.</p>
      )}
    </section>
  );
}
