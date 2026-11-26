// Placeholder look of each seeded item, used while `room_items.model_id` has no .glb. Colors come from the MyRoom artboard.
// Boxes and discs sit on the item's base (placement.y); "panel" is a white-bordered plate that faces local +z.

export type Look =
  | { shape: "box"; size: [number, number, number]; color: string }
  | { shape: "disc"; diameter: number; height: number; color: string }
  | { shape: "panel"; size: [number, number]; color: string }
  | { shape: "shelf" }
  | { shape: "lamp" }
  | { shape: "lights" };

export const SKY = "#A8D8FF";
export const SUN = "#FFE08A";
export const BOOKS = ["#FFB6D5", "#C9B6FF", "#FFE08A", "#A8D8FF", "#FF8FB8"];

const LOOKS: Record<string, Look> = {
  "sky-blue-rug": { shape: "disc", diameter: 3.4, height: 0.05, color: SKY },
  "lemon-tang-poster": { shape: "panel", size: [1.2, 1.7], color: SUN },
  "bias-card-frame": { shape: "panel", size: [0.95, 1.25], color: SKY },
  "fairy-lights": { shape: "lights" },
  "album-shelf": { shape: "shelf" },
  "lightstick-lamp": { shape: "lamp" },
  "i-was-here-badge": { shape: "disc", diameter: 0.9, height: 0.06, color: "#B07CF0" },
};

/** A neutral box for any item the design does not know. */
export const lookFor = (slug: string): Look => LOOKS[slug] ?? { shape: "box", size: [0.8, 0.8, 0.8], color: "#F9A8D4" };
