import Link from "next/link";

export const metadata = { title: "No access" };

export default function AdminDenied() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <section className="a-card a-pad a-stack" style={{ maxWidth: 440 }}>
        <h1 className="a-h2">You don&apos;t have access to this page</h1>
        <p className="a-sub" style={{ lineHeight: 1.5 }}>
          The admin needs an editor or admin role. Settings, users and the activity log are admin only. Ask an admin to change your role if you need it.
        </p>
        <div className="a-cluster">
          <Link href="/" className="a-btn a-btn-p">Back to the site</Link>
          <Link href="/admin" className="a-btn">Admin home</Link>
        </div>
      </section>
    </main>
  );
}
