import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  variant?: "primary" | "secondary";
  href?: string;
  loading?: boolean;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

/** Pill button (Kit "Buttons"). Renders <Link> when `href` is set, else <button>. */
export function Button({ variant = "primary", href, loading, className, children, ...rest }: Props) {
  const cls = cn("btn", variant === "primary" ? "btn-p" : "btn-s", className);
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} aria-busy={loading || undefined} disabled={rest.disabled || loading} {...rest}>
      {loading && (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
        />
      )}
      {children}
    </button>
  );
}
