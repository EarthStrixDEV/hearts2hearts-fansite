"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CITY_SCENE } from "@/lib/db/seed/city";
import type { CityMats } from "./buildings";

const HALF_PI = Math.PI / 2;

/** Fill an InstancedMesh once from a list of transforms (and optional colours). */
function useInstances(ref: React.RefObject<THREE.InstancedMesh | null>, items: { p: [number, number, number]; s?: [number, number, number]; r?: [number, number, number]; c?: string }[]) {
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    items.forEach((it, i) => {
      o.position.set(...it.p);
      o.scale.set(...(it.s ?? [1, 1, 1]));
      o.rotation.set(...(it.r ?? [0, 0, 0]));
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      if (it.c) m.setColorAt(i, col.set(it.c));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [ref, items]);
}

/** Soft radial sprite used for lamp light pools at night. */
let glowTex: THREE.Texture | null = null;
function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.4, "rgba(255,255,255,.45)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(c);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}

/** Soft rounded-rectangle falloff, used as a contact-shadow decal under building footprints. */
let aoTex: THREE.Texture | null = null;
function aoTexture() {
  if (aoTex) return aoTex;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  g.filter = "blur(10px)";
  g.fillStyle = "#fff";
  g.beginPath();
  g.roundRect(16, 16, 96, 96, 14);
  g.fill();
  aoTex = new THREE.CanvasTexture(c);
  return aoTex;
}

/** One instanced decal darkening the ground around each footprint (x/z centre, w/d size). */
export function ContactShadows({ rects }: { rects: { x: number; z: number; w: number; d: number }[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const items = useMemo(() => rects.map((r) => ({ p: [r.x, 0.03, r.z] as [number, number, number], s: [r.w + 0.6, r.d + 0.6, 1] as [number, number, number], r: [-HALF_PI, 0, 0] as [number, number, number] })), [rects]);
  useInstances(ref, items);
  const tex = useMemo(() => aoTexture(), []);
  if (!rects.length) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} renderOrder={1}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial alphaMap={tex} color="#6E6787" transparent opacity={0.22} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  );
}

const CANOPY = ["#A8E0B8", "#8FD3A6", "#BDE8C8", "#FFC4DA"];

export function Greenery() {
  const trunks = useRef<THREE.InstancedMesh>(null);
  const crowns = useRef<THREE.InstancedMesh>(null);
  const bushes = useRef<THREE.InstancedMesh>(null);
  const blooms = useRef<THREE.InstancedMesh>(null);
  const t = useMemo(() => CITY_SCENE.trees.map(([x, z, s]) => ({ p: [x, 0.22 * s, z] as [number, number, number], s: [s, s, s] as [number, number, number] })), []);
  const c = useMemo(
    () => CITY_SCENE.trees.map(([x, z, s], i) => ({ p: [x, 0.62 * s, z] as [number, number, number], s: [s, s * 1.08, s] as [number, number, number], c: CANOPY[i % 5 === 3 ? 3 : i % 3] })),
    [],
  );
  const b = useMemo(() => CITY_SCENE.flowers.map(([x, z, s]) => ({ p: [x, 0, z] as [number, number, number], s: [s, s * 0.8, s] as [number, number, number] })), []);
  const f = useMemo(
    () =>
      CITY_SCENE.flowers.flatMap(([x, z, s, ci]) =>
        [0, 2.1, 4.2].map((a) => ({ p: [x + Math.cos(a) * 0.09 * s, 0.15 * s, z + Math.sin(a) * 0.09 * s] as [number, number, number], s: [s, s, s] as [number, number, number], c: CITY_SCENE.flowerColors[ci] })),
      ),
    [],
  );
  useInstances(trunks, t);
  useInstances(crowns, c);
  useInstances(bushes, b);
  useInstances(blooms, f);
  return (
    <>
      <instancedMesh ref={trunks} args={[undefined, undefined, t.length]} castShadow>
        <cylinderGeometry args={[0.05, 0.07, 0.44, 8]} />
        <meshStandardMaterial color="#C9A58A" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[undefined, undefined, c.length]} castShadow receiveShadow>
        <icosahedronGeometry args={[0.32, 2]} />
        <meshStandardMaterial roughness={0.85} />
      </instancedMesh>
      <instancedMesh ref={bushes} args={[undefined, undefined, b.length]} castShadow receiveShadow>
        <sphereGeometry args={[0.17, 14, 10, 0, Math.PI * 2, 0, HALF_PI]} />
        <meshStandardMaterial color="#9BD8AE" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={blooms} args={[undefined, undefined, f.length]}>
        <sphereGeometry args={[0.05, 8, 6]} />
        <meshStandardMaterial roughness={0.6} />
      </instancedMesh>
    </>
  );
}

