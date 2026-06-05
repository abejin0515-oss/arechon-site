'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Noise,
  Vignette,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';

/* ════════════════════════════════════════════════════════════════════════════
 * FieldHero.scene — bioluminescent fluid in dark water
 * ────────────────────────────────────────────────────────────────────────────
 * A material-free generative field. No photo, no model, no texture.
 *
 * TECHNIQUE: GPU flow-field particles (curl-noise advection).
 *   Tens of thousands of GL_POINTS whose world position is computed ENTIRELY in
 *   the vertex shader from a stable per-particle seed + uTime, advected along an
 *   analytic curl-noise velocity field (divergence-free → reads like fluid, not
 *   drifting dust). There is no FBO ping-pong / GPGPU simulation — position is a
 *   pure function of (seed, time, cursor-wake). That makes it bulletproof on
 *   software renderers (SwiftShader) where multi-target float FBOs are fragile,
 *   while still looking like a stirred medium.
 *
 *   The cursor (and scroll velocity) injects VORTICITY: a small ring buffer of
 *   recent pointer samples is passed as uniforms, each with its own age. Each
 *   particle is pushed tangentially around every live sample (a curl/vortex
 *   kick) and flashes brighter the closer it is — so a luminous wake of
 *   filaments rises along the cursor path, propagates outward, and decays as the
 *   sample ages out. That propagate-and-decay is the one-wow.
 *
 * COLOR: a single accent — cold desaturated blue-white (~470–490nm), the actual
 *   emission band of marine bioluminescence. Bloom supplies richness, not a
 *   second hue. Additive blending on near-black.
 *
 * Performance: position is GPU-side, so the CPU per frame only writes ~8 wake
 *   uniforms. Fragment is a soft radial point sprite — cheap. Bloom is the main
 *   cost; mip-based KernelSize.SMALL/MEDIUM keeps it within budget. Frameloop
 *   pauses when the tab is hidden or the canvas scrolls offscreen.
 * ════════════════════════════════════════════════════════════════════════════ */

/* -------------------------------------------------------------------------- */
/*  Tuning surface (driven by quality tier from the parent)                    */
/* -------------------------------------------------------------------------- */

export type FieldSceneProps = {
  /** Particle count. Mobile/low tiers pass fewer. */
  count: number;
  /** Max device pixel ratio. */
  dprCap: number;
  /** Bloom intensity. Lower on mobile to protect the frame budget. */
  bloom: number;
  /** Bloom blur kernel size (0=very small .. 3=large). */
  bloomKernel: 0 | 1 | 2 | 3;
  /** Field self-motion multiplier. 0 → frozen field (reduced-motion-ish). */
  flow: number;
  /** Accent emission color (single accent — bioluminescent blue-white). */
  accent: string;
  /** Deep ground color (near-black ink). */
  ground: string;
  /** Slightly lifted ground for the depth gradient. */
  ground2: string;
};

/* Number of live cursor-wake samples kept on the GPU. */
const WAKE = 8;

/* -------------------------------------------------------------------------- */
/*  Shaders                                                                     */
/* -------------------------------------------------------------------------- */

const vertexShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uFlow;
  uniform vec2  uResolution;
  uniform float uPixelRatio;
  uniform float uSize;

  // Cursor wake ring buffer. xy = field-space pos, z = age (0=fresh..1=dead),
  // w = strength (driven by pointer/scroll speed).
  uniform vec4  uWake[${WAKE}];

  attribute vec3 aSeed;   // stable per-particle randomness
  attribute float aScale; // per-particle size variance

  varying float vGlow;    // 0..1 cursor-wake brightness handed to the fragment
  varying float vDim;     // 0..1 per-particle resting brightness (most are low)

  // ---- hash / value-ish noise (texture-free) -----------------------------
  vec3 hash33(vec3 p) {
    p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
             dot(p, vec3(269.5, 183.3, 246.1)),
             dot(p, vec3(113.5, 271.9, 124.6)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }

  float snoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(dot(hash33(i + vec3(0,0,0)), f - vec3(0,0,0)),
              dot(hash33(i + vec3(1,0,0)), f - vec3(1,0,0)), u.x),
          mix(dot(hash33(i + vec3(0,1,0)), f - vec3(0,1,0)),
              dot(hash33(i + vec3(1,1,0)), f - vec3(1,1,0)), u.x), u.y),
      mix(mix(dot(hash33(i + vec3(0,0,1)), f - vec3(0,0,1)),
              dot(hash33(i + vec3(1,0,1)), f - vec3(1,0,1)), u.x),
          mix(dot(hash33(i + vec3(0,1,1)), f - vec3(0,1,1)),
              dot(hash33(i + vec3(1,1,1)), f - vec3(1,1,1)), u.x), u.y),
      u.z);
  }

  // Curl of a noise potential → divergence-free (incompressible) flow.
  vec2 curl(vec3 p) {
    const float e = 0.18;
    float n1 = snoise(p + vec3(0.0, e, 0.0));
    float n2 = snoise(p - vec3(0.0, e, 0.0));
    float n3 = snoise(p + vec3(e, 0.0, 0.0));
    float n4 = snoise(p - vec3(e, 0.0, 0.0));
    float dx = (n1 - n2) / (2.0 * e);
    float dy = (n3 - n4) / (2.0 * e);
    return vec2(dx, -dy);
  }

  void main() {
    // Field space is roughly [-1,1] on the short axis, widened by aspect.
    float aspect = uResolution.x / max(uResolution.y, 1.0);

    // Base drifting home position from the seed. The field is spread WIDER than
    // the frame (1.35×) so the visible window holds only a sparse slice of the
    // medium — that openness is what reads as deep water rather than a dense
    // glowing ball pinned to screen-center.
    vec2 home = vec2(aSeed.x * 2.0 - 1.0, aSeed.y * 2.0 - 1.0);
    home.x *= aspect;
    home *= 1.35;

    float t = uTime * 0.08 * uFlow;

    // Advect along curl flow. Larger displacement so particles trace long
    // filaments through the medium instead of pooling.
    vec2 pos = home;
    for (int i = 0; i < 3; i++) {
      vec2 c = curl(vec3(pos * 0.9, t + aSeed.z * 6.2831));
      pos += c * 0.12 * uFlow;
    }

    // Slow vertical rise + gentle wrap so the field keeps living.
    pos.y += sin(t * 0.6 + aSeed.z * 6.2831) * 0.04 * uFlow;

    float glow = 0.0;

    // ---- cursor / scroll wake: vorticity injection + flash ----------------
    for (int i = 0; i < ${WAKE}; i++) {
      vec4 w = uWake[i];
      if (w.w <= 0.001) continue;
      vec2 d = pos - w.xy;
      float dist = length(d);
      float age = w.z;                 // 0 fresh .. 1 dead
      float life = 1.0 - age;
      // Spatial falloff of the vortex — tighter reach so the wake reads as a
      // luminous FILAMENT/swirl, not a fat glowing disc.
      float reach = 0.34;
      float f = exp(-dist * dist / (reach * reach));
      // Tangential push (swirl) — rotate the radial dir 90°, scaled by life.
      vec2 tangent = vec2(-d.y, d.x) / max(dist, 0.0001);
      pos += tangent * f * life * w.w * 0.22;
      // Slight outward shove so the wake propagates as it ages.
      pos += normalize(d + 1e-4) * f * age * w.w * 0.05;
      // Brightness flash, strongest fresh & near.
      glow += f * life * w.w;
    }

    glow = clamp(glow, 0.0, 1.6);
    vGlow = glow;

    // Per-particle resting brightness: a few bright motes among many faint ones
    // (cubed → heavily biased toward dim). This gives the dark water its sparse,
    // believable shimmer instead of a uniform glow.
    float r = fract(aSeed.x * 91.7 + aSeed.y * 13.3 + aSeed.z * 47.1);
    vDim = r * r * r;

    vec4 mv = modelViewMatrix * vec4(pos, 0.0, 1.0);
    gl_Position = projectionMatrix * mv;

    // Point size is in PIXELS. uSize is a small base (≈1.6px); aScale gives
    // variance; the wake makes lit particles a bit larger. A mild perspective
    // term keeps depth without exploding — clamped so no sprite ever covers a
    // large area (that is what washed the whole field to white before).
    float persp = clamp(2.0 / -mv.z, 0.4, 1.2);
    float size = uSize * aScale * (1.0 + glow * 1.4) * persp;
    gl_PointSize = clamp(size * uPixelRatio, 1.0, 9.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  uniform vec3  uAccent; // single accent — bioluminescent blue-white
  uniform float uBase;   // resting emission floor (kept low — dark at rest)

  varying float vGlow;
  varying float vDim;

  void main() {
    // Soft round sprite — tight core + a small halo for bloom to grab.
    vec2 uv = gl_PointCoord - 0.5;
    float r = length(uv);
    float core = smoothstep(0.5, 0.0, r);
    float halo = exp(-r * r * 9.0);
    float a = core * 0.6 + halo * 0.4;

    // ADDITIVE accumulation: tens of thousands of points overlap, so the resting
    // floor is scaled by the per-particle dim factor (most particles → near 0).
    // The field stays deep dark water; the cursor wake (vGlow) ignites the
    // bright luminous filaments that the bloom then makes glow.
    float rest = uBase * vDim;
    float energy = rest + vGlow * vGlow * 1.7; // square → wake dominates

    // Hot cores desaturate toward white (real bioluminescence blows out to white
    // at the core, blue in the surrounding glow).
    vec3 col = mix(uAccent, vec3(1.0), clamp(vGlow * 0.5, 0.0, 0.8));
    col *= energy;

    gl_FragColor = vec4(col * a, a);
    if (a < 0.004) discard;
  }
`;

/* -------------------------------------------------------------------------- */
/*  Backdrop — an opaque dark-ink fullscreen quad rendered BEHIND the points.  */
/*  Why not just clear to the ground color? Because the Canvas is alpha:true    */
/*  (the safety net so an un-painted frame reveals the poster). An opaque        */
/*  backdrop quad gives us a genuinely dark ground WHEN we paint, while leaving  */
/*  the clear at alpha 0 so a non-painting GPU still falls back to the poster.   */
/* -------------------------------------------------------------------------- */

const backdropVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0); // fullscreen clip-space quad
  }
`;

const backdropFrag = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform vec3 uGround;   // near-black ink
  uniform vec3 uGround2;  // a touch of depth
  uniform vec3 uAccent;   // single accent — for the faintest sunk glow

  void main() {
    // Vertical depth gradient + a faint off-center sunk accent bloom, so even
    // the resting ground reads as "deep water with a distant light", not a flat
    // black fill. Kept extremely subtle — the particles are the subject.
    float grad = smoothstep(0.0, 1.0, vUv.y);
    vec3 col = mix(uGround2, uGround, grad);
    float d = distance(vUv, vec2(0.42, 0.4));
    col += uAccent * (0.05 * exp(-d * d * 6.0));
    gl_FragColor = vec4(col, 1.0);
  }
`;

function Backdrop({ ground, ground2, accent }: { ground: string; ground2: string; accent: string }) {
  const uniforms = useMemo(
    () => ({
      uGround: { value: new THREE.Color(ground) },
      uGround2: { value: new THREE.Color(ground2) },
      uAccent: { value: new THREE.Color(accent) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  useEffect(() => {
    uniforms.uGround.value.set(ground);
    uniforms.uGround2.value.set(ground2);
    uniforms.uAccent.value.set(accent);
  }, [ground, ground2, accent, uniforms]);

  return (
    <mesh frustumCulled={false} renderOrder={-1}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={backdropVert}
        fragmentShader={backdropFrag}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

/* -------------------------------------------------------------------------- */
/*  Particle field                                                              */
/* -------------------------------------------------------------------------- */

type FieldProps = {
  count: number;
  flow: number;
  accent: string;
  activeRef: React.RefObject<boolean>;
  wakeRef: React.RefObject<THREE.Vector4[]>;
};

function ParticleField({ count, flow, accent, activeRef, wakeRef }: FieldProps) {
  const { size, viewport } = useThree();

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const seeds = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      seeds[i * 3 + 0] = Math.random();
      seeds[i * 3 + 1] = Math.random();
      seeds[i * 3 + 2] = Math.random();
      // Bias toward many small + a few large for a richer dynamic range.
      const r = Math.random();
      scales[i] = 0.5 + r * r * 2.2;
    }
    // gl_Position is computed from aSeed; position attr is just a placeholder so
    // three has something to count vertices from.
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
    g.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    return g;
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uFlow: { value: flow },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uPixelRatio: { value: 1 },
      uSize: { value: 1.7 },
      uAccent: { value: new THREE.Color(accent) },
      // Resting floor: kept low so the field reads as DEEP DARK WATER at rest —
      // most particles are barely-there motes; the cursor wake is what ignites
      // the bright luminous filaments. (Higher → glowing haze, not dark water.)
      uBase: { value: 0.03 },
      uWake: { value: Array.from({ length: WAKE }, () => new THREE.Vector4(0, 0, 1, 0)) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Keep resolution / DPR / accent / flow in sync without rebuilding material.
  useEffect(() => {
    uniforms.uResolution.value.set(size.width, size.height);
    uniforms.uPixelRatio.value = viewport.dpr;
  }, [size.width, size.height, viewport.dpr, uniforms]);

  useEffect(() => {
    uniforms.uAccent.value.set(accent);
    uniforms.uFlow.value = flow;
  }, [accent, flow, uniforms]);

  useFrame((_, delta) => {
    if (!activeRef.current) return;
    const d = Math.min(delta, 1 / 30);
    uniforms.uTime.value += d;

    // Copy the CPU-side wake ring buffer into the uniform array.
    const wake = wakeRef.current;
    const arr = uniforms.uWake.value as THREE.Vector4[];
    for (let i = 0; i < WAKE; i++) {
      const src = wake[i];
      arr[i].copy(src);
    }
  });

  // Dispose GPU resources on unmount.
  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthTest={false}
        depthWrite={false}
        // Premultiplied additive (fragment already outputs col*a). Pure additive
        // (One/One) onto the OPAQUE dark ground → light accumulates as glow
        // without ever lifting alpha, so the ground stays ink-dark between
        // particles instead of washing to white.
        blending={THREE.CustomBlending}
        blendEquation={THREE.AddEquation}
        blendSrc={THREE.OneFactor}
        blendDst={THREE.OneFactor}
      />
    </points>
  );
}

/* -------------------------------------------------------------------------- */
/*  Pointer + scroll → wake ring buffer                                         */
/* -------------------------------------------------------------------------- */

/**
 * Owns the CPU-side wake state. Converts pointer/touch/scroll-velocity into a
 * ring of decaying field-space samples that the shader reads. Smoothing is
 * critical — abrupt jumps read as cheap; we ease the pointer and only emit a new
 * wake sample when it has moved enough, so filaments are continuous.
 */
function WakeController({
  wakeRef,
  activeRef,
}: {
  wakeRef: React.RefObject<THREE.Vector4[]>;
  activeRef: React.RefObject<boolean>;
}) {
  const { size } = useThree();

  // Eased pointer in field space.
  const target = useRef(new THREE.Vector2(0, 0));
  const eased = useRef(new THREE.Vector2(0, 0));
  const lastEmit = useRef(new THREE.Vector2(0, 0));
  const head = useRef(0);
  const scrollVel = useRef(0);
  const lastScroll = useRef(0);
  const pointerActive = useRef(false);

  useEffect(() => {
    lastScroll.current = typeof window !== 'undefined' ? window.scrollY : 0;
  }, []);

  // Pointer → field coords. Field short-axis is [-1,1], widened by aspect to
  // match the vertex shader's home mapping.
  const toField = (clientX: number, clientY: number) => {
    const aspect = size.width / Math.max(size.height, 1);
    const nx = (clientX / size.width) * 2 - 1;
    const ny = -((clientY / size.height) * 2 - 1);
    return new THREE.Vector2(nx * aspect, ny);
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointerActive.current = true;
      target.current.copy(toField(e.clientX, e.clientY));
    };
    const onTouch = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      pointerActive.current = true;
      const t = e.touches[0];
      target.current.copy(toField(t.clientX, t.clientY));
    };
    const onLeave = () => {
      pointerActive.current = false;
    };
    const onScroll = () => {
      const y = window.scrollY;
      scrollVel.current += Math.min(Math.abs(y - lastScroll.current) * 0.01, 1.2);
      lastScroll.current = y;
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('touchmove', onTouch, { passive: true });
    window.addEventListener('pointerleave', onLeave, { passive: true });
    window.addEventListener('blur', onLeave, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('touchmove', onTouch);
      window.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
      window.removeEventListener('scroll', onScroll);
    };
    // size is read via closure on each event; re-bind when it changes.
  }, [size.width, size.height]);

  useFrame((_, delta) => {
    if (!activeRef.current) return;
    const d = Math.min(delta, 1 / 30);
    const wake = wakeRef.current;

    // Age every live sample toward death.
    for (let i = 0; i < WAKE; i++) {
      const w = wake[i];
      if (w.w > 0.001) {
        w.z = Math.min(1, w.z + d * 0.55); // age 0→1 over ~1.8s
        w.w *= 1 - d * 0.9; // strength decays
        if (w.z >= 1 || w.w < 0.01) w.w = 0;
      }
    }

    // Ease the pointer toward target (organic damp, no jitter).
    eased.current.lerp(target.current, 1 - Math.pow(0.0015, d));

    // Pointer speed → emission strength.
    const speed = eased.current.distanceTo(lastEmit.current);
    scrollVel.current *= 1 - d * 3; // bleed scroll energy

    // Emit a new wake sample when the cursor has travelled enough OR scroll is
    // active. This keeps the wake a continuous filament rather than a strobe.
    const moved = eased.current.distanceTo(lastEmit.current);
    const strength = Math.min(1.4, speed * 9 + scrollVel.current);
    if ((pointerActive.current && moved > 0.02 && strength > 0.05) || scrollVel.current > 0.08) {
      const slot = wake[head.current % WAKE];
      slot.set(eased.current.x, eased.current.y, 0, Math.max(strength, 0.35));
      head.current++;
      lastEmit.current.copy(eased.current);
    }
  });

  return null;
}

/* -------------------------------------------------------------------------- */
/*  Visibility controller — pauses frameloop offscreen / tab-hidden            */
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
/*  Post stack                                                                  */
/* -------------------------------------------------------------------------- */

function Post({ bloom, bloomKernel }: { bloom: number; bloomKernel: 0 | 1 | 2 | 3 }) {
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom
        intensity={bloom}
        kernelSize={bloomKernel}
        // Threshold sits just above the resting field's faint shimmer so mainly
        // the cursor-lit wake blooms — that is what makes the luminous filaments
        // read as bioluminescence rather than a uniform glow wash.
        luminanceThreshold={0.22}
        luminanceSmoothing={0.7}
        mipmapBlur
      />
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={[0.0006, 0.0009]}
        radialModulation
        modulationOffset={0.35}
      />
      <Noise premultiply blendFunction={BlendFunction.OVERLAY} opacity={0.06} />
      <Vignette eskil={false} offset={0.28} darkness={0.92} />
    </EffectComposer>
  );
}

/* -------------------------------------------------------------------------- */
/*  Scene (Canvas)                                                              */
/* -------------------------------------------------------------------------- */

export default function FieldScene({
  count,
  dprCap,
  bloom,
  bloomKernel,
  flow,
  accent,
  ground,
  ground2,
}: FieldSceneProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(true);
  const wakeRef = useRef<THREE.Vector4[]>(
    Array.from({ length: WAKE }, () => new THREE.Vector4(0, 0, 1, 0)),
  );
  const [contextLost, setContextLost] = useState(false);

  if (contextLost) return null; // parent poster takes over

  return (
    <div ref={wrapperRef} aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>
      <Canvas
        // alpha:true safety net — if a passing probe still never paints
        // (headless / flaky driver), the dark poster behind shows through; the
        // page is never left blank.
        gl={{
          antialias: false,
          alpha: true,
          depth: false,
          stencil: false,
          // Lets a readback (diagnostics / canvas.toDataURL) see the last frame.
          // Negligible cost for an additive points field; makes the field
          // verifiable and any future thumbnail capture reliable.
          preserveDrawingBuffer: true,
          powerPreference: 'high-performance',
        }}
        dpr={[1, dprCap]}
        frameloop="always"
        camera={{ position: [0, 0, 2.4], fov: 50 }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          // Slightly under 1 so the ink ground stays inky (ACES lifts deep
          // shadows toward grey at exposure 1); the bright wake still tonemaps
          // filmically and blooms.
          gl.toneMappingExposure = 0.92;
          // Transparent clear so any un-drawn frame reveals the poster.
          gl.setClearColor(new THREE.Color(ground), 0);
          gl.domElement.addEventListener(
            'webglcontextlost',
            (e) => {
              e.preventDefault();
              setContextLost(true);
            },
            { once: true },
          );
        }}
      >
        <VisibilityController targetRef={wrapperRef} activeRef={activeRef} />
        <WakeController wakeRef={wakeRef} activeRef={activeRef} />
        <Backdrop ground={ground} ground2={ground2} accent={accent} />
        <ParticleField
          count={count}
          flow={flow}
          accent={accent}
          activeRef={activeRef}
          wakeRef={wakeRef}
        />
        <Post bloom={bloom} bloomKernel={bloomKernel} />
      </Canvas>
    </div>
  );
}
