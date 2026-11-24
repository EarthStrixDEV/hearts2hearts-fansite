"use client";

import { Environment, Lightformer, RoundedBox } from "@react-three/drei";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { CityHouse, CitySpotView } from "@/lib/db/seed/city";
import { CITY_SCENE } from "@/lib/db/seed/city";
import { MemberHouses, SpotModel, houseLayout, spotTop, useCityMats, type CityMats } from "./buildings";
import { Cloud, ContactShadows, FloatingHeart, Fountain, Greenery, Lamps, RoadMarks, Walker } from "./props";
import { cityConfig, detectTier, type CityMood, type CitySceneConfig } from "./sceneConfig";
import { SpotTooltip } from "./SpotTooltip";

export interface CityView { spotId: string | null; zoomMul: number; resetKey: number }

const SIZE = CITY_SCENE.size;
const CENTRE = SIZE / 2;
const ELEV = Math.asin(1 / Math.sqrt(3)); // isometric elevation (~35.26deg): ground y-foreshortening factor = sin(ELEV)
const RIGHT = new THREE.Vector2(1, -1).normalize(); // screen-right on the ground plane (x,z)
const UP = new THREE.Vector2(-1, -1).normalize(); // screen-up (away from the camera) on the ground plane

/** Orthographic iso camera: follows a pan target, fly-to focus and zoom; drag to pan. */
function Rig({ target, zoomMul, resetKey, reduced, cam }: { target: [number, number] | null; zoomMul: number; resetKey: number; reduced: boolean; cam: number }) {
  const { camera, size, gl } = useThree();
  const pan = useRef(new THREE.Vector2(0, 0)); // desired look-at offset from the city centre (ground x,z)
  const cur = useRef({ x: 0, z: 0, zoom: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const base = Math.min(size.width / 14.5, size.height / 13);
  const zoomRef = useRef(base * zoomMul);
  zoomRef.current = base * zoomMul;

  useEffect(() => {
    pan.current.set(target ? target[0] - CENTRE : 0, target ? target[1] - CENTRE : 0);
  }, [target, resetKey]);

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
    camera.position.set(tx + cam, cam, tz + cam);
    camera.lookAt(tx, 0, tz);
    (camera as THREE.OrthographicCamera).zoom = c.zoom;
    camera.updateProjectionMatrix();
  });
  return null;
}

/** Soft key light (the only shadow caster) + sky/ground fill + a tiny procedural environment for glass sheen. */
function Lights({ mood, cfg }: { mood: CityMood; cfg: CitySceneConfig }) {
  const key = useRef<THREE.DirectionalLight>(null);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const l = key.current;
    if (!l) return;
    l.target.position.set(CENTRE, 0, CENTRE);
    scene.add(l.target);
    return () => { scene.remove(l.target); };
  }, [scene]);
  return (
    <>
      <hemisphereLight args={[mood.hemiSky, mood.hemiGround, mood.hemi]} />
      <directionalLight
        ref={key}
        position={[CENTRE + 8, 10, CENTRE - 4]}
        color={mood.keyColor}
        intensity={mood.key}
        castShadow
        shadow-mapSize={[cfg.shadowMap, cfg.shadowMap]}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-bias={-0.0004}
        shadow-normalBias={0.025}
      />
      <Environment resolution={64} frames={1} environmentIntensity={mood.env}>
        <color attach="background" args={["#FFF1F7"]} />
        <Lightformer form="rect" intensity={2} color="#FFFFFF" position={[0, 6, 6]} scale={[10, 4, 1]} />
        <Lightformer form="rect" intensity={1} color="#CFE8FF" position={[-6, 3, 0]} rotation={[0, Math.PI / 2, 0]} scale={[8, 4, 1]} />
      </Environment>
    </>
  );
}

/** Shadows are static except while a building lifts: render the shadow map only when something marks it dirty. */
function ShadowGate({ spots, houses }: { spots: CitySpotView[]; houses: CityHouse[] }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
  }, [gl, spots, houses]);
  return null;
}

/** Lifts a spot on hover/select (design `.bld.up`) and handles its pointer events. */
function SpotGroup({ spot, active, reduced, onHover, onPick, children }: {
  spot: CitySpotView; active: boolean; reduced: boolean; onHover: (id: string | null) => void; onPick: (id: string) => void; children: React.ReactNode;
}) {
  const g = useRef<THREE.Group>(null);
  const gl = useThree((s) => s.gl);
  useFrame((_, dt) => {
    const grp = g.current;
    if (!grp) return;
    const goal = active ? 0.35 : 0;
    const y = reduced ? goal : grp.position.y + (goal - grp.position.y) * (1 - Math.exp(-dt * 14));
    if (Math.abs(y - grp.position.y) > 1e-4) gl.shadowMap.needsUpdate = true;
    grp.position.y = Math.abs(goal - y) < 1e-4 ? goal : y;
  });
  return (
    <group
      ref={g}
      position-x={spot.lot.x + spot.lot.w / 2}
      position-z={spot.lot.z + spot.lot.d / 2}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); onHover(spot.id); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { onHover(null); document.body.style.cursor = ""; }}
      onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (e.delta < 5) onPick(spot.id); }}
    >
      {children}
    </group>
  );
}

