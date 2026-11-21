"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavLinkItem { key: string; label: string; href: string; icon: string; count?: number }

export function NavLinks({ items }: { items: NavLinkItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="a-navlist" aria-label="Admin sections">
      {items.map((n) => {
        const on = n.href === "/admin" ? pathname === "/admin" : pathname === n.href || pathname.startsWith(n.href + "/");
        return (
          <Link key={n.key} href={n.href} className={on ? "a-sl on" : "a-sl"} aria-current={on ? "page" : undefined}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={n.icon} />
            </svg>
            {n.label}
            {n.count ? <span className="a-badge b-acc" style={{ marginLeft: "auto" }}>{n.count}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
