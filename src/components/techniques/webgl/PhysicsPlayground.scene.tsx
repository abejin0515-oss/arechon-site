'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import {
  Physics,
  RigidBody,
  CuboidCollider,
  type RapierRigidBody,
} from '@react-three/rapier';
import { RigidBodyType } from '@dimforge/rapier3d-compat';
import * as THREE from 'three';

import type { PhysicsShape } from './PhysicsPlayground';

/* -------------------------------------------------------------------------- */
/*  Tuning                                                                     */
/* -------------------------------------------------------------------------- */

/** Hard clamp so a bad prop can't melt a phone. */
const MAX_COUNT = 48;
const MIN_COUNT = 4;

/**
 * Mobile/touch cap. A mid-range Android handles ~16 colliding bodies inside
 * 4ms; we keep desktop richer. We detect "small or coarse pointer" rather than
 * UA-sniffing.
 */
const MOBILE_COUNT_CAP = 14;

/** Arena half-extents in world units. The camera is framed to show this box. */
const ARENA = { x: 4.2, y: 2.6, z: 1.4 };

/** Token half-size (radius for sphere). Kept uniform for tidy stacking. */
const R = 0.42;

/* -------------------------------------------------------------------------- */
/*  Shared geometry per shape — one instance reused by every body.             */
/* -------------------------------------------------------------------------- */

function useTokenGeometry(shape: PhysicsShape): THREE.BufferGeometry {
  const geometry = useMemo<THREE.BufferGeometry>(() => {
    switch (shape) {
      case 'sphere':
        return new THREE.SphereGeometry(R, 24, 16);
      case 'capsule':
        return new THREE.CapsuleGeometry(R * 0.7, R * 1.2, 6, 16);
      case 'rounded-box':
      default:
        // drei's RoundedBox geometry is heavier; a small-bevel box read is
        // achieved cheaply with a plain box + soft material. Keep it low-poly.
        return new THREE.BoxGeometry(R * 1.7, R * 1.7, R * 1.7, 1, 1, 1);
    }
  }, [shape]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

/** Collider args/type that mirror the visual geometry. */
function shapeColliderProps(shape: PhysicsShape) {
  switch (shape) {
    case 'sphere':
      return { colliders: 'ball' as const };
    case 'capsule':
      return { colliders: 'hull' as const };
    case 'rounded-box':
    default:
      return { colliders: 'cuboid' as const };
  }
}

/* -------------------------------------------------------------------------- */
/*  Drag state shared between the bodies and the frame loop.                   */
/* -------------------------------------------------------------------------- */

type DragState = {
  body: RapierRigidBody | null;
  // Pointer target on the z=0 drag plane, world space.
  target: THREE.Vector3;
  // For throw velocity: last target + timestamp.
  prev: THREE.Vector3;
  velocity: THREE.Vector3;
  lastT: number;
};

/* -------------------------------------------------------------------------- */
/*  A single token body.                                                       */
/* -------------------------------------------------------------------------- */

type TokenProps = {
  geometry: THREE.BufferGeometry;
  shape: PhysicsShape;
  color: string;
  position: [number, number, number];
  onGrab: (body: RapierRigidBody, event: ThreeEvent<PointerEvent>) => void;
};

function Token({ geometry, shape, color, position, onGrab }: TokenProps) {
  const ref = useRef<RapierRigidBody>(null);
  const collider = shapeColliderProps(shape);

  const handlePointerDown = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (!ref.current) return;
      onGrab(ref.current, event);
    },
    [onGrab],
  );

  return (
    <RigidBody
      ref={ref}
      position={position}
      colliders={collider.colliders}
      // A little damping so the pile settles fast and feels weighty, not jittery.
      linearDamping={0.35}
      angularDamping={0.45}
      friction={0.7}
      restitution={0.18}
      // Slight random spin on spawn reads as "alive" without animating.
      angularVelocity={[
        (Math.random() - 0.5) * 1.2,
        (Math.random() - 0.5) * 1.2,
        (Math.random() - 0.5) * 1.2,
      ]}
    >
      <mesh
        geometry={geometry}
        castShadow={false}
        receiveShadow={false}
        onPointerDown={handlePointerDown}
      >
        <meshStandardMaterial
          color={color}
          roughness={0.55}
          metalness={0.05}
          envMapIntensity={0.6}
        />
      </mesh>
    </RigidBody>
  );
}