function World({ spots, houses, hover, sel, mood, cfg, mats, reduced, onHover, onPick }: {
  spots: CitySpotView[]; houses: CityHouse[]; hover: string | null; sel: string | null; mood: CityMood; cfg: CitySceneConfig; mats: CityMats; reduced: boolean;
  onHover: (id: string | null) => void; onPick: (id: string) => void;
}) {
  const [house, setHouse] = useState<number | null>(null);
  const activeId = hover ?? sel;
  const hovered = spots.find((s) => s.id === hover);
  useEffect(() => { if (hovered?.kind !== "houses") setHouse(null); }, [hovered?.kind]);
  const footprints = useMemo(
    () =>
      spots.flatMap((s) =>
        s.kind === "houses"
          ? houseLayout(s, houses.length).map((p) => ({ x: s.pos[0] + p.x, z: s.pos[2] + p.z, w: 0.72, d: 0.72 }))
          : [{ x: s.pos[0], z: s.pos[2], w: s.lot.w, d: s.lot.d }],
      ),
    [spots, houses.length],
  );
  let tip: { label: string; position: [number, number, number] } | null = null;
  if (hovered?.kind === "houses" && house !== null && houses[house]) {
    const p = houseLayout(hovered, houses.length)[house];
    tip = { label: `${houses[house].name}’s house`, position: [hovered.pos[0] + p.x, p.h + 1.2, hovered.pos[2] + p.z] };
  } else if (hovered) {
    tip = { label: hovered.name, position: [hovered.pos[0], spotTop(hovered) + 0.45, hovered.pos[2]] };
  }
  return (
    <>
      {/* ground: thin grass layer (top at y = 0) over a slightly inset soil slab, as the design's ground + slab sides */}
      <RoundedBox args={[SIZE + 0.2, 0.12, SIZE + 0.2]} radius={0.05} smoothness={2} position={[CENTRE, -0.06, CENTRE]} receiveShadow>
        <meshStandardMaterial color={mood.ground} roughness={1} />
      </RoundedBox>
      <RoundedBox args={[SIZE + 0.1, 0.5, SIZE + 0.1]} radius={0.18} smoothness={3} position={[CENTRE, -0.31, CENTRE]}>
        <meshStandardMaterial color={mood.slab} roughness={1} />
      </RoundedBox>
      <ContactShadows rects={footprints} />
      {CITY_SCENE.roads.map((r, i) => (
        <mesh key={i} position={[r.x + r.w / 2, 0.01 + i * 0.004, r.z + r.d / 2]} receiveShadow>
          <boxGeometry args={[r.w, 0.02, r.d]} />
          <meshStandardMaterial color={mood.road} roughness={0.95} />
        </mesh>
      ))}
      <RoadMarks />
      <Fountain reduced={reduced} glow={mood.glow} />
      <Greenery />
      <Lamps mats={mats} glow={mood.glow} glowColor={cfg.glowColor} />
      {spots.map((s) => (
        <SpotGroup key={s.id} spot={s} active={activeId === s.id} reduced={reduced} onHover={onHover} onPick={onPick}>
          {s.kind === "houses" ? (
            <MemberHouses spot={s} houses={houses} mats={mats} reduced={reduced} onHouse={setHouse} />
          ) : (
            <SpotModel spot={s} mats={mats} reduced={reduced} />
          )}
        </SpotGroup>
      ))}
      {CITY_SCENE.walkers.map((w, i) => <Walker key={i} {...w} reduced={reduced} />)}
      {CITY_SCENE.hearts.map((h, i) => <FloatingHeart key={i} {...h} reduced={reduced} />)}
      {CITY_SCENE.clouds.map((c, i) => <Cloud key={i} {...c} opacity={mood.cloudOpacity} reduced={reduced} />)}
      {tip && <SpotTooltip label={tip.label} position={tip.position} />}
    </>
  );
}

export interface CitySceneProps {
  spots: CitySpotView[];
  houses: CityHouse[];
  view: CityView;
  hover: string | null;
  isNight: boolean;
  reduced: boolean;
  onHover: (id: string | null) => void;
  onPick: (id: string) => void;
  onReady: () => void;
}

function Scene(props: CitySceneProps & { cfg: CitySceneConfig; target: [number, number] | null }) {
  const { cfg, isNight, view, target, reduced } = props;
  const mood = isNight ? cfg.night : cfg.day;
  const mats = useCityMats(mood.glow, cfg.glowColor, cfg.ink);
  return (
    <>
      <Rig target={target} zoomMul={view.zoomMul} resetKey={view.resetKey} reduced={reduced} cam={cfg.camDistance} />
      <Lights mood={mood} cfg={cfg} />
      <ShadowGate spots={props.spots} houses={props.houses} />
      <World spots={props.spots} houses={props.houses} hover={props.hover} sel={view.spotId} mood={mood} cfg={cfg} mats={mats} reduced={reduced} onHover={props.onHover} onPick={props.onPick} />
    </>
  );
}

export default function CityScene(props: CitySceneProps) {
  const cfg = useMemo(() => cityConfig(detectTier()), []);
  const focus = props.spots.find((s) => s.id === props.view.spotId);
  const target = useMemo<[number, number] | null>(() => (focus ? [focus.pos[0], focus.pos[2]] : null), [focus]);
  const { onReady } = props;
  return (
    <Canvas
      orthographic
      shadows="soft"
      dpr={cfg.dpr}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      camera={{ position: [CENTRE + cfg.camDistance, cfg.camDistance, CENTRE + cfg.camDistance], zoom: 40, near: 0.1, far: 200 }}
      onCreated={({ gl, scene, camera }) => {
        gl.setClearColor(0x000000, 0);
        gl.toneMapping = THREE.NeutralToneMapping;
        gl.toneMappingExposure = cfg.exposure;
        if (process.env.NODE_ENV !== "production") Object.assign(window, { __three: { THREE, renderer: gl, scene, camera, tier: cfg.tier }, __sceneReady: true });
        onReady();
      }}
      style={{ touchAction: "none" }}
    >
      <Scene {...props} cfg={cfg} target={target} />
    </Canvas>
  );
}
