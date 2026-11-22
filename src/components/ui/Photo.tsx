import type { CSSProperties } from "react";

/**
 * Cover-fit photo that fills its (positioned) parent. Plain <img> on purpose: remote X CDN images are not run
 * through next/image (no optimizer quota, no remotePatterns). No referrer is sent to the image host.
 */
export function Photo({ src, alt = "", style }: { src: string; alt?: string; style?: CSSProperties }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      draggable={false}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block", ...style }}
    />
  );
}
