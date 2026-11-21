import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Chip({
  children,
  bg = "#FFE3F1",
  color,
  className,
  style,
}: {
  children: ReactNode;
  bg?: string;
  color?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span className={cn("chip", className)} style={{ background: bg, color, ...style }}>
      {children}
    </span>
  );
}
