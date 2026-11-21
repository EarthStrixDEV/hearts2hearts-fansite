"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV } from "@/lib/nav";
import { HeartIcon } from "@/components/ui/HeartIcon";
import { IconButton } from "@/components/ui/IconButton";

const isOn = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

export function Navbar({ siteName }: { siteName: string }) {
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    try {
      const d = localStorage.getItem("h2h-dark") === "1";
      setDark(d);
      document.documentElement.classList.toggle("dark", d);
    } catch {}
  }, []);
  useEffect(() => setMenu(false), [path]);

  const toggleDark = () => {
    const d = !dark;
    setDark(d);
    document.documentElement.classList.toggle("dark", d);
    try {
      localStorage.setItem("h2h-dark", d ? "1" : "0");
    } catch {}
  };

  const [a, b] = siteName.split("·");

  return (
    <>
      <header className="glass sticky top-0 z-50 flex h-16 items-center border-x-0 border-t-0">
        <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between gap-3 px-6">
          <Link href="/" className="fx flex min-h-11 items-center gap-2.5 rounded-xl text-ink-900 no-underline">
            <HeartIcon size={30} />
            <span className="disp text-xl font-semibold">
              {a}
              {b !== undefined && <span className="text-pink-700">·</span>}
              {b}
            </span>
          </Link>
          <nav className="nav-links items-center" aria-label="Main">
            {NAV.map((n) => {
              const on = isOn(path, n.href);
              return (
                <Link key={n.key} href={n.href} className={`nl${on ? " on" : ""}`} aria-current={on ? "page" : undefined}>
                  {n.label}
                  {on && (
                    <span className="absolute bottom-[3px] left-1/2 -ml-1">
                      <HeartIcon size={8} />
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <IconButton label={dark ? "Switch to light mode" : "Switch to dark mode"} onClick={toggleDark}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
              </svg>
            </IconButton>
            <IconButton label="Open menu" className="nav-burger" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h10" />
              </svg>
            </IconButton>
          </div>
        </div>
      </header>
      {menu && (
        <nav aria-label="Mobile" className="glass fixed inset-x-0 top-16 z-40 flex flex-col gap-1 p-4">
          {NAV.map((n, i) => (
            <Link key={n.key} href={n.href} className="sheet-link nl text-lg" style={{ animationDelay: `${i * 40}ms` }}>
              {n.label}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
