"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { activeNav } from "@/lib/admin/nav";

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "AD";

export function AdminHeader({ name, role }: { name: string; role: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const section = activeNav(pathname);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    try {
      const on = localStorage.getItem("admin-theme") === "dark";
      setDark(on);
      document.getElementById("ad-root")?.classList.toggle("dark", on);
    } catch { /* storage blocked: stay light */ }
  }, []);

  const toggle = () => {
    const on = !dark;
    setDark(on);
    document.getElementById("ad-root")?.classList.toggle("dark", on);
    try { localStorage.setItem("admin-theme", on ? "dark" : "light"); } catch { /* ignore */ }
  };

  return (
    <header className="a-head">
      <nav aria-label="Breadcrumb" className="a-crumb">
        Admin / Hearts2Hearts / <b>{section?.label ?? "Admin"}</b>
      </nav>
      <form
        role="search"
        className="a-top-search"
        onSubmit={(e) => {
          e.preventDefault();
          const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
          const base = section && section.key !== "dash" && section.key !== "settings" ? section.href : "/admin/members";
          router.push(q ? `${base}?q=${encodeURIComponent(q)}` : base);
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
        <label className="a-vh" htmlFor="a-top-q">Search content</label>
        <input id="a-top-q" name="q" type="search" className="a-inp" placeholder="Search content" />
      </form>
      <button type="button" className="a-ibtn" onClick={toggle} aria-label="Toggle dark mode" aria-pressed={dark}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>
      </button>
      <Link href="/auth/sign-out" className="a-btn a-btn-sm">Sign out</Link>
      <span role="img" aria-label={`Signed in as ${name} (${role})`} title={`${name} · ${role}`} className="a-avatar">{initials(name)}</span>
    </header>
  );
}
