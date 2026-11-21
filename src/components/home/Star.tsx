import type { CSSProperties } from "react";

/** Four-point sparkle used across the home page (hero chip, floaters, photocards, blog AI badge). */
export function Star({ size = 12, fill = "currentColor", className, style }: { size?: number; fill?: string; className?: string; style?: CSSProperties }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={style}>
      <path d="M12 2l1.8 8.2L22 12l-8.2 1.8L12 22l-1.8-8.2L2 12l8.2-1.8z" fill={fill} />
    </svg>
  );
}
