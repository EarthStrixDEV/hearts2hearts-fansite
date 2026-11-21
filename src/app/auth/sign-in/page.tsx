import Link from "next/link";
import { AuthForm } from "../AuthForm";
import { safeNext } from "../next";

export const metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const next = safeNext((await searchParams).next, "/admin");
  return (
    <section className="panel au-card" aria-labelledby="t">
      <Link href="/" className="au-brand disp">H2H·S2U</Link>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <h1 id="t" className="au-title disp">Welcome back</h1>
        <p className="au-sub">Sign in to post scores to the leaderboard, or to manage the site if you&apos;re on the team.</p>
      </div>
      <AuthForm mode="sign-in" next={next} />
    </section>
  );
}