/* -------------------------------------------------------------------------- */
/*  Invisible arena walls (fixed bodies). Keeps tokens contained.             */
/* -------------------------------------------------------------------------- */

function Arena() {
  const t = 0.5; // wall thickness (half-extent)
  return (
    <RigidBody type="fixed" colliders={false} friction={0.6} restitution={0.1}>
      {/* floor */}
      <CuboidCollider args={[ARENA.x + t, t, ARENA.z + t]} position={[0, -ARENA.y - t, 0]} />
      {/* ceiling */}
      <CuboidCollider args={[ARENA.x + t, t, ARENA.z + t]} position={[0, ARENA.y + t, 0]} />
      {/* left / right */}
      <CuboidCollider args={[t, ARENA.y + t, ARENA.z + t]} position={[-ARENA.x - t, 0, 0]} />
      <CuboidCollider args={[t, ARENA.y + t, ARENA.z + t]} position={[ARENA.x + t, 0, 0]} />
      {/* front / back — keep depth shallow so it reads as a slab */}
      <CuboidCollider args={[ARENA.x + t, ARENA.y + t, t]} position={[0, 0, -ARENA.z - t]} />
      <CuboidCollider args={[ARENA.x + t, ARENA.y + t, t]} position={[0, 0, ARENA.z + t]} />
    </RigidBody>
  );
}

/* -------------------------------------------------------------------------- */
/*  Pointer drag controller.                                                   */
/*                                                                             */
/*  On grab: switch the body to kinematic-position and follow the pointer      */
/*  projected onto the z=0 plane. On release: switch back to dynamic and apply */
/*  the tracked velocity as a throw. No joints → no joint lifecycle to clean.  */
/* -------------------------------------------------------------------------- */

function DragController({
  dragRef,
  activeRef,
}: {
  dragRef: React.RefObject<DragState>;
  activeRef: React.RefObject<boolean>;
}) {
  const { camera, gl } = useThree();

  // Reusable scratch objects — never allocate inside the frame loop.
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const dragPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const hit = useMemo(() => new THREE.Vector3(), []);

  const projectPointer = useCallback(
    (clientX: number, clientY: number, out: THREE.Vector3): boolean => {
      const rect = gl.domElement.getBoundingClientRect();
      ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const result = raycaster.ray.intersectPlane(dragPlane, out);
      return result !== null;
    },
    [camera, gl, ndc, raycaster, dragPlane],
  );

  // Release: hand momentum back to the physics solver.
  const release = useCallback(() => {
    const s = dragRef.current;
    if (!s.body) return;
    const body = s.body;
    s.body = null;

    body.setBodyType(RigidBodyType.Dynamic, true);
    // Throw: clamp so a flick can't launch a body through the walls.
    const v = s.velocity;
    const max = 14;
    if (v.lengthSq() > max * max) v.setLength(max);
    body.setLinvel({ x: v.x, y: v.y, z: 0 }, true);
    body.setAngvel(
      { x: (Math.random() - 0.5) * 4, y: (Math.random() - 0.5) * 4, z: (Math.random() - 0.5) * 4 },
      true,
    );
  }, [dragRef]);

  // Window-level move/up listeners while dragging so the grab survives the
  // pointer leaving the canvas, and so we can scope touch-action precisely.
  useEffect(() => {
    const el = gl.domElement;

    const onMove = (e: PointerEvent) => {
      const s = dragRef.current;
      if (!s.body) return;
      // While a drag is live, this move belongs to us — don't let the page
      // scroll. We only suppress default during an active grab, so normal
      // vertical scrolling over the arena is untouched.
      if (e.cancelable) e.preventDefault();
      projectPointer(e.clientX, e.clientY, s.target);
    };

    const onUp = (e: PointerEvent) => {
      if (!dragRef.current.body) return;
      // Restore page scrolling for subsequent touches.
      el.style.touchAction = 'pan-y';
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* capture may not be held; ignore */
      }
      release();
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [gl, dragRef, projectPointer, release]);

  // Drive the grabbed body each physics-relevant frame + track velocity.
  useFrame((_, delta) => {
    if (!activeRef.current) return;
    const s = dragRef.current;
    if (!s.body) return;

    s.body.setNextKinematicTranslation({ x: s.target.x, y: s.target.y, z: 0 });

    // Estimate throw velocity from how fast the target is moving.
    const dt = Math.max(delta, 1 / 120);
    s.velocity.copy(s.target).sub(s.prev).divideScalar(dt);
    s.prev.copy(s.target);
    s.lastT += dt;
  });

  return null;
}

/* -------------------------------------------------------------------------- */
/*  Visibility + tab controller — pauses BOTH the R3F frameloop and the        */
/*  Rapier world when offscreen / hidden → 0ms idle, no WASM stepping.         */
/* -------------------------------------------------------------------------- */

function VisibilityController({
  targetRef,
  activeRef,
  setPaused,
}: {
  targetRef: React.RefObject<HTMLElement | null>;
  activeRef: React.RefObject<boolean>;
  setPaused: (paused: boolean) => void;
}) {
  const setFrameloop = useThree((s) => s.setFrameloop);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    let isVisible = true;
    // Start ASSUMING on-screen. The IntersectionObserver below corrects this on
    // its first callback. Starting "off" risked freezing a white buffer before
    // the first paint if the observer fired late — the physics white-box bug.
    let onScreen = true;

    const apply = () => {
      const on = isVisible && onScreen;
      activeRef.current = on;
      setFrameloop(on ? 'always' : 'never');
      setPaused(!on);
      // When we go idle, render ONE last frame synchronously so the frozen
      // buffer shows the dark slab (never an uninitialized white canvas).
      if (!on) {
        try {
          gl.render(scene, camera);
        } catch {
          /* context may be gone; ignore */
        }
      }
    };

    const onVisibility = () => {
      isVisible = !document.hidden;
      apply();
    };
    document.addEventListener('visibilitychange', onVisibility);

    let io: IntersectionObserver | null = null;
    const el = targetRef.current;
    if (el && 'IntersectionObserver' in window) {
      io = new IntersectionObserver(
        ([entry]) => {
          onScreen = entry.isIntersecting;
          apply();
        },
        { threshold: 0.05 },
      );
      io.observe(el);
    }

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      io?.disconnect();
      setFrameloop('always');
    };
  }, [targetRef, activeRef, setFrameloop, setPaused]);

  return null;
}

