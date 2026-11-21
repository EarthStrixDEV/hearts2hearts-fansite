import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 44px glass icon button. `label` is mandatory: icon-only buttons need an accessible name. */
export function IconButton({
  label,
  className,
  children,
  ...rest
}: { label: string; children: ReactNode } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label">) {
  return (
    <button aria-label={label} className={cn("ibtn", className)} {...rest}>
      {children}
    </button>
  );
}
