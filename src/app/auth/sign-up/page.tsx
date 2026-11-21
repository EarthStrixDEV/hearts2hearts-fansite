import Link from "next/link";
import { AuthForm } from "../AuthForm";
import { safeNext } from "../next";

export const metadata = { title: "Create account" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const next = safeNext((await searchParams).next, "/game");
  return (
    <section className="panel au-card" aria-labelledby="t">
      <Link href="/" className="au-brand disp">H2H·S2U</Link>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <h1 id="t" className="au-title disp">Join the fan club</h1>
        <p className="au-sub">A free account lets you save your game scores. No spam, and you can leave any time.</p>
      </div>
      <AuthForm mode="sign-up" next={next} />
    </section>
  );
}
