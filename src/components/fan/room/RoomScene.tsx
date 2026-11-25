"use client";

import { useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Component, Suspense, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { ROOM_HALF, ROOM_HEIGHT, type Placement } from "@/lib/fan/room";
import { BOOKS, SUN, lookFor, type Look } from "./looks";

// Isometric room: one floor slab, two back walls, one directional light (the only shadow caster) and one hemisphere fill.
// Draw-call budget: room 3 + at most ~20 for the seven seeded items; the fairy lights are a single InstancedMesh.

export interface SceneItem { id: string; slug: string; modelUrl: string | null; placement: Placement }

const DEG = Math.PI / 180;
const CAM = 20; // distance along the (1,1,1) isometric diagonal
const FOCUS = new THREE.Vector3(0, 1.3, 0);
const WALL = 0.2;
const SPAN = ROOM_HALF + WALL; // outer edge of floor and wall slabs

const pulse = (t: number) => 0.85 + 0.3 * Math.sin(t * Math.PI); // 2 s glow cycle, like the artboard's `glow`

/** Fixed isometric orthographic camera that fits the room in the canvas. */
function Rig() {
  useFrame(({ camera, size }) => {
    const cam = camera as THREE.OrthographicCamera;
    cam.position.set(FOCUS.x + CAM, FOCUS.y + CAM, FOCUS.z + CAM);
    cam.lookAt(FOCUS);
    const zoom = Math.min(size.width / 9.4, size.height / 8.8);
    if (cam.zoom !== zoom) { cam.zoom = zoom; cam.updateProjectionMatrix(); }
  });
  return null;
}

/** Lets the page grab the current frame (for the share PNG). */
function CaptureBridge({ onCapture }: { onCapture: (grab: (() => HTMLCanvasElement) | null) => void }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    // render synchronously right before the copy: the drawing buffer is not preserved between frames
    onCapture(() => { gl.render(scene, camera); return gl.domElement; });
    return () => onCapture(null);
  }, [gl, scene, camera, onCapture]);
  return null;
}

/** Drops an item in with a short spring; `reduced` skips it. */
function Pop({ position, rotY, reduced, children }: { position: [number, number, number]; rotY: number; reduced: boolean; children: ReactNode }) {
  const g = useRef<THREE.Group>(null);
  const t = useRef(reduced ? 1 : 0);
  useFrame((_, dt) => {
    const grp = g.current;
    if (!grp || t.current >= 1) return;
    t.current = Math.min(1, t.current + dt / 0.45);
    const k = 1 - Math.pow(1 - t.current, 3);
    grp.position.y = position[1] + (1 - k) * 0.8;
    grp.scale.setScalar(0.8 + 0.2 * k);
  });
  return <group ref={g} position={position} rotation-y={rotY}>{children}</group>;
}

function Glow({ color, reduced, radius = 0.28 }: { color: string; reduced: boolean; radius?: number }) {
  const m = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => { if (m.current && !reduced) m.current.emissiveIntensity = pulse(clock.elapsedTime); });
  return (
    <mesh castShadow>
      <sphereGeometry args={[radius, 16, 12]} />
      <meshStandardMaterial ref={m} color="#fff" emissive={color} emissiveIntensity={0.9} />
    </mesh>
  );
}

/** Bulbs along the top edge of both back walls, one draw call. */
function Lights({ y, reduced }: { y: number; reduced: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const spots = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let i = 0; i < 13; i++) {
      const s = -ROOM_HALF + 0.15 + i * ((ROOM_HALF * 2 - 0.3) / 12);
      out.push([-ROOM_HALF + 0.05, y - Math.sin((i / 12) * Math.PI) * 0.18, s]); // left wall, gently drooping
      out.push([s, y - Math.sin((i / 12) * Math.PI) * 0.18, -ROOM_HALF + 0.05]); // right wall
    }
    return out;
  }, [y]);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const o = new THREE.Object3D();
    spots.forEach((p, i) => { o.position.set(...p); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
    m.instanceMatrix.needsUpdate = true;
  }, [spots]);
  useFrame(({ clock }) => { if (mat.current && !reduced) mat.current.emissiveIntensity = pulse(clock.elapsedTime) + 0.2; });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, spots.length]}>
      <sphereGeometry args={[0.07, 8, 6]} />
      <meshStandardMaterial ref={mat} color="#fff" emissive={SUN} emissiveIntensity={1} />
    </instancedMesh>
  );
}