export function Lamps({ mats, glow, glowColor }: { mats: CityMats; glow: number; glowColor: string }) {
  const posts = useRef<THREE.InstancedMesh>(null);
  const bulbs = useRef<THREE.InstancedMesh>(null);
  const pools = useRef<THREE.InstancedMesh>(null);
  const p = useMemo(() => CITY_SCENE.lamps.map(([x, z]) => ({ p: [x, 0.38, z] as [number, number, number] })), []);
  const b = useMemo(() => CITY_SCENE.lamps.map(([x, z]) => ({ p: [x, 0.8, z] as [number, number, number] })), []);
  const g = useMemo(() => CITY_SCENE.lamps.map(([x, z]) => ({ p: [x, 0.04, z] as [number, number, number], r: [-HALF_PI, 0, 0] as [number, number, number] })), []);
  useInstances(posts, p);
  useInstances(bulbs, b);
  useInstances(pools, g);
  const tex = useMemo(() => glowTexture(), []);
  return (
    <>
      <instancedMesh ref={posts} args={[undefined, undefined, p.length]} castShadow>
        <cylinderGeometry args={[0.03, 0.045, 0.76, 8]} />
        <meshStandardMaterial color="#8C84A8" roughness={0.5} />
      </instancedMesh>
      <instancedMesh ref={bulbs} args={[undefined, undefined, b.length]} material={mats.bulb}>
        <sphereGeometry args={[0.09, 14, 10]} />
      </instancedMesh>
      <instancedMesh ref={pools} args={[undefined, undefined, g.length]} visible={glow > 0} renderOrder={2}>
        <planeGeometry args={[1.5, 1.5]} />
        <meshBasicMaterial map={tex} color={glowColor} transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </instancedMesh>
    </>
  );
}

/** Extruded 3D heart, centred, facing +z. Shared by the fountain and the floating hearts. */
export const heartGeometry = (() => {
  const s = new THREE.Shape();
  s.moveTo(0, -0.5);
  s.bezierCurveTo(-0.15, -0.35, -0.55, -0.1, -0.55, 0.2);
  s.bezierCurveTo(-0.55, 0.45, -0.3, 0.55, 0, 0.3);
  s.bezierCurveTo(0.3, 0.55, 0.55, 0.45, 0.55, 0.2);
  s.bezierCurveTo(0.55, -0.1, 0.15, -0.35, 0, -0.5);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.06, bevelSegments: 4, curveSegments: 20 });
  g.center();
  return g;
})();

export function Fountain({ reduced, glow }: { reduced: boolean; glow: number }) {
  const { x, z, r } = CITY_SCENE.plaza;
  const heart = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const h = heart.current;
    if (!h || reduced) return;
    h.rotation.y = clock.elapsedTime * 0.8;
    h.position.y = 0.78 + Math.sin(clock.elapsedTime * 1.6) * 0.05;
  });
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.02, 0]} receiveShadow><cylinderGeometry args={[r, r, 0.04, 48]} /><meshStandardMaterial color="#FFF6EE" roughness={0.9} /></mesh>
      <mesh position={[0, 0.12, 0]} castShadow receiveShadow><cylinderGeometry args={[0.5, 0.54, 0.18, 40]} /><meshStandardMaterial color="#E4DAFF" roughness={0.6} /></mesh>
      <mesh position={[0, 0.212, 0]} rotation={[-HALF_PI, 0, 0]}><circleGeometry args={[0.43, 40]} /><meshStandardMaterial color="#A8D8FF" roughness={0.1} metalness={0.1} emissive="#A8D8FF" emissiveIntensity={glow > 0 ? 0.35 : 0.08} /></mesh>
      <mesh position={[0, 0.4, 0]} castShadow><cylinderGeometry args={[0.06, 0.1, 0.4, 16]} /><meshStandardMaterial color="#CFC0FF" roughness={0.6} /></mesh>
      <group ref={heart} position={[0, 0.78, 0]} rotation={[0, Math.PI / 4, 0]}>
        <mesh geometry={heartGeometry} scale={0.42} castShadow><meshStandardMaterial color="#FF8FB8" roughness={0.35} emissive="#FF8FB8" emissiveIntensity={glow > 0 ? 0.5 : 0.05} /></mesh>
      </group>
    </group>
  );
}

