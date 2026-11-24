"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { CityHouse, CitySpotView } from "@/lib/db/seed/city";

/** Materials shared by every building; glow-driven ones are updated in place when day/night changes. */
export interface CityMats {
  glass: THREE.MeshStandardMaterial;
  door: THREE.MeshStandardMaterial;
  bulb: THREE.MeshStandardMaterial;
  ink: THREE.MeshStandardMaterial;
  white: THREE.MeshStandardMaterial;
  pink: THREE.MeshStandardMaterial;
  gold: THREE.MeshStandardMaterial;
}

export function useCityMats(glow: number, glowColor: string, ink: string): CityMats {
  const mats = useMemo<CityMats>(() => {
    const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ roughness: 0.8, ...p });
    return {
      glass: std({ color: "#CFEAFF", roughness: 0.18, metalness: 0.1, emissive: glowColor }),
      door: std({ color: "#FFF8F3", emissive: glowColor }),
      bulb: std({ color: "#FFFDF5", emissive: glowColor }),
      ink: std({ color: ink, roughness: 0.45 }),
      white: std({ color: "#FFFFFF" }),
      pink: std({ color: "#FF8FB8" }),
      gold: std({ color: "#FFD25E", roughness: 0.4, metalness: 0.2 }),
    };
  }, [glowColor, ink]);
  useLayoutEffect(() => {
    mats.glass.emissiveIntensity = glow;
    mats.glass.color.set(glow > 0 ? "#6B5A9E" : "#CFEAFF");
    mats.door.emissiveIntensity = glow * 0.8;
    mats.bulb.emissiveIntensity = glow > 0 ? glow * 2.2 : 0;
  }, [mats, glow]);
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  return mats;
}

function useStd(color: string, flatShading = false, roughness = 0.82) {
  const m = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness, flatShading }), [color, flatShading, roughness]);
  useEffect(() => () => m.dispose(), [m]);
  return m;
}

const HALF_PI = Math.PI / 2;
const ROOF_T = 0.16; // roof cap thickness

/** Body + overhanging roof cap shared by the larger buildings. Origin = lot centre on the ground. */
function Shell({ w, d, h, colors }: { w: number; d: number; h: number; colors: [string, string, string] }) {
  const body = useStd(colors[1]);
  const roof = useStd(colors[0]);
  return (
    <>
      <RoundedBox args={[w, h, d]} radius={0.12} smoothness={3} position={[0, h / 2, 0]} material={body} castShadow receiveShadow />
      <RoundedBox args={[w + 0.18, ROOF_T, d + 0.18]} radius={0.06} smoothness={2} position={[0, h + ROOF_T / 2 - 0.02, 0]} material={roof} castShadow receiveShadow />
    </>
  );
}

/** Door on the +z face (the design's door side). */
function Door({ x = 0, d, w, h, mats, trim }: { x?: number; d: number; w: number; h: number; mats: CityMats; trim: string }) {
  const lintel = useStd(trim);
  return (
    <group position={[x, 0, d / 2]}>
      <mesh position={[0, h / 2, 0.012]} material={mats.door}><planeGeometry args={[w, h]} /></mesh>
      <mesh position={[0, h + 0.04, 0.03]} material={lintel}><boxGeometry args={[w + 0.12, 0.06, 0.06]} /></mesh>
    </group>
  );
}

/** Row(s) of window panes on the +x face. */
function XWindows({ w, d, y0, rows, cols, pw, ph, gapY, mats }: { w: number; d: number; y0: number; rows: number; cols: number; pw: number; ph: number; gapY: number; mats: CityMats }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    let i = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const z = cols === 1 ? 0 : -d * 0.32 + (c * d * 0.64) / (cols - 1);
      o.position.set(w / 2 + 0.012, y0 + r * gapY, z);
      o.rotation.set(0, HALF_PI, 0);
      o.updateMatrix();
      m.setMatrixAt(i++, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [w, d, y0, rows, cols, gapY]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, rows * cols]} material={mats.glass}>
      <planeGeometry args={[pw, ph]} />
    </instancedMesh>
  );
}