/* -------------------------------------------------------------------------- */
/*  World contents.                                                            */
/* -------------------------------------------------------------------------- */

function Scene({
  count,
  colors,
  shape,
  dragRef,
  activeRef,
  onGrab,
}: {
  count: number;
  colors: string[];
  shape: PhysicsShape;
  dragRef: React.RefObject<DragState>;
  activeRef: React.RefObject<boolean>;
  onGrab: (body: RapierRigidBody, event: ThreeEvent<PointerEvent>) => void;
}) {
  const geometry = useTokenGeometry(shape);

  // Stable spawn layout — staggered so they cascade rather than spawn-overlap.
  const tokens = useMemo(() => {
    const out: { key: number; color: string; position: [number, number, number] }[] = [];
    for (let i = 0; i < count; i++) {
      const col = i % 5;
      const row = Math.floor(i / 5);
      out.push({
        key: i,
        color: colors[i % colors.length],
        position: [
          (col - 2) * (R * 1.9) + (Math.random() - 0.5) * 0.2,
          ARENA.y - 0.4 + row * (R * 2.1),
          (Math.random() - 0.5) * ARENA.z * 0.8,
        ],
      });
    }
    return out;
  }, [count, colors]);

  return (
    <>
      {/*
        Canonical R3F clear: setting the scene background as a managed prop is
        far more reliable than an imperative gl.setClearColor() in onCreated,
        which R3F can reset on DPR / size / context changes. This guarantees the
        arena reads as a calm dark slab from frame 0 — the source of the
        "physics shows as a flat WHITE box" bug on real hardware was that the
        empty pre-WASM scene had no managed background and composited white.
      */}
      <color attach="background" args={['#101319']} />

      {/*
        A static dark backdrop quad BEHIND the arena. Belt-and-suspenders so that
        even on the very first frame (before any token mesh or the background
        clear is honored) there is real geometry painting dark pixels — never an
        uninitialized white buffer.
      */}
      <mesh position={[0, 0, -ARENA.z - 1.2]} frustumCulled={false}>
        <planeGeometry args={[40, 24]} />
        <meshBasicMaterial color="#101319" />
      </mesh>

      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 6, 4]} intensity={1.1} />
      <directionalLight position={[-4, 2, 2]} intensity={0.35} />

      <Arena />

      {tokens.map((t) => (
        <Token
          key={t.key}
          geometry={geometry}
          shape={shape}
          color={t.color}
          position={t.position}
          onGrab={onGrab}
        />
      ))}

      <DragController dragRef={dragRef} activeRef={activeRef} />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Public scene component (the dynamically-imported default).                 */
