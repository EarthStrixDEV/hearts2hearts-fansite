import { describe, expect, it } from "vitest";
import { buildSlides, type WrappedData } from "./wrapped";
import { renderSlidePng, SLIDE_H, SLIDE_W } from "./wrapped-image";

const data: WrappedData = {
  v: 1, year: 2026, nickname: "Mina", score: 40, rank: 1, fans: 40, activeDays: 12, logins: 9, missions: 3, liveAttended: 1,
  binder: { have: 17, want: 5, total: 25 }, bias: { id: "m1", name: "Stella", color: "#A8D8FF", have: 4 },
  fandom: { fans: 40, actions: 900 }, images: [],
};

describe("renderSlidePng", () => {
  it("renders every slide as a 1080x1920 PNG", async () => {
    const slides = buildSlides(data);
    for (let i = 0; i < slides.length; i++) {
      const png = await renderSlidePng(slides[i], i, slides.length, data.nickname);
      expect([...png.slice(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const dv = new DataView(png.buffer, png.byteOffset);
      expect([dv.getUint32(16), dv.getUint32(20)], slides[i].id).toEqual([SLIDE_W, SLIDE_H]);
    }
  }, 60_000);
});
