"use client";

import { Billboard } from "@react-three/drei";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { CityBuilding, CitySpotView } from "@/lib/db/seed/city";
import { CITY_SCENE } from "@/lib/db/seed/city";
import { SpotTooltip } from "./SpotTooltip";

export interface CityView { spotId: string | null; zoomMul: number; resetKey: number }

const SIZE = CITY_SCENE.size;
const CENTRE = SIZE / 2;
const CAM = 24; // camera distance along the (1,1,1) isometric diagonal
const ELEV = Math.asin(1 / Math.sqrt(3)); // isometric elevation (~35.26deg): ground y-foreshortening factor = sin(ELEV)
const RIGHT = new THREE.Vector2(1, -1).normalize(); // screen-right on the ground plane (x,z)
const UP = new THREE.Vector2(-1, -1).normalize(); // screen-up (away from the camera) on the ground plane

const night = (hex: string, on: boolean) => new THREE.Color(hex).multiplyScalar(on ? 0.72 : 1);

/** Orthographic iso camera: follows a pan target, fly-to focus and zoom; drag to pan. */
function Rig({ target, zoomMul, resetKey, reduced }: { target: [number, number] | null; zoomMul: number; resetKey: number; reduced: boolean }) {
  const { camera, size, gl } = useThree();
  const pan = useRef(new THREE.Vector2(0, 0)); // desired look-at offset from the city centre (ground x,z)
  const cur = useRef({ x: 0, z: 0, zoom: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const base = Math.min(size.width / 17, size.height / 13);
  const zoomRef = useRef(base * zoomMul);
  zoomRef.current = base * zoomMul;

  // fly-to / reset
  useEffect(() => {
    pan.current.set(target ? target[0] - CENTRE : 0, target ? target[1] - CENTRE : 0);
  }, [target, resetKey]);

  // drag to pan
  useEffect(() => {
    const el = gl.domElement;
    const down = (e: PointerEvent) => { drag.current = { x: e.clientX, y: e.clientY }; el.setPointerCapture?.(e.pointerId); };
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const dx = e.clientX - d.x, dy = e.clientY - d.y;
      drag.current = { x: e.clientX, y: e.clientY };
      const z = zoomRef.current;
      pan.current.addScaledVector(RIGHT, -dx / z).addScaledVector(UP, dy / (z * Math.sin(ELEV)));
      pan.current.clampScalar(-SIZE * 0.6, SIZE * 0.6);
    };
    const up = (e: PointerEvent) => { drag.current = null; el.releasePointerCapture?.(e.pointerId); };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [gl]);

  useFrame((_, dt) => {
    const k = reduced ? 1 : 1 - Math.exp(-dt * (drag.current ? 30 : 6));
    const c = cur.current;
    if (c.zoom === 0) { c.x = pan.current.x; c.z = pan.current.y; c.zoom = zoomRef.current; }
    c.x += (pan.current.x - c.x) * k;
    c.z += (pan.current.y - c.z) * k;
    c.zoom += (zoomRef.current - c.zoom) * k;
    const tx = CENTRE + c.x, tz = CENTRE + c.z;
    camera.position.set(tx + CAM, CAM, tz + CAM);
    camera.lookAt(tx, 0, tz);
    (camera as THREE.OrthographicCamera).zoom = c.zoom;
    camera.updateProjectionMatrix();
  });
  return null;
}

function Building({ b, active, isNight, reduced, onHover, onPick, spotId }: {
  b: CityBuilding; active: boolean; isNight: boolean; reduced: boolean; spotId: string; onHover: (id: string | null) => void; onPick: (id: string) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const [top, right, left] = b.colors; // design c = [top, right(+x face), left(+z face)]
  const mats = useMemo(() => {
    const mk = (hex: string) => new THREE.MeshBasicMaterial({ color: night(hex, isNight) });
    const t = mk(top), r = mk(right), l = mk(left);
    return { list: [r, r, t, t, l, l], all: [t, r, l] };
  }, [top, right, left, isNight]);
  useEffect(() => () => mats.all.forEach((m) => m.dispose()), [mats]);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const goal = active ? 0.35 : 0;
    g.position.y = reduced ? goal : g.position.y + (goal - g.position.y) * (1 - Math.exp(-dt * 14));
  });

  const { x, y: z, w, d, h } = b;
  const wz = Math.max(0.5, h * 0.55), wh = Math.min(0.35, h * 0.2);
  const doorH = Math.min(0.7, h * 0.4);
  const glow = isNight ? "#FFE38A" : null;

  return (
    <group
      ref={group}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); onHover(spotId); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { onHover(null); document.body.style.cursor = ""; }}
      onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (e.delta < 5) onPick(spotId); }}
    >
      <mesh position={[x + w / 2, h / 2, z + d / 2]} material={mats.list}>
        <boxGeometry args={[w, h, d]} />
      </mesh>
      {/* door on the +z face */}
      <mesh position={[x + w / 2, doorH / 2, z + d + 0.006]}>
        <planeGeometry args={[w * 0.2, doorH]} />
        <meshBasicMaterial color={glow ?? "#FFFFFF"} />
      </mesh>
      {/* window on the +x face */}
      <mesh position={[x + w + 0.006, wz + wh / 2, z + d / 2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[d * 0.4, wh]} />
        <meshBasicMaterial color={glow ?? "#FFFFFF"} transparent opacity={glow ? 1 : 0.75} />
      </mesh>
    </group>
  );
}

