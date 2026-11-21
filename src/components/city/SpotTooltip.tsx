"use client";

import { Html } from "@react-three/drei";

/** Name bubble floating above a building (design `.bubble`). Rendered inside the R3F Canvas via drei <Html>. */
export function SpotTooltip({ label, position }: { label: string; position: [number, number, number] }) {
  return (
    <Html position={position} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
      <span role="tooltip" className="ct-bubble">
        {label}
      </span>
    </Html>
  );
}
