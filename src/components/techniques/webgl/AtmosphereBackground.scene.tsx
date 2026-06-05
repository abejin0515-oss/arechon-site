'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/* -------------------------------------------------------------------------- */
/*  Shaders                                                                    */
/* -------------------------------------------------------------------------- */

const vertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    // Fullscreen quad — position is already clip-space, no camera math.
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/**
 * 2D simplex noise (Ashima / Stefan Gustavson, public domain).
 * Branchless, texture-free, ~a handful of noise evaluations per pixel.
 */
const fragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform float uTime;
  uniform vec2  uResolution;
  uniform vec3  uColorA;
  uniform vec3  uColorB;
  uniform vec3  uColorC;
  uniform float uGrain;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                       -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                   + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
                            dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  // Two octaves of fbm — enough for a soft atmosphere, still cheap.
  float fbm(vec2 p) {
    float v = 0.0;
    v += 0.60 * snoise(p);
    v += 0.30 * snoise(p * 2.03 + 11.7);
    return v;
  }

  // Cheap hash for film grain, breaks up gradient banding.
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    vec2 uv = vUv;

    // Aspect-correct sampling coords so the field is not stretched on wide screens.
    vec2 p = uv;
    p.x *= uResolution.x / uResolution.y;

    float t = uTime * 0.05;

    // Slow drifting domain warp — the "breathing" atmosphere.
    vec2 q = vec2(
      fbm(p * 1.2 + vec2(0.0, t)),
      fbm(p * 1.2 + vec2(5.2, -t))
    );
    float n = fbm(p * 1.5 + q * 0.6 + vec2(t * 0.5, 0.0));
    n = n * 0.5 + 0.5; // -> 0..1

    // Vertical gradient base so it reads as "sky/atmosphere", not flat noise.
    float grad = smoothstep(0.0, 1.0, uv.y);

    // Three-stop blend driven by noise + gradient.
    vec3 col = mix(uColorA, uColorB, smoothstep(0.2, 0.8, n));
    col = mix(col, uColorC, smoothstep(0.35, 1.0, grad) * 0.6);

    // Subtle vignette for depth.
    float vig = smoothstep(1.25, 0.35, length(uv - 0.5));
    col *= mix(0.92, 1.0, vig);

    // Grain to kill banding on dark gradients.
    float g = (hash(gl_FragCoord.xy + uTime) - 0.5) * uGrain;
    col += g;

    gl_FragColor = vec4(col, 1.0);
  }
`;

/* -------------------------------------------------------------------------- */
/*  Plane                                                                       */
/* -------------------------------------------------------------------------- */

type PlaneProps = {
  colors: [string, string, string];
  speed: number;
  grain: number;
  /** Shared flag — when false useFrame early-returns (offscreen / hidden). */
  activeRef: React.RefObject<boolean>;
};

function AtmospherePlane({ colors, speed, grain, activeRef }: PlaneProps) {
  const { size } = useThree();

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uColorA: { value: new THREE.Color(colors[0]) },
      uColorB: { value: new THREE.Color(colors[1]) },
      uColorC: { value: new THREE.Color(colors[2]) },
      uGrain: { value: grain },
    }),
    // Colors/grain are pushed imperatively below so we never rebuild the
    // material (which would recompile the GPU program). Intentionally [].
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Keep resolution uniform in sync with the drawing buffer size.
  useEffect(() => {
    uniforms.uResolution.value.set(size.width, size.height);
  }, [size.width, size.height, uniforms]);

  // Push prop changes without recreating the material.
  useEffect(() => {
    uniforms.uColorA.value.set(colors[0]);
    uniforms.uColorB.value.set(colors[1]);
    uniforms.uColorC.value.set(colors[2]);
    uniforms.uGrain.value = grain;
  }, [colors, grain, uniforms]);

  useFrame((_, delta) => {
    if (!activeRef.current) return;
    // Clamp delta so a backgrounded tab returning doesn't jump the animation.
    uniforms.uTime.value += Math.min(delta, 1 / 30) * speed;
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
/*  Visibility controller — pauses the frameloop offscreen / tab-hidden        */
/* -------------------------------------------------------------------------- */

function VisibilityController({
  targetRef,
  activeRef,
}: {
  targetRef: React.RefObject<HTMLElement | null>;
  activeRef: React.RefObject<boolean>;
}) {
  const setFrameloop = useThree((s) => s.setFrameloop);

  useEffect(() => {
    let frameloop: 'always' | 'never' = 'always';
    const setActive = (on: boolean) => {
      activeRef.current = on;
      const next: 'always' | 'never' = on ? 'always' : 'never';
      if (frameloop !== next) {
        frameloop = next;
        // On-demand frameloop: a paused background costs zero GPU.
        setFrameloop(next);
      }
    };

    const onVisibility = () => setActive(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);

    let io: IntersectionObserver | null = null;
    const el = targetRef.current;
    if (el && 'IntersectionObserver' in window) {
      io = new IntersectionObserver(
        ([entry]) => setActive(entry.isIntersecting && !document.hidden),
        { threshold: 0 },
      );
      io.observe(el);
    }

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      io?.disconnect();
      setFrameloop('always');
    };
  }, [targetRef, activeRef, setFrameloop]);

  return null;
}

/* -------------------------------------------------------------------------- */
/*  Scene (Canvas)                                                              */
/* -------------------------------------------------------------------------- */

export type AtmosphereSceneProps = {
  colors: [string, string, string];
  speed: number;
  grain: number;
  dprCap: number;
};

export default function AtmosphereScene({
  colors,
  speed,
  grain,
  dprCap,
}: AtmosphereSceneProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(true);
  // If the GPU context is ever lost (driver reset, GPU blocklist, tab eviction),
  // unmount the Canvas so the dark CSS poster on the parent wrapper takes over —
  // never a frozen or blank-white canvas.
  const [contextLost, setContextLost] = useState(false);

  if (contextLost) return null; // poster (parent wrapper background) is the fallback

  return (
    <div ref={wrapperRef} aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>
      <Canvas
        // alpha:true is a SAFETY NET, not a style choice. The fullscreen shader
        // writes opaque pixels (alpha 1.0) whenever it actually renders, so a
        // working atmosphere looks identical. But if the WebGL probe passes yet
        // the GPU never paints (headless, SwiftShader, flaky drivers), a
        // transparent canvas lets the dark poster behind show through — the page
        // is NEVER left white with invisible light text.
        gl={{
          antialias: false,
          alpha: true,
          depth: false,
          stencil: false,
          powerPreference: 'low-power',
        }}
        dpr={[1, dprCap]}
        frameloop="always"
        onCreated={({ gl }) => {
          // Transparent clear (alpha 0) so any un-drawn frame reveals the poster.
          gl.setClearColor(new THREE.Color(colors[0]), 0);
          gl.domElement.addEventListener(
            'webglcontextlost',
            (e) => {
              e.preventDefault(); // permit a restore attempt; meanwhile fall back
              setContextLost(true);
            },
            { once: true },
          );
        }}
      >
        <VisibilityController targetRef={wrapperRef} activeRef={activeRef} />
        <AtmospherePlane colors={colors} speed={speed} grain={grain} activeRef={activeRef} />
      </Canvas>
    </div>
  );
}
