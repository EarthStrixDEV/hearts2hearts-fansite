"use client";

import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";

export interface FanUser { id: string; name: string }

/** Guest: prompt to sign in (/auth/sign-in). Signed in: who you are + sign out. Hidden when no database is configured. */
export function LoginGate({ user, online, onSignedOut }: { user: FanUser | null; online: boolean; onSignedOut: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  if (!online) return null;

  const signOut = async () => {
    setBusy(true);
    setError(false);
    try {
      await authClient.signOut();
      onSignedOut();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  if (user) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3 rounded-tile bg-surface px-4 py-3 text-sm">
          <span className="min-w-0 truncate">
            Signed in as <strong>{user.name}</strong>
          </span>
          <button type="button" className="btn btn-s min-h-9 px-3.5 text-[13px]" onClick={signOut} disabled={busy} aria-busy={busy || undefined}>
            Sign out
          </button>
        </div>
        {error && <span role="alert" className="text-[13px] text-pink-700">Could not sign out. Try again in a moment.</span>}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2.5 rounded-tile bg-surface px-4 py-3.5">
      <span className="text-sm leading-normal text-ink-500">Sign in to post your score to the online leaderboard. Playing is free without an account.</span>
      <Link href="/auth/sign-in?next=/game" className="btn btn-p min-h-11 text-[15px]">
        Sign in
      </Link>
    </div>
  );
}