/* -------------------------------------------------------------------------- */

export type PhysicsSceneProps = {
  count: number;
  colors: string[];
  shape: PhysicsShape;
  gravity: number;
  dprCap: number;
};

export default function PhysicsPlaygroundScene({
  count,
  colors,
  shape,
  gravity,
  dprCap,
}: PhysicsSceneProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(true);
  const [paused, setPaused] = useState(false);

  // Resolve the effective body count once on mount (touch/small → capped).
  const [effectiveCount] = useState(() => {
    let n = Math.max(MIN_COUNT, Math.min(count, MAX_COUNT));
    if (typeof window !== 'undefined') {
      const coarse = window.matchMedia('(pointer: coarse)').matches;
      const narrow = window.innerWidth < 768;
      if (coarse || narrow) n = Math.min(n, MOBILE_COUNT_CAP);
    }
    return n;
  });

  // Shared drag state — one allocation, lives for the component's life.
  const dragRef = useRef<DragState>({
    body: null,
    target: new THREE.Vector3(),
    prev: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    lastT: 0,
  });

  // Grab handler shared by every token. Set up the kinematic follow.
  const handleGrab = useCallback(
    (body: RapierRigidBody, event: ThreeEvent<PointerEvent>) => {
      const s = dragRef.current;
      if (s.body) return; // already dragging something

      s.body = body;
      // Seed the target/prev from the body's current world position so the
      // first frame doesn't snap or report a huge bogus velocity.
      const p = body.translation();
      s.target.set(p.x, p.y, 0);
      s.prev.copy(s.target);
      s.velocity.set(0, 0, 0);
      s.lastT = 0;

      // Become a kinematic body we can position directly.
      body.setBodyType(RigidBodyType.KinematicPositionBased, true);

      // Scope touch-action to the active drag only: lock page scroll now,
      // restored on pointer-up. Keeps casual vertical scrolling over the arena
      // working when the user isn't grabbing a token.
      const canvas = event.nativeEvent.target;
      if (canvas instanceof HTMLCanvasElement) {
        canvas.style.touchAction = 'none';
        try {
          canvas.setPointerCapture(event.nativeEvent.pointerId);
        } catch {
          /* not all pointers support capture; safe to ignore */
        }
      }
      event.stopPropagation();
    },
    [],
  );

  return (
    <div ref={wrapperRef} style={{ position: 'absolute', inset: 0 }}>
      <Canvas
        // Frame the arena slab. Slight downward look for depth.
        camera={{ position: [0, 0.4, 8.5], fov: 42, near: 0.1, far: 50 }}
        dpr={[1, dprCap]}
        frameloop="always"
        gl={{
          antialias: true,
          // Opaque canvas with a dark clear. The arena must NEVER flash white:
          // before the Rapier WASM finishes loading (so before any token mesh
          // exists) the scene is empty, and an alpha/transparent canvas can
          // composite as white during that window on some setups. A solid dark
          // clear that matches the stage guarantees the arena reads as a calm
          // dark slab from frame 0, with the tokens appearing on top once ready.
          alpha: false,
          powerPreference: 'high-performance',
          stencil: false,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color('#101319'), 1);
        }}
      >
        <VisibilityController
          targetRef={wrapperRef}
          activeRef={activeRef}
          setPaused={setPaused}
        />

        {/*
          updateLoop "follow" (default): Rapier steps inside R3F's useFrame, so
          pausing the frameloop also halts physics. We ALSO pass `paused` so the
          world is explicitly frozen — belt and suspenders for 0ms idle.
          timeStep "vary" keeps the sim stable across variable frame deltas.
        */}
        <Physics
          gravity={[0, gravity, 0]}
          timeStep="vary"
          paused={paused}
          interpolate
        >
          <Scene
            count={effectiveCount}
            colors={colors}
            shape={shape}
            dragRef={dragRef}
            activeRef={activeRef}
            onGrab={handleGrab}
          />
        </Physics>
      </Canvas>
    </div>
  );
}
