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

/* (a) DISTORTION / FLOW
 * ─────────────────────
 * The photo is a texture on a fullscreen plane; its UVs are warped by a flowing
 * value-noise field whose amplitude tracks motion velocity (cursor speed or
 * scroll). A restrained RGB split rides the same velocity. At rest it relaxes
 * back to the clean graded photo. */

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
  uniform float uVelocity;   // smoothed 0..1
  uniform vec2  uPointer;    // -0.5..0.5
  uniform float uIntensity;
  uniform float uVignette;   // 0..1 grade vignette strength (per-photo)

  ${GRADE_GLSL}

  // --- 2D value noise (cheap, smooth) ---
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y);
  }

  vec2 coverUv(vec2 uv) { return (uv - 0.5) * uImageScale + 0.5; }

  void main() {
    vec2 uv = coverUv(vUv);
    float v = clamp(uVelocity, 0.0, 1.0) * uIntensity;

    // --- Flow field: two scrolling noise layers form a curl-like warp ---
    float t = uTime * 0.25;
    vec2 q = uv * 3.0;
    float n1 = noise(q + vec2(t, -t * 0.7));
    float n2 = noise(q * 1.7 - vec2(t * 0.8, t));
    // base idle breathing + velocity-driven push
    vec2 flow = vec2(n1 - 0.5, n2 - 0.5);
    float amp = (0.004 + 0.05 * v);
    vec2 warpUv = uv + flow * amp;

    // --- Pointer lens: soft local pull toward the cursor ---
    vec2 toP = uv - (uPointer + 0.5);
    float d = length(toP);
    float lens = smoothstep(0.4, 0.0, d) * 0.025 * uIntensity;
    warpUv -= normalize(toP + 1e-5) * lens;

    // --- Restrained RGB split, scaled by velocity ---
    float shift = (0.0015 + 0.006 * v) * uIntensity;
    vec2 dir = normalize(flow + 1e-5);
    float r = texture2D(uTexture, warpUv + dir * shift).r;
    float g = texture2D(uTexture, warpUv).g;
    float b = texture2D(uTexture, warpUv - dir * shift).b;
    vec3 col = vec3(r, g, b);

    // cropped-edge guard
    vec2 edge = step(0.0, warpUv) * step(warpUv, vec2(1.0));
    col *= edge.x * edge.y;

    col = grade(col, vUv, uTime, uVignette);
    gl_FragColor = vec4(col, 1.0);
  }
`;

function Plane({
  texture,
  imageAspect,
  intensity,
  vignette,
  velocityRef,
  pointerRef,
  onFirstFrame,
}: {
  texture: THREE.Texture;
  imageAspect: number;
  intensity: number;
  vignette: number;
  velocityRef: React.RefObject<number>;
  pointerRef: React.RefObject<Pointer>;
  onFirstFrame: () => void;
}) {
  const { size } = useThree();
  const painted = useRef(false);
  const smoothVel = useRef(0);

  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uImageScale: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uVelocity: { value: 0 },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uIntensity: { value: intensity },
      uVignette: { value: vignette },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    uniforms.uTexture.value = texture;
    uniforms.uIntensity.value = intensity;
    uniforms.uVignette.value = vignette;
  }, [texture, intensity, vignette, uniforms]);

  useEffect(() => {
    coverScale(size.width / size.height, imageAspect, uniforms.uImageScale.value);
  }, [size.width, size.height, imageAspect, uniforms]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30);
    uniforms.uTime.value += dt;
    const k = 1 - Math.exp(-8 * dt);
    smoothVel.current += ((velocityRef.current ?? 0) - smoothVel.current) * k;
    uniforms.uVelocity.value = smoothVel.current;
    const p = pointerRef.current;
    uniforms.uPointer.value.set(p.x, p.y);
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
  vignette,
  velocityRef,
  pointerRef,
  onReady,
}: {
  src: string;
  intensity: number;
  vignette: number;
  velocityRef: React.RefObject<number>;
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
      vignette={vignette}
      velocityRef={velocityRef}
      pointerRef={pointerRef}
      onFirstFrame={onReady}
    />
  );
}

export type SceneProps = {
  src: string;
  intensity?: number;
  /** grade vignette strength 0..1 — lower for dark subjects so they don't crush */
  vignette?: number;
  dprCap?: number;
  externalVelocityRef?: React.RefObject<number>;
  onReady?: () => void;
};

export default function DistortionScene({
  src,
  intensity = 1,
  vignette = 1,
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
          vignette={vignette}
          velocityRef={velocityRef}
          pointerRef={pointerRef}
          onReady={onReady ?? (() => {})}
        />
      </Canvas>
    </div>
  );
}
