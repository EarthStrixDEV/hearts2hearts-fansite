import "server-only";
import { ImageResponse } from "next/og";
import { bigFontSize, type WrappedSlide } from "./wrapped";

// One story slide as a 1080x1920 PNG (the artboard's 360x640 card at 3x). Used by the build-wrapped cron (stored in the bucket)
// and by the image route as a fallback when a stored copy is missing. Satori only does flexbox, so every box is `display: flex`.
// Font: next/og's bundled Geist (Fredoka / Plex KR would need a font file this repo does not ship).

export const SLIDE_W = 1080;
export const SLIDE_H = 1920;
const K = 3;

export async function renderSlidePng(slide: WrappedSlide, index: number, total: number, nickname: string): Promise<Uint8Array> {
  const bars = Array.from({ length: total }, (_, k) => k);
  const res = new ImageResponse(
    (
      <div
        style={{
          width: SLIDE_W, height: SLIDE_H, display: "flex", flexDirection: "column", justifyContent: "space-between",
          padding: 28 * K, background: slide.bg, color: slide.ink, fontFamily: "Geist, sans-serif",
        }}
      >
        <div style={{ display: "flex", gap: 4 * K }}>
          {bars.map((k) => (
            <div key={k} style={{ flex: 1, height: 4 * K, borderRadius: 999, background: k <= index ? "rgba(255,255,255,.95)" : "rgba(255,255,255,.4)" }} />
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 * K }}>
          <div style={{ display: "flex", fontSize: 11 * K, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.8 }}>{slide.kicker}</div>
          <div style={{ display: "flex", fontSize: bigFontSize(slide.big) * K, fontWeight: 700, lineHeight: 0.95, letterSpacing: "-0.03em" }}>{slide.big}</div>
          <div style={{ display: "flex", fontSize: 26 * K, fontWeight: 600, lineHeight: 1.15 }}>{slide.line}</div>
          <div style={{ display: "flex", fontSize: 15 * K, lineHeight: 1.6, opacity: 0.85 }}>{slide.sub}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 22 * K }}>{`S2U · ${nickname}`}</div>
          <div style={{ display: "flex", fontSize: 14 * K, fontWeight: 600 }}>H2H·S2U</div>
        </div>
      </div>
    ),
    { width: SLIDE_W, height: SLIDE_H },
  );
  return new Uint8Array(await res.arrayBuffer());
}
