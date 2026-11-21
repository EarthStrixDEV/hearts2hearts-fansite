const PATH =
  "M12 21s-7.5-4.6-10-9.3C.3 8.4 2.2 4 6.2 4c2.3 0 3.9 1.3 5.8 3.4C13.9 5.3 15.5 4 17.8 4c4 0 5.9 4.4 4.2 7.7C19.5 16.4 12 21 12 21z";

/** Brand heart used by the logo, bullets, loaders. Decorative unless `label` is set. */
export function HeartIcon({ size = 16, fill = "#FF8FB8", label }: { size?: number; fill?: string; label?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      <path d={PATH} fill={fill} />
    </svg>
  );
}