interface BProps { spot: CitySpotView; mats: CityMats; reduced: boolean }

function MusicStore({ spot, mats, reduced }: BProps) {
  const { w, d } = spot.lot, h = spot.h;
  const disc = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (!reduced && disc.current) disc.current.rotation.z -= dt * 0.9; });
  const top = h + ROOF_T;
  return (
    <>
      <Shell w={w} d={d} h={h} colors={spot.colors} />
      {/* shop window + pink canopy on the +x face */}
      <mesh position={[w / 2 + 0.012, h * 0.36, 0]} rotation={[0, HALF_PI, 0]} material={mats.glass}><planeGeometry args={[d * 0.64, h * 0.3]} /></mesh>
      <mesh position={[w / 2 + 0.1, h * 0.36 + h * 0.15 + 0.08, 0]} rotation={[0, 0, -0.35]} material={mats.pink} castShadow><boxGeometry args={[0.26, 0.05, d * 0.74]} /></mesh>
      <Door d={d} w={w * 0.22} h={Math.min(0.8, h * 0.36)} mats={mats} trim={spot.colors[2]} />
      <XWindows w={w} d={d} y0={h * 0.74} rows={1} cols={2} pw={0.32} ph={0.28} gapY={0} mats={mats} />
      {/* vinyl record sign facing the camera */}
      <group position={[0, top + 0.6, 0]} rotation={[0, Math.PI / 4, 0]}>
        <mesh position={[0, -0.36, 0]} material={mats.ink}><cylinderGeometry args={[0.035, 0.035, 0.5, 8]} /></mesh>
        <group ref={disc}>
          <mesh rotation={[HALF_PI, 0, 0]} material={mats.ink}><cylinderGeometry args={[0.5, 0.5, 0.05, 48]} /></mesh>
          <mesh position={[0, 0, 0.03]} material={mats.pink}><circleGeometry args={[0.19, 32]} /></mesh>
          <mesh position={[0.08, 0.05, 0.032]} material={mats.white}><circleGeometry args={[0.035, 16]} /></mesh>
          <mesh position={[0, 0, 0.028]}><ringGeometry args={[0.3, 0.315, 48]} /><meshStandardMaterial color="#5F5878" roughness={0.4} /></mesh>
        </group>
      </group>
    </>
  );
}