export function RoadMarks() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const { x: px, z: pz, r } = CITY_SCENE.plaza;
  const items = useMemo(() => {
    const out: { p: [number, number, number]; r?: [number, number, number] }[] = [];
    for (let t = 0.4; t < 10; t += 0.7) {
      if (Math.abs(t - px) > r + 0.2) out.push({ p: [t, 0.026, pz] });
      if (Math.abs(t - pz) > r + 0.2) out.push({ p: [px, 0.026, t], r: [0, HALF_PI, 0] });
    }
    return out;
  }, [px, pz, r]);
  useInstances(ref, items);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} receiveShadow>
      <boxGeometry args={[0.3, 0.01, 0.06]} />
      <meshStandardMaterial color="#FFD0E2" roughness={0.9} />
    </instancedMesh>
  );
}

export function Walker({ from, to, color, hair, seconds, reduced }: { from: [number, number]; to: [number, number]; color: string; hair: string; seconds: number; reduced: boolean }) {
  const g = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const dir = Math.atan2(to[0] - from[0], to[1] - from[1]);
  useFrame(({ clock }) => {
    const t = reduced ? 0 : clock.elapsedTime;
    const ph = (t / seconds) * Math.PI * 2 - HALF_PI;
    const p = (Math.sin(ph) + 1) / 2; // ping-pong 0..1
    const back = Math.cos(ph) < 0;
    if (g.current) {
      g.current.position.set(from[0] + (to[0] - from[0]) * p, 0, from[1] + (to[1] - from[1]) * p);
      g.current.rotation.y = back ? dir + Math.PI : dir;
    }
    if (body.current) body.current.position.y = reduced ? 0 : Math.abs(Math.sin(t * 5.2)) * 0.06;
  });
  return (
    <group ref={g}>
      <mesh position={[0, 0.03, 0]} rotation={[-HALF_PI, 0, 0]}>
        <circleGeometry args={[0.16, 20]} />
        <meshBasicMaterial color="#2B2440" transparent opacity={0.16} depthWrite={false} />
      </mesh>
      <group ref={body}>
        <mesh position={[0, 0.27, 0]}><capsuleGeometry args={[0.13, 0.2, 4, 12]} /><meshStandardMaterial color={color} roughness={0.7} /></mesh>
        <mesh position={[0, 0.64, 0]}><sphereGeometry args={[0.17, 18, 14]} /><meshStandardMaterial color="#FFE6D6" roughness={0.7} /></mesh>
        <mesh position={[0, 0.68, -0.02]}><sphereGeometry args={[0.185, 18, 14, 0, Math.PI * 2, 0, HALF_PI]} /><meshStandardMaterial color={hair} roughness={0.6} /></mesh>
      </group>
    </group>
  );
}

export function FloatingHeart({ pos, color, scale, phase, reduced }: { pos: [number, number, number]; color: string; scale: number; phase: number; reduced: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const h = g.current;
    if (!h) return;
    const t = clock.elapsedTime + phase;
    h.position.y = pos[1] + (reduced ? 0 : Math.sin(t * 1.25) * 0.25);
    h.rotation.y = Math.PI / 4 + (reduced ? 0 : Math.sin(t * 0.7) * 0.5);
  });
  return (
    <group ref={g} position={pos}>
      <mesh geometry={heartGeometry} scale={scale * 0.75}><meshStandardMaterial color={color} roughness={0.35} emissive={color} emissiveIntensity={0.18} /></mesh>
    </group>
  );
}

const cloudGeometry = (() => {
  const parts = [
    [0, 0, 0, 1], [0.9, 0.15, 0.1, 0.75], [-0.85, -0.05, 0, 0.7], [0.3, 0.45, -0.1, 0.7], [-0.35, 0.3, 0.15, 0.6],
  ].map(([x, y, z, r]) => new THREE.SphereGeometry(r, 18, 12).translate(x, y, z));
  const g = mergeGeometries(parts)!;
  parts.forEach((p) => p.dispose());
  g.scale(1, 0.62, 0.8);
  return g;
})();

export function Cloud({ y, z, scale, offset, opacity, reduced }: { y: number; z: number; scale: number; offset: number; opacity: number; reduced: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!g.current) return;
    const t = reduced ? offset : (clock.elapsedTime + offset) % 50;
    g.current.position.x = -6 + (t / 50) * 22;
  });
  return (
    <group ref={g} position={[0, y, z]}>
      <mesh geometry={cloudGeometry} scale={scale * 0.6}>
        <meshStandardMaterial color="#FFFFFF" roughness={1} transparent opacity={opacity} depthWrite={false} emissive="#FFFFFF" emissiveIntensity={opacity < 0.5 ? 1 : 0.25} />
      </mesh>
    </group>
  );
}