/** Shape drawn while an item has no .glb (or while it loads / fails). All pieces sit on the item's base. */
function Placeholder({ slug, reduced }: { slug: string; reduced: boolean }) {
  const look: Look = lookFor(slug);
  switch (look.shape) {
    case "box":
      return (
        <mesh position-y={look.size[1] / 2} castShadow receiveShadow>
          <boxGeometry args={look.size} />
          <meshStandardMaterial color={look.color} roughness={0.8} />
        </mesh>
      );
    case "disc":
      return (
        <mesh position-y={look.height / 2} receiveShadow>
          <cylinderGeometry args={[look.diameter / 2, look.diameter / 2, look.height, 40]} />
          <meshStandardMaterial color={look.color} roughness={0.95} />
        </mesh>
      );
    case "panel": {
      const [w, h] = look.size;
      return (
        <group position-y={h / 2}>
          <mesh castShadow>
            <boxGeometry args={[w + 0.14, h + 0.14, 0.06]} />
            <meshStandardMaterial color="#fff" roughness={0.9} />
          </mesh>
          <mesh position-z={0.035}>
            <boxGeometry args={[w, h, 0.02]} />
            <meshStandardMaterial color={look.color} roughness={0.9} />
          </mesh>
        </group>
      );
    }
    case "shelf":
      return (
        <group>
          <mesh position-y={0.05} castShadow receiveShadow>
            <boxGeometry args={[2.2, 0.1, 0.5]} />
            <meshStandardMaterial color="#E2C8B0" roughness={0.9} />
          </mesh>
          {BOOKS.map((c, i) => (
            <mesh key={c} position={[-0.7 + i * 0.35, 0.1 + 0.27 + (i % 2) * 0.02, 0]} castShadow>
              <boxGeometry args={[0.24, 0.54 + (i % 3) * 0.03, 0.34]} />
              <meshStandardMaterial color={c} roughness={0.8} />
            </mesh>
          ))}
        </group>
      );
    case "lamp":
      return (
        <group>
          <mesh position-y={0.04} castShadow>
            <cylinderGeometry args={[0.28, 0.32, 0.08, 24]} />
            <meshStandardMaterial color="#fff" roughness={0.7} />
          </mesh>
          <mesh position-y={0.7} castShadow>
            <cylinderGeometry args={[0.05, 0.06, 1.3, 12]} />
            <meshStandardMaterial color="#fff" roughness={0.6} />
          </mesh>
          <group position-y={1.55}><Glow color="#A8D8FF" reduced={reduced} /></group>
        </group>
      );
    case "lights":
      return <Lights y={0} reduced={reduced} />;
  }
}

function Glb({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const copy = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={copy} />;
}

/** A model that cannot load must not take the whole room down: fall back to the placeholder. */
class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function Item({ item, reduced }: { item: SceneItem; reduced: boolean }) {
  const { x, y, z, rot } = item.placement;
  const fallback = <Placeholder slug={item.slug} reduced={reduced} />;
  return (
    <Pop position={[x, y, z]} rotY={rot * DEG} reduced={reduced}>
      {item.modelUrl ? (
        <ModelBoundary fallback={fallback}>
          <Suspense fallback={fallback}><Glb url={item.modelUrl} /></Suspense>
        </ModelBoundary>
      ) : (
        fallback
      )}
    </Pop>
  );
}

function Room({ items, reduced }: { items: SceneItem[]; reduced: boolean }) {
  return (
    <>
      {/* floor, left wall (x = -3), right wall (z = -3) */}
      <mesh position={[0, -0.1, 0]} receiveShadow>
        <boxGeometry args={[SPAN * 2, 0.2, SPAN * 2]} />
        <meshStandardMaterial color="#F3E4D6" roughness={1} />
      </mesh>
      <mesh position={[-ROOM_HALF - WALL / 2, ROOM_HEIGHT / 2, WALL / 2]} receiveShadow>
        <boxGeometry args={[WALL, ROOM_HEIGHT, SPAN * 2 - WALL]} />
        <meshStandardMaterial color="#F7E7EF" roughness={1} />
      </mesh>
      <mesh position={[0, ROOM_HEIGHT / 2, -ROOM_HALF - WALL / 2]} receiveShadow>
        <boxGeometry args={[SPAN * 2, ROOM_HEIGHT, WALL]} />
        <meshStandardMaterial color="#EDE6FA" roughness={1} />
      </mesh>
      {items.map((it) => <Item key={it.id} item={it} reduced={reduced} />)}
    </>
  );
}

export interface RoomSceneProps {
  items: SceneItem[];
  reduced: boolean;
  onCapture: (grab: (() => HTMLCanvasElement) | null) => void;
  onReady: () => void;
}

export default function RoomScene({ items, reduced, onCapture, onReady }: RoomSceneProps) {
  return (
    <Canvas
      orthographic
      shadows
      // reduced motion: no pulses, so render only when something changes
      frameloop={reduced ? "demand" : "always"}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      camera={{ position: [CAM, CAM + FOCUS.y, CAM], zoom: 40, near: 0.1, far: 100 }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.toneMapping = THREE.NeutralToneMapping;
        onReady();
      }}
      style={{ touchAction: "pan-y" }}
    >
      <Rig />
      <CaptureBridge onCapture={onCapture} />
      <hemisphereLight args={["#FFFFFF", "#FFF1F7", 2.3]} />
      <directionalLight
        position={[6, 10, 5]}
        intensity={1.2}
        color="#FFF4EA"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-bias={-0.0005}
        shadow-normalBias={0.03}
      />
      <Room items={items} reduced={reduced} />
    </Canvas>
  );
}
