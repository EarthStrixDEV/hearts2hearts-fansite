"use client";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="a-card a-pad a-stack" role="alert" style={{ maxWidth: 560 }}>
      <h1 className="a-h2">This page hit an error</h1>
      <p className="a-sub" style={{ lineHeight: 1.5 }}>{error.message || "Something went wrong while loading this page."}</p>
      <div>
        <button type="button" className="a-btn a-btn-p" onClick={reset}>Try again</button>
      </div>
    </section>
  );
}
