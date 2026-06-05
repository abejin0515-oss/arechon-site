'use client';

import { useEffect, useMemo, useReducer, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/* -------------------------------------------------------------------------- */
/*  Shaders                                                                    */
/* -------------------------------------------------------------------------- */

const vertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/**
 * Subtle ripple + velocity-driven RGB split.
 *  - uVelocity (0..~1, smoothed) drives both the ripple amplitude and the
 *    chromatic-aberration offset so the effect only appears with motion.
 *  - uPointer adds a soft local lens around the cursor.
 *  - Image is "cover"-fitted via uImageScale to avoid stretch.
 */
const fragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform sampler2D uTexture;
  uniform vec2  uImageScale;   // cover-fit scale
  uniform float uTime;
  uniform float uVelocity;     // smoothed 0..1
  uniform vec2  uPointer;      // -0.5..0.5 in plane space, 0,0 = center
  uniform float uIntensity;

  // cover-fit: keep aspect, crop overflow, centered.
  vec2 coverUv(vec2 uv) {
    return (uv - 0.5) * uImageScale + 0.5;
  }

  void main() {
    vec2 uv = coverUv(vUv);

    float v = clamp(uVelocity, 0.0, 1.0) * uIntensity;

    // --- Ripple: a couple of travelling sine waves, amplitude ~ velocity ---
    float wave =
        sin(uv.y * 18.0 + uTime * 2.0) * 0.5 +
        sin(uv.x * 14.0 - uTime * 1.6) * 0.5;
    vec2 ripple = vec2(wave) * 0.006 * v;

    // --- Pointer lens: soft local displacement toward the cursor ---
    vec2 toPointer = uv - (uPointer + 0.5);
    float d = length(toPointer);
    float lens = smoothstep(0.35, 0.0, d) * 0.02 * uIntensity;
    vec2 pointerOffset = normalize(toPointer + 1e-5) * lens;

    vec2 baseUv = uv + ripple + pointerOffset;

    // --- RGB split: scale separation with velocity ---
    float shift = (0.004 + 0.012 * v) * uIntensity;
    vec2 dir = vec2(1.0, 0.0);

    float r = texture2D(uTexture, baseUv + dir * shift).r;
    float g = texture2D(uTexture, baseUv).g;
    float b = texture2D(uTexture, baseUv - dir * shift).b;

    vec3 col = vec3(r, g, b);

    // Guard the cropped edges so cover-fit overflow reads as black, not smear.
    vec2 edge = step(0.0, baseUv) * step(baseUv, vec2(1.0));
    col *= edge.x * edge.y;

    gl_FragColor = vec4(col, 1.0);
  }
`;

/* -------------------------------------------------------------------------- */
/*  Plane                                                                       */
/* -------------------------------------------------------------------------- */

type PlaneProps = {
  texture: THREE.Texture;
  imageAspect: number;
  intensity: number;
  velocityRef: React.RefObject<number>;
  pointerRef: React.RefObject<{ x: number; y: number }>;
};

function DistortionPlane({
  texture,
  imageAspect,
  intensity,
  velocityRef,
  pointerRef,
  onFirstFrame,
}: PlaneProps & { onFirstFrame?: () => void }) {
  const { size } = useThree();
  const painted = useRef(false);

  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uImageScale: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uVelocity: { value: 0 },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uIntensity: { value: intensity },
    }),
    // texture/intensity pushed imperatively below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    uniforms.uTexture.value = texture;
    uniforms.uIntensity.value = intensity;
  }, [texture, intensity, uniforms]);

  // Recompute cover-fit scale on resize.
  useEffect(() => {
    const containerAspect = size.width / size.height;
    let sx = 1;
    let sy = 1;
    if (containerAspect > imageAspect) {
      // container wider than image -> crop top/bottom
      sy = imageAspect / containerAspect;
    } else {
      // container taller -> crop sides
      sx = containerAspect / imageAspect;
    }
    uniforms.uImageScale.value.set(sx, sy);
  }, [size.width, size.height, imageAspect, uniforms]);

  // Smoothed velocity so the effect eases out instead of snapping.
  const smoothVel = useRef(0);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30);
    uniforms.uTime.value += dt;

    const target = velocityRef.current ?? 0;
    // Exponential approach, frame-rate independent.
    const k = 1 - Math.exp(-8 * dt);
    smoothVel.current += (target - smoothVel.current) * k;
    uniforms.uVelocity.value = smoothVel.current;

    const p = pointerRef.current;
    if (p) uniforms.uPointer.value.set(p.x, p.y);

    // Signal "the plane has actually rendered a textured frame" exactly once,
    // AFTER the first real draw. The wrapper only fades its poster <img> out on
    // this signal — so if the GL never paints (driver/shader trouble), the
    // poster stays up and the hero is never a black box.
    if (!painted.current) {
      painted.current = true;
      onFirstFrame?.();
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

/* -------------------------------------------------------------------------- */
/*  Texture loader (imperative, fully disposed)                                */
/* -------------------------------------------------------------------------- */

function TextureGate({
  src,
  intensity,
  velocityRef,
  pointerRef,
  onReady,
}: {
  src: string;
  intensity: number;
  velocityRef: React.RefObject<number>;
  pointerRef: React.RefObject<{ x: number; y: number }>;
  onReady: () => void;
}) {
  const { gl, invalidate } = useThree();
  const texRef = useRef<THREE.Texture | null>(null);
  const aspectRef = useRef(1);
  const [, force] = useReducerTick();

  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';
    loader.load(
      src,
      (tex) => {
        if (cancelled) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        // Anisotropy helps the cover-crop edges stay crisp under distortion.
        tex.anisotropy = Math.min(4, gl.capabilities.getMaxAnisotropy());
        const img = tex.image as HTMLImageElement;
        // SVGs can report 0 for naturalWidth on some engines; fall back to the
        // declared viewBox aspect (16:9) so the cover-fit never divides by zero.
        const w = img.naturalWidth || img.width || 0;
        const h = img.naturalHeight || img.height || 0;
        aspectRef.current = w && h ? w / h : 16 / 9;
        tex.needsUpdate = true;
        texRef.current = tex;
        // NOTE: do NOT call onReady() here. The poster must only fade once the
        // shader has drawn a real frame (see DistortionPlane.onFirstFrame).
        force();
        invalidate();
      },
      undefined,
      () => {
        // Swallow load errors — the wrapper keeps showing the <img> poster.
      },
    );

    return () => {
      cancelled = true;
      texRef.current?.dispose();
      texRef.current = null;
    };
  }, [src, gl, onReady, invalidate, force]);

  if (!texRef.current) return null;

  return (
    <DistortionPlane
      texture={texRef.current}
      imageAspect={aspectRef.current}
      intensity={intensity}
      velocityRef={velocityRef}
      pointerRef={pointerRef}
      onFirstFrame={onReady}
    />
  );
}

/* tiny re-render trigger so the plane mounts once the texture resolves */
function useReducerTick(): [number, () => void] {
  const [n, dispatch] = useReducer((x: number) => x + 1, 0);
  return [n, () => dispatch()];
}

/* -------------------------------------------------------------------------- */
/*  Pointer + visibility wiring                                                 */
/* -------------------------------------------------------------------------- */

function InteractionController({
  wrapperRef,
  velocityRef,
  pointerRef,
  externalVelocityRef,
}: {
  wrapperRef: React.RefObject<HTMLElement | null>;
  velocityRef: React.RefObject<number>;
  pointerRef: React.RefObject<{ x: number; y: number }>;
  externalVelocityRef?: React.RefObject<number>;
}) {
  const setFrameloop = useThree((s) => s.setFrameloop);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    let last = { x: 0, y: 0, t: performance.now() };
    let pointerVel = 0;

    const onPointerMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = -((e.clientY - rect.top) / rect.height - 0.5);
      pointerRef.current = { x, y };

      const now = performance.now();
      const dt = Math.max(16, now - last.t);
      const dx = x - last.x;
      const dy = y - last.y;
      const speed = Math.sqrt(dx * dx + dy * dy) / (dt / 1000);
      // Normalise: a brisk flick ~ 3-4 units/s -> clamp to 1.
      pointerVel = Math.min(1, speed * 0.35);
      last = { x, y, t: now };
      invalidate();
    };

    const onLeave = () => {
      pointerVel = 0;
    };

    el.addEventListener('pointermove', onPointerMove, { passive: true });
    el.addEventListener('pointerleave', onLeave, { passive: true });

    // Merge pointer velocity with any externally supplied scroll velocity.
    let raf = 0;
    const tick = () => {
      const ext = externalVelocityRef?.current ?? 0;
      velocityRef.current = Math.max(pointerVel, Math.min(1, ext));
      // Bleed pointer velocity so a still cursor decays to rest.
      pointerVel *= 0.9;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // Pause GPU when the hero scrolls offscreen / tab hidden.
    let frameloop: 'always' | 'never' = 'always';
    const setActive = (on: boolean) => {
      const next: 'always' | 'never' = on ? 'always' : 'never';
      if (frameloop !== next) {
        frameloop = next;
        setFrameloop(next);
      }
    };
    const onVisibility = () => setActive(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);

    let io: IntersectionObserver | null = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(
        ([entry]) => setActive(entry.isIntersecting && !document.hidden),
        { threshold: 0 },
      );
      io.observe(el);
    }

    return () => {
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      io?.disconnect();
      cancelAnimationFrame(raf);
      setFrameloop('always');
    };
  }, [wrapperRef, velocityRef, pointerRef, externalVelocityRef, setFrameloop, invalidate]);

  return null;
}

/* -------------------------------------------------------------------------- */
/*  Scene                                                                       */
/* -------------------------------------------------------------------------- */

export type DistortionSceneProps = {
  src: string;
  intensity: number;
  dprCap: number;
  /** Optional external scroll-velocity ref (0..1). */
  externalVelocityRef?: React.RefObject<number>;
  onReady?: () => void;
};

export default function DistortionScene({
  src,
  intensity,
  dprCap,
  externalVelocityRef,
  onReady,
}: DistortionSceneProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const velocityRef = useRef(0);
  const pointerRef = useRef({ x: 0, y: 0 });

  return (
    <div ref={wrapperRef} style={{ position: 'absolute', inset: 0 }}>
      <Canvas
        gl={{
          antialias: false,
          alpha: true,
          depth: false,
          stencil: false,
          powerPreference: 'high-performance',
        }}
        dpr={[1, dprCap]}
        frameloop="always"
      >
        <InteractionController
          wrapperRef={wrapperRef}
          velocityRef={velocityRef}
          pointerRef={pointerRef}
          externalVelocityRef={externalVelocityRef}
        />
        <TextureGate
          src={src}
          intensity={intensity}
          velocityRef={velocityRef}
          pointerRef={pointerRef}
          onReady={onReady ?? (() => {})}
        />
      </Canvas>
    </div>
  );
}
