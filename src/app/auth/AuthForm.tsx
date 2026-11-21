"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { authClient } from "@/lib/auth/client";

type Mode = "sign-in" | "sign-up";

function message(mode: Mode, error: { message?: string; code?: string; status?: number }): string {
  const code = (error.code ?? "").toUpperCase();
  if (mode === "sign-in" && (error.status === 401 || code.includes("INVALID"))) return "Email or password is incorrect.";
  if (code.includes("ALREADY") || code.includes("EXISTS")) return "An account with this email already exists. Try signing in.";
  if (code.includes("PASSWORD") && code.includes("SHORT")) return "Password is too short. Use at least 8 characters.";
  return error.message || "Something went wrong. Try again in a moment.";
}

export function AuthForm({ mode, next }: { mode: Mode; next: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const up = mode === "sign-up";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const name = String(fd.get("name") ?? "").trim();
    setBusy(true);
    setError(null);
    try {
      const { error: err } = up
        ? await authClient.signUp.email({ email, password, name: name || email.split("@")[0] })
        : await authClient.signIn.email({ email, password });
      if (err) {
        setError(message(mode, err));
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError("Could not reach the sign-in service. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="au-form" onSubmit={onSubmit} noValidate={false}>
      {up && (
        <label className="au-field">
          <span className="lbl">Name</span>
          <input name="name" className="au-inp" autoComplete="nickname" maxLength={60} placeholder="What should we call you?" />
        </label>
      )}
      <label className="au-field">
        <span className="lbl">Email</span>
        <input name="email" type="email" className="au-inp" autoComplete="email" required />
      </label>
      <label className="au-field">
        <span className="lbl">Password</span>
        <input name="password" type="password" className="au-inp" autoComplete={up ? "new-password" : "current-password"} required minLength={up ? 8 : 1} />
      </label>
      {error && <p role="alert" className="au-err">{error}</p>}
      <Button type="submit" loading={busy}>{up ? "Create account" : "Sign in"}</Button>
      <p className="au-alt">
        {up ? (
          <>Already have an account? <Link href={`/auth/sign-in?next=${encodeURIComponent(next)}`}>Sign in</Link></>
        ) : (
          <>New here? <Link href={`/auth/sign-up?next=${encodeURIComponent(next)}`}>Create an account</Link></>
        )}
      </p>
    </form>
  );
}
