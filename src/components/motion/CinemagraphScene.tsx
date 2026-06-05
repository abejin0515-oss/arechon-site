'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GRADE_GLSL } from './grade.glsl';
import {
  InteractionController,
  coverScale,
  useImageTexture,
  type Pointer,
} from './sceneShared';

/* (c) CINEMAGRAPH / PARTIAL MOTION
 * ────────────────────────────────
 * The photo is STATIC. Exactly one thing moves: a soft light sweep that travels
 * across the frame on a slow loop, plus fine dust motes drifting through it. The
 * motes only catch light inside the sweep band, so the eye is drawn to the one
 * living detail against an otherwise still image. Cursor gently biases the sweep
 * position; otherwise it is autonomous (the contrast of still vs. one-point-moving
 * is the whole point — it must read even with no input). */

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform sampler2D uTexture;
  uniform vec2  uImageScale;
  uniform float uTime;
  uniform float uSweep;     // 0..1 sweep center, animated
  uniform float uIntensity;

  ${GRADE_GLSL}

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 345.45));
    p += dot(p, p + 34.345);
    return fract(p.x * p.y);
  }

  vec2 coverUv(vec2 uv) { return (uv - 0.5) * uImageScale + 0.5; }

  // Dust layer: scattered soft points drifting upward, parallax in 2 sheets.
  float dust(vec2 uv, float t, float scale, float speed) {
    vec2 g = uv * scale;
    g.y += t * speed;            // drift up
    g.x += sin(t * 0.3 + uv.y * 6.0) * 0.15; // gentle lateral wander
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    float r = hash21(id);
    // only some cells hold a mote
    float present = step(0.82, r);
    float dd = length(f);
    float mote = smoothstep(0.18, 0.0, dd) * present;
    return mote;
  }

  void main() {
    vec2 uv = coverUv(vUv);
    vec3 photo = texture2D(uTexture, uv).rgb;
    vec3 col = photo;

    // --- Light sweep: a soft vertical band of brightening that travels x ---
    float band = smoothstep(0.16, 0.0, abs(vUv.x - uSweep));
    // Highlight only where the photo already has some luminance (looks like real
    // light catching grains, not a flat overlay).
    float lum = dot(photo, vec3(0.299, 0.587, 0.114));
    float lit = band * smoothstep(0.15, 0.7, lum) * 0.5 * uIntensity;
    col += lit;

    // --- Dust: two sheets, only visible where the sweep lights them ---
    float t = uTime;
    float dustA = dust(vUv + vec2(0.0, 0.0), t, 22.0, 0.012);
    float dustB = dust(vUv + vec2(3.7, 1.1), t * 0.8, 34.0, 0.018);
    float motes = dustA * 0.9 + dustB * 0.6;
    // motes glow inside the sweep band, faint outside
    float moteLight = motes * (0.12 + 0.9 * band) * uIntensity;
    col += vec3(1.0, 0.97, 0.9) * moteLight;

    col = grade(col, vUv, uTime, 1.0);
    gl_FragColor = vec4(col, 1.0);
  }
`;

function Plane({
  texture,
  imageAspect,
  intensity,
  pointerRef,
  onFirstFrame,
}: {
  texture: THREE.Texture;
  imageAspect: number;
  intensity: number;
  pointerRef: React.RefObject<Pointer>;
  onFirstFrame: () => void;
}) {
  const { size } = useThree();
  const painted = useRef(false);
  const sweep = useRef(0.5);
  // Opt-in test telemetry (?motiontest=1 only). Lets headless CI confirm the
  // autonomous loop is live even when SwiftShader won't re-composite the WebGL
  // layer for a screenshot diff. No-op for real users.
  const testHook = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    testHook.current = new URLSearchParams(window.location.search).has('motiontest');
  }, []);

  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uImageScale: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uSweep: { value: 0.5 },
      uIntensity: { value: intensity },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    uniforms.uTexture.value = texture;
    uniforms.uIntensity.value = intensity;
  }, [texture, intensity, uniforms]);

  useEffect(() => {
    coverScale(size.width / size.height, imageAspect, uniforms.uImageScale.value);
  }, [size.width, size.height, imageAspect, uniforms]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30);
    uniforms.uTime.value += dt;

    // Autonomous sweep: a slow eased back-and-forth across the frame.
    const t = state.clock.elapsedTime;
    const base = 0.5 + 0.42 * Math.sin(t * 0.45);
    // Cursor nudges the sweep toward the pointer (subtle).
    const target = base + pointerRef.current.x * 0.25;
    sweep.current += (target - sweep.current) * (1 - Math.exp(-5 * dt));
    uniforms.uSweep.value = Math.min(1, Math.max(0, sweep.current));

    if (testHook.current) {
      const w = window as unknown as { __motion?: Record<string, number> };
      w.__motion = w.__motion || {};
      w.__motion.cinemagraphFrames = (w.__motion.cinemagraphFrames || 0) + 1;
      w.__motion.cinemagraphSweep = uniforms.uSweep.value;
    }

    if (!painted.current) {
      painted.current = true;
      onFirstFrame();
    }
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

function Gate({
  src,
  intensity,
  pointerRef,
  onReady,
}: {
  src: string;
  intensity: number;
  pointerRef: React.RefObject<Pointer>;
  onReady: () => void;
}) {
  const loaded = useImageTexture(src);
  if (!loaded) return null;
  return (
    <Plane
      texture={loaded.texture}
      imageAspect={loaded.aspect}
      intensity={intensity}
      pointerRef={pointerRef}
      onFirstFrame={onReady}
    />
  );
}

export type SceneProps = {
  src: string;
  intensity?: number;
  dprCap?: number;
  externalVelocityRef?: React.RefObject<number>;
  onReady?: () => void;
};

export default function CinemagraphScene({
  src,
  intensity = 1,
  dprCap = 2,
  externalVelocityRef,
  onReady,
}: SceneProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const velocityRef = useRef(0);
  const pointerRef = useRef<Pointer>({ x: 0, y: 0 });

  return (
    <div ref={wrapperRef} style={{ position: 'absolute', inset: 0 }}>
      <Canvas
        gl={{ antialias: false, alpha: true, depth: false, stencil: false, powerPreference: 'high-performance' }}
        dpr={[1, dprCap]}
        frameloop="always"
      >
        <InteractionController
          wrapperRef={wrapperRef}
          velocityRef={velocityRef}
          pointerRef={pointerRef}
          externalVelocityRef={externalVelocityRef}
        />
        <Gate
          src={src}
          intensity={intensity}
          pointerRef={pointerRef}
          onReady={onReady ?? (() => {})}
        />
      </Canvas>
    </div>
  );
}