function ConcertHall({ spot, mats }: BProps) {
  const { w, d } = spot.lot, h = spot.h;
  const domeMat = useStd(spot.colors[0]);
  const colMat = useStd("#FFFFFF");
  const r = Math.min(w, d) * 0.34;
  const top = h + ROOF_T;
  const colH = h * 0.62;
  const bulbs = useRef<THREE.InstancedMesh>(null);
  const N_BULBS = 11;
  useLayoutEffect(() => {
    const m = bulbs.current;
    if (!m) return;
    const o = new THREE.Object3D();
    for (let i = 0; i < N_BULBS; i++) {
      o.position.set(-w * 0.41 + (i * w * 0.82) / (N_BULBS - 1), colH + 0.07, d / 2 + 0.47);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [w, d, colH]);
  return (
    <>
      <Shell w={w} d={d} h={h} colors={spot.colors} />
      {/* dome + golden star spire */}
      <mesh position={[0, top - 0.02, 0]} material={domeMat} castShadow><sphereGeometry args={[r, 40, 20, 0, Math.PI * 2, 0, HALF_PI]} /></mesh>
      <mesh position={[0, top + r + 0.12, 0]} material={mats.gold} castShadow><coneGeometry args={[0.07, 0.3, 12]} /></mesh>
      <mesh position={[0, top + r + 0.32, 0]} material={mats.gold}><octahedronGeometry args={[0.1]} /></mesh>
      {/* portico on the +z face */}
      <mesh position={[0, 0.03, d / 2 + 0.25]} material={colMat} receiveShadow><boxGeometry args={[w * 0.86, 0.06, 0.52]} /></mesh>
      {[-0.36, -0.12, 0.12, 0.36].map((f) => (
        <mesh key={f} position={[w * f, colH / 2 + 0.06, d / 2 + 0.36]} material={colMat} castShadow><cylinderGeometry args={[0.07, 0.08, colH, 14]} /></mesh>
      ))}
      <mesh position={[0, colH + 0.07, d / 2 + 0.22]} material={domeMat} castShadow><boxGeometry args={[w * 0.86, 0.14, 0.48]} /></mesh>
      <instancedMesh ref={bulbs} args={[undefined, undefined, N_BULBS]} material={mats.bulb}><sphereGeometry args={[0.035, 8, 6]} /></instancedMesh>
      <Door d={d} w={w * 0.18} h={Math.min(0.85, colH * 0.6)} mats={mats} trim={spot.colors[2]} />
      <XWindows w={w} d={d} y0={h * 0.55} rows={1} cols={3} pw={0.3} ph={h * 0.42} gapY={0} mats={mats} />
    </>
  );
}

function School({ spot, mats, reduced }: BProps) {
  const { w, d } = spot.lot, h = spot.h;
  const towerMat = useStd("#FFF6EE");
  const roofMat = useStd("#FF9EC3", true);
  const flag = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => { if (flag.current) flag.current.rotation.y = reduced ? 0 : Math.sin(clock.elapsedTime * 2.4) * 0.25; });
  const top = h + ROOF_T;
  const tw = 0.64, th = 0.72;
  return (
    <>
      <Shell w={w} d={d} h={h} colors={spot.colors} />
      {/* clock tower */}
      <RoundedBox args={[tw, th, tw]} radius={0.05} smoothness={2} position={[0, top + th / 2 - 0.02, 0]} material={towerMat} castShadow />
      <mesh position={[0, top + th + 0.2, 0]} rotation={[0, Math.PI / 4, 0]} material={roofMat} castShadow><coneGeometry args={[tw * 0.78, 0.46, 4]} /></mesh>
      <group position={[0, top + th * 0.55, tw / 2 + 0.012]}>
        <mesh material={mats.white}><circleGeometry args={[0.2, 32]} /></mesh>
        <mesh position={[0, 0, -0.002]} material={mats.ink}><circleGeometry args={[0.235, 32]} /></mesh>
        <mesh position={[0, 0.06, 0.005]} material={mats.ink}><planeGeometry args={[0.025, 0.13]} /></mesh>
        <mesh position={[0.045, 0, 0.005]} rotation={[0, 0, HALF_PI]} material={mats.ink}><planeGeometry args={[0.025, 0.1]} /></mesh>
      </group>
      {/* flag on the back corner */}
      <group position={[-w / 2 + 0.22, top, -d / 2 + 0.22]}>
        <mesh position={[0, 0.55, 0]} material={mats.ink}><cylinderGeometry args={[0.025, 0.025, 1.1, 8]} /></mesh>
        <mesh ref={flag} position={[0, 0.96, 0]}>
          <planeGeometry args={[0.44, 0.26]} />
          <meshStandardMaterial color="#FF8FB8" side={THREE.DoubleSide} roughness={0.9} />
        </mesh>
      </group>
      <Door d={d} w={w * 0.24} h={Math.min(0.8, h * 0.34)} mats={mats} trim={spot.colors[2]} />
      <XWindows w={w} d={d} y0={h * 0.32} rows={2} cols={3} pw={0.34} ph={0.36} gapY={h * 0.36} mats={mats} />
    </>
  );
}

function Cafe({ spot, mats }: BProps) {
  const { w, d } = spot.lot, h = spot.h;
  const stripes = useRef<THREE.InstancedMesh>(null);
  const N = 7;
  const sw = (w * 0.86) / N;
  const awnY = h * 0.66;
  useLayoutEffect(() => {
    const m = stripes.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      o.position.set(-w * 0.43 + sw / 2 + i * sw, awnY, d / 2 + 0.22);
      o.rotation.set(0.5, 0, 0);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, c.set(i % 2 ? "#FFFFFF" : "#FF8FB8"));
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [w, d, sw, awnY]);
  const top = h + ROOF_T;
  return (
    <>
      <Shell w={w} d={d} h={h} colors={spot.colors} />
      <instancedMesh ref={stripes} args={[undefined, undefined, N]} castShadow>
        <boxGeometry args={[sw * 1.002, 0.035, 0.5]} />
        <meshStandardMaterial roughness={0.85} />
      </instancedMesh>
      <mesh position={[w * 0.16, h * 0.33, d / 2 + 0.012]} material={mats.glass}><planeGeometry args={[w * 0.42, h * 0.34]} /></mesh>
      <Door x={-w * 0.25} d={d} w={w * 0.2} h={Math.min(0.75, h * 0.5)} mats={mats} trim={spot.colors[2]} />
      <XWindows w={w} d={d} y0={h * 0.48} rows={1} cols={2} pw={0.4} ph={0.4} gapY={0} mats={mats} />
      {/* coffee cup sign */}
      <group position={[0, top - 0.02, 0]}>
        <mesh position={[0, 0.22, 0]} material={mats.white} castShadow><cylinderGeometry args={[0.32, 0.24, 0.44, 32]} /></mesh>
        <mesh position={[0, 0.441, 0]} rotation={[-HALF_PI, 0, 0]}><circleGeometry args={[0.29, 32]} /><meshStandardMaterial color="#8A5C3C" roughness={0.6} /></mesh>
        <mesh position={[0, 0.446, 0]} rotation={[-HALF_PI, 0, 0]} material={mats.white}><circleGeometry args={[0.08, 16]} /></mesh>
        <mesh position={[0.3, 0.24, 0]} material={mats.white}><torusGeometry args={[0.11, 0.035, 8, 20]} /></mesh>
      </group>
    </>
  );
}

function Generic({ spot, mats }: BProps) {
  const { w, d } = spot.lot, h = spot.h;
  return (
    <>
      <Shell w={w} d={d} h={h} colors={spot.colors} />
      <Door d={d} w={w * 0.22} h={Math.min(0.75, h * 0.4)} mats={mats} trim={spot.colors[2]} />
      <XWindows w={w} d={d} y0={h * 0.6} rows={1} cols={2} pw={0.32} ph={0.32} gapY={0} mats={mats} />
    </>
  );
}

/* ---------- Member houses: one instanced row per part, roof tinted with each member's colour ---------- */

const HOUSE = 0.72;

/** House centres relative to the lot centre (two rows) and their wall heights. */
export function houseLayout(spot: CitySpotView, n: number): { x: number; z: number; h: number }[] {
  const { w, d } = spot.lot;
  const rows = n > 4 ? 2 : 1;
  const cols = Math.ceil(n / rows);
  return Array.from({ length: n }, (_, i) => {
    const r = Math.floor(i / cols), c = i % cols;
    const x = cols === 1 ? 0 : -w / 2 + HOUSE / 2 + (c * (w - HOUSE)) / (cols - 1);
    const z = rows === 1 ? 0 : -d / 2 + HOUSE / 2 + (r * (d - HOUSE)) / (rows - 1);
    return { x, z, h: 0.58 + ((i * 7) % 4) * 0.07 };
  });
}

const prism = (() => {
  // triangular prism, ridge along z, base on y=0 spanning x in [-sqrt3/2, sqrt3/2], apex at y=1.5
  const g = new THREE.CylinderGeometry(1, 1, 1, 3);
  g.rotateX(-HALF_PI);
  g.translate(0, 0.5, 0);
  return g;
})();

export function MemberHouses({ spot, houses, mats, onHouse }: BProps & { houses: CityHouse[]; onHouse: (i: number) => void }) {
  const walls = useRef<THREE.InstancedMesh>(null);
  const roofs = useRef<THREE.InstancedMesh>(null);
  const doors = useRef<THREE.InstancedMesh>(null);
  const wins = useRef<THREE.InstancedMesh>(null);
  const chim = useRef<THREE.InstancedMesh>(null);
  const n = houses.length;
  const layout = useMemo(() => houseLayout(spot, n), [spot, n]);
  const wallMat = useStd(spot.colors[1]);
  const roofMat = useStd("#FFFFFF", true, 0.7);

  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    const set = (m: THREE.InstancedMesh | null, i: number) => { if (m) { o.updateMatrix(); m.setMatrixAt(i, o.matrix); } };
    layout.forEach((p, i) => {
      o.rotation.set(0, 0, 0);
      o.position.set(p.x, p.h / 2, p.z); o.scale.set(HOUSE, p.h, HOUSE); set(walls.current, i);
      o.position.set(p.x, p.h - 0.01, p.z); o.scale.set((HOUSE + 0.14) / Math.sqrt(3), 0.42 / 1.5, HOUSE + 0.12); set(roofs.current, i);
      roofs.current?.setColorAt(i, c.set(houses[i].color));
      o.scale.set(1, 1, 1);
      o.position.set(p.x, 0.16, p.z + HOUSE / 2 + 0.01); set(doors.current, i);
      o.position.set(p.x + HOUSE / 2 + 0.01, p.h * 0.58, p.z); o.rotation.set(0, HALF_PI, 0); set(wins.current, i);
      o.rotation.set(0, 0, 0);
      o.position.set(p.x - HOUSE * 0.22, p.h + 0.26, p.z - HOUSE * 0.18); set(chim.current, i);
    });
    for (const m of [walls.current, roofs.current, doors.current, wins.current, chim.current]) {
      if (!m) continue;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      m.computeBoundingSphere();
    }
  }, [layout, houses]);

  if (n === 0) return null;
  // No stopPropagation (the parent SpotGroup raises the spot hover from this move) and no pointer-out reset here:
  // the row lifts on hover, so the cursor may land on a door or chimney of the same house. World clears it on spot leave.
  const pick = (e: ThreeEvent<PointerEvent>) => { if (e.instanceId !== undefined) onHouse(e.instanceId); };
  return (
    <>
      <instancedMesh ref={walls} args={[undefined, undefined, n]} material={wallMat} castShadow receiveShadow onPointerMove={pick}>
        <boxGeometry />
      </instancedMesh>
      <instancedMesh ref={roofs} args={[prism, roofMat, n]} castShadow onPointerMove={pick} />
      <instancedMesh ref={doors} args={[undefined, undefined, n]} material={mats.door}><planeGeometry args={[0.18, 0.32]} /></instancedMesh>
      <instancedMesh ref={wins} args={[undefined, undefined, n]} material={mats.glass}><planeGeometry args={[0.24, 0.2]} /></instancedMesh>
      <instancedMesh ref={chim} args={[undefined, undefined, n]} castShadow material={wallMat}><boxGeometry args={[0.1, 0.24, 0.1]} /></instancedMesh>
    </>
  );
}

const MODELS = { music: MusicStore, hall: ConcertHall, school: School, cafe: Cafe, generic: Generic } as const;

/** The procedural model for a spot (everything except member houses). */
export function SpotModel(props: BProps) {
  const M = props.spot.kind === "houses" ? Generic : MODELS[props.spot.kind];
  return <M {...props} />;
}

/** Highest point of a spot's model, for placing the name bubble. */
export function spotTop(spot: CitySpotView): number {
  const extra = { music: 1.3, hall: Math.min(spot.lot.w, spot.lot.d) * 0.34 + 0.5, school: 1.4, cafe: 0.6, houses: 0.5, generic: 0.2 }[spot.kind];
  return spot.h + ROOF_T + extra;
}