function Walker({ from, to, color, hair, seconds, reduced }: { from: [number, number]; to: [number, number]; color: string; hair: string; seconds: number; reduced: boolean }) {
  const g = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = reduced ? 0 : clock.elapsedTime;
    const p = (Math.sin((t / seconds) * Math.PI * 2 - Math.PI / 2) + 1) / 2; // ping-pong 0..1
    g.current?.position.set(from[0] + (to[0] - from[0]) * p, 0, from[1] + (to[1] - from[1]) * p);
    if (body.current) body.current.position.y = reduced ? 0 : Math.abs(Math.sin(t * 2.6)) * 0.12;
  });
  return (
    <group ref={g}>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.18, 16]} />
        <meshBasicMaterial color="#2B2440" transparent opacity={0.15} />
      </mesh>
      <group ref={body}>
        <mesh position={[0, 0.3, 0]}><capsuleGeometry args={[0.15, 0.22, 4, 10]} /><meshBasicMaterial color={color} /></mesh>
        <mesh position={[0, 0.72, 0]}><sphereGeometry args={[0.2, 14, 12]} /><meshBasicMaterial color="#FFE6D6" /></mesh>
        <mesh position={[0, 0.76, -0.02]}><sphereGeometry args={[0.215, 14, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshBasicMaterial color={hair} /></mesh>
      </group>
    </group>
  );
}

const heartShape = (() => {
  const s = new THREE.Shape();
  s.moveTo(0, -0.5);
  s.bezierCurveTo(-0.15, -0.35, -0.55, -0.1, -0.55, 0.2);
  s.bezierCurveTo(-0.55, 0.45, -0.3, 0.55, 0, 0.3);
  s.bezierCurveTo(0.3, 0.55, 0.55, 0.45, 0.55, 0.2);
  s.bezierCurveTo(0.55, -0.1, 0.15, -0.35, 0, -0.5);
  return s;
})();

function FloatingHeart({ pos, color, scale, phase, reduced }: { pos: [number, number, number]; color: string; scale: number; phase: number; reduced: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (g.current) g.current.position.y = pos[1] + (reduced ? 0 : Math.sin((clock.elapsedTime + phase) * 1.25) * 0.28);
  });
  return (
    <group ref={g} position={pos}>
      <Billboard>
        <mesh scale={scale * 0.8}><shapeGeometry args={[heartShape]} /><meshBasicMaterial color={color} side={THREE.DoubleSide} /></mesh>
      </Billboard>
    </group>
  );
}

