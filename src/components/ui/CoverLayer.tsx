/**
 * Cover image (or gradient placeholder) filling its positioned parent, which must have `overflow: hidden`.
 * Official MV stills (`…/hq720.jpg`) carry a studio watermark in their lower-left corner, so those are drawn 45% taller
 * than the frame and anchored at the top: only the upper part of the still is visible.
 */
export function CoverLayer({ src, grad }: { src?: string | null; grad: string }) {
  const crop = !!src && src.endsWith("/hq720.jpg");
  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        bottom: crop ? "-45%" : 0,
        display: "block",
        background: src ? `center top / cover no-repeat url("${src}")` : grad,
      }}
    />
  );
}
