"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Moves its children by `factor × scrollY` (capped at 800px). Writes the transform directly, no re-renders. Off under reduced motion. */
export function Parallax({ factor, className, children }: { factor: number; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const update = () => { raf = 0; el.style.transform = `translateY(${(Math.min(window.scrollY, 800) * factor).toFixed(1)}px)`; };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [factor]);
  return <div ref={ref} className={className}>{children}</div>;
}