function Cloud({ y, z, scale, offset, isNight, reduced }: { y: number; z: number; scale: number; offset: number; isNight: boolean; reduced: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!g.current) return;
    const t = reduced ? offset : (clock.elapsedTime + offset) % 40;
    g.current.position.x = -4 + (t / 40) * 20;
  });
  const op = isNight ? 0.16 : 0.95;
  return (
    <group ref={g} position={[0, y, z]}>
      <Billboard>
        <mesh scale={[1.5 * scale, 0.5 * scale, 1]}><circleGeometry args={[1, 24]} /><meshBasicMaterial color="#fff" transparent opacity={op} depthWrite={false} /></mesh>
        <mesh position={[0.5 * scale, 0.35 * scale, 0]} scale={[0.9 * scale, 0.55 * scale, 1]}><circleGeometry args={[1, 24]} /><meshBasicMaterial color="#fff" transparent opacity={op} depthWrite={false} /></mesh>
      </Billboard>
    </group>
  );
}

function World({ spots, hover, sel, isNight, reduced, onHover, onPick }: {
  spots: CitySpotView[]; hover: string | null; sel: string | null; isNight: boolean; reduced: boolean; onHover: (id: string | null) => void; onPick: (id: string) => void;
}) {
  const activeId = hover ?? sel;
  const ground = isNight ? { top: "#9FC0AD", l: "#7FA591", r: "#8FB4A0" } : { top: "#E3F5E9", l: "#BFE3CC", r: "#D3EEDC" };
  const roadOpacity = isNight ? 0.3 : 0.92;
  const hovered = spots.find((s) => s.id === hover);
  return (
    <>
      {/* ground slab: faces +x (slabR) / +z (slabL) are the visible sides */}
      <mesh position={[CENTRE, -0.2, CENTRE]}>
        <boxGeometry args={[SIZE, 0.4, SIZE]} />
        {[ground.r, ground.r, ground.top, ground.top, ground.l, ground.l].map((c, i) => (
          <meshBasicMaterial key={i} attach={`material-${i}`} color={c} />
        ))}
      </mesh>
      {CITY_SCENE.roads.map((r, i) => (
        <mesh key={i} position={[r.x + r.w / 2, 0.012, r.y + r.d / 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[r.w, r.d]} />
          <meshBasicMaterial color="#fff" transparent opacity={roadOpacity} depthWrite={false} />
        </mesh>
      ))}
      {spots.map((s) =>
        s.buildings.map((b) => <Building key={b.id} b={b} spotId={s.id} active={activeId === s.id} isNight={isNight} reduced={reduced} onHover={onHover} onPick={onPick} />),
      )}
      {CITY_SCENE.walkers.map((w, i) => <Walker key={i} {...w} reduced={reduced} />)}
      {CITY_SCENE.hearts.map((h, i) => <FloatingHeart key={i} {...h} reduced={reduced} />)}
      <Cloud y={7} z={1} scale={1.4} offset={6} isNight={isNight} reduced={reduced} />
      <Cloud y={6} z={5} scale={1} offset={22} isNight={isNight} reduced={reduced} />
      {hovered && (
        <SpotTooltip
          label={hovered.name}
          position={[hovered.pos[0], Math.max(...hovered.buildings.map((b) => b.h)) + 0.9, hovered.pos[2]]}
        />
      )}
    </>
  );
}

export interface CitySceneProps {
  spots: CitySpotView[];
  view: CityView;
  hover: string | null;
  isNight: boolean;
  reduced: boolean;
  onHover: (id: string | null) => void;
  onPick: (id: string) => void;
  onReady: () => void;
}

export default function CityScene({ spots, view, hover, isNight, reduced, onHover, onPick, onReady }: CitySceneProps) {
  const focus = spots.find((s) => s.id === view.spotId);
  const target = useMemo<[number, number] | null>(() => (focus ? [focus.pos[0], focus.pos[2]] : null), [focus]);
  return (
    <Canvas
      orthographic
      flat
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      camera={{ position: [CENTRE + CAM, CAM, CENTRE + CAM], zoom: 40, near: 0.1, far: 200 }}
      onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); onReady(); }}
      style={{ touchAction: "none" }}
    >
      <Rig target={target} zoomMul={view.zoomMul} resetKey={view.resetKey} reduced={reduced} />
      <World spots={spots} hover={hover} sel={view.spotId} isNight={isNight} reduced={reduced} onHover={onHover} onPick={onPick} />
    </Canvas>
  );
}
