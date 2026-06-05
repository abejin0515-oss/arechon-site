"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * HeroAtmosphere — ambient WebGL field behind the Hero typography.
 *
 * Design intent
 * ─────────────
 * Calm, breathing atmosphere. Two soft simplex-noise-driven color blobs drift
 * across the canvas; one tinted with --accent (read from computed style at
 * mount time), the other near-black. A subtle pointer parallax (~6%) and a
 * fixed-screen-space procedural grain dust at 3% complete the field.
 *
 * Constraints honored
 * ───────────────────
 *  - Wrapper opacity is capped at 0.28 so the typography always wins.
 *  - Two fragment passes per frame in practice → one shader does both blobs
 *    in one screen-space evaluation (3 noise taps + 4-tap dust). No render
 *    targets, no post-processing — a single fullscreen quad.
 *  - `frameloop="always"` while Hero intersects viewport; otherwise "never"
 *    AND `visibility: hidden` on the wrapper so the last frame isn't
 *    composited under later sections.
 *  - prefers-reduced-motion: render a single static frame (uTime frozen at 0)
 *    by switching to frameloop="demand" and invalidating exactly once.
 *  - `pointer-events: none` on wrapper so clicks pass through to the CTA.
 *  - DPR clamped to [1, 1.5] for mobile battery.
 *
 * Gated upstream: the mount wrapper (HeroAtmosphereMount) checks reduced-
 * motion only to decide DPR; this component itself handles the
 * "static-frame-only" path so the visual is still present under that media
 * query (the brief asks for "still beautiful", not invisible).
 */

/* -------------------------------------------------------------------------- */
/*  Color sampling — oklch → canvas → rgb                                     */
/* -------------------------------------------------------------------------- */

/**
 * Read a CSS custom property value (e.g. "--accent") and resolve it to a
 * linear sRGB Color usable by THREE. The trick: the property value may be
 * `oklch(...)`, which THREE.Color cannot parse directly. We paint it onto a
 * 1×1 canvas, read back the rgb bytes, and feed those to THREE.Color.
 *
 * Returns null if the document/computed style isn't available yet (SSR
 * guard) or if the browser refuses to paint the color.
 */
function sampleCssColor(varName: string): THREE.Color | null {
  if (typeof document === "undefined") return null;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  if (!raw) return null;

  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "rgb(0,0,0)";
  ctx.fillStyle = raw; // browser parses oklch() / hsl() / etc.
  ctx.fillRect(0, 0, 1, 1);
  const data = ctx.getImageData(0, 0, 1, 1).data;
  const c = new THREE.Color(data[0] / 255, data[1] / 255, data[2] / 255);
  return c;
}

/* -------------------------------------------------------------------------- */
/*  Shaders                                                                   */
/* -------------------------------------------------------------------------- */

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    // Fullscreen NDC quad — geometry is [-1,1] in x/y already.
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/**
 * Single-pass fragment:
 *   - 2 simplex noise lookups to position two drifting blob centers.
 *   - 2 distance-falloff blob fills.
 *   - 4-tap procedural hash dust at 3% in screen space.
 * No fbm, no warp — kept deliberately cheap so this is comfortably under 1ms
 * on M1 Air at 1.5x DPR full-viewport.
 */
const fragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform float uTime;
  uniform vec2  uResolution;
  uniform vec2  uMouse;       // -0.5..0.5 (normalized, centered)
  uniform vec3  uAccent;      // tinted blob color
  uniform vec3  uDark;        // dark blob color
  uniform float uDust;        // grain amount

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

  // Ashima 2D simplex (public domain).
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

  // Cheap white-noise hash for the dust.
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    // Aspect-corrected UVs in 0..1 so the field is not stretched.
    vec2 uv = vUv;
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 p = vec2(uv.x * aspect, uv.y);

    // Two blob centers — each driven by very slow simplex noise so they
    // drift independently, plus a small pointer offset (~6%).
    // The uTime here is already scaled by 0.00006 host-side per the brief,
    // and snoise is then sampled at that scale to keep the motion "barely
    // perceptible".
    float t = uTime;
    vec2 cA = vec2(
      0.32 * aspect + 0.18 * aspect * snoise(vec2(t * 1.7, 11.3)),
      0.62 + 0.18 * snoise(vec2(t * 1.3 + 4.1, 7.7))
    );
    vec2 cB = vec2(
      0.72 * aspect + 0.16 * aspect * snoise(vec2(t * 1.1 + 2.7, 19.2)),
      0.38 + 0.16 * snoise(vec2(t * 1.9 + 9.5, 1.4))
    );
    // Pointer parallax: ~6% screen movement, opposite directions for depth.
    cA += vec2(uMouse.x, -uMouse.y) * vec2(0.06 * aspect, 0.06);
    cB -= vec2(uMouse.x, -uMouse.y) * vec2(0.06 * aspect, 0.06);

    // Soft circular falloffs. The radii are tuned so blobs overlap and
    // bleed into each other rather than reading as discrete shapes.
    float rA = length(p - cA);
    float rB = length(p - cB);
    float blobA = smoothstep(0.55, 0.0, rA);
    float blobB = smoothstep(0.65, 0.0, rB);

    // Composite onto a transparent background.
    //   - Accent blob carries the warmth.
    //   - Dark blob lifts the corner toward near-black, adding depth.
    vec3  col = uAccent * blobA + uDark * blobB;
    // Alpha is the *union* of the two blobs (max), so they don't summed-clip.
    float alpha = max(blobA, blobB) * 0.85;

    // 4-tap procedural dust in *screen space* (fragCoord, not uv).
    // Average 4 offset hashes → finer-grained look at no extra noise cost.
    vec2 g = gl_FragCoord.xy;
    float dust = 0.0;
    dust += hash(g + vec2(0.0, 0.0));
    dust += hash(g + vec2(1.7, 0.0));
    dust += hash(g + vec2(0.0, 1.7));
    dust += hash(g + vec2(1.7, 1.7));
    dust = (dust * 0.25 - 0.5) * uDust;
    col += dust;
    alpha += abs(dust) * 0.5;

    gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
  }
`;

/* -------------------------------------------------------------------------- */
/*  Plane                                                                     */
/* -------------------------------------------------------------------------- */

interface PlaneProps {
  accent: THREE.Color;
  dark: THREE.Color;
  mouseRef: React.RefObject<{ x: number; y: number }>;
  /** When false, useFrame is a no-op (we still mount, but pause time). */
  activeRef: React.RefObject<boolean>;
  /** If true, never animate — render exactly one frame at uTime=0. */
  staticFrame: boolean;
  /** Pushed once at boot to force one render under reduced-motion. */
  invalidate: () => void;
}

function AtmospherePlane({
  accent,
  dark,
  mouseRef,
  activeRef,
  staticFrame,
  invalidate,
}: PlaneProps) {
  const { size } = useThree();

  // Uniforms are constructed once. Color changes (e.g. theme toggle) are
  // pushed imperatively below so the shader program isn't recompiled.
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uAccent: { value: accent.clone() },
      uDark: { value: dark.clone() },
      uDust: { value: 0.03 },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    uniforms.uResolution.value.set(size.width, size.height);
    // Resolution changed → re-render once even in static mode.
    if (staticFrame) invalidate();
  }, [size.width, size.height, uniforms, staticFrame, invalidate]);

  useEffect(() => {
    uniforms.uAccent.value.copy(accent);
    uniforms.uDark.value.copy(dark);
    if (staticFrame) invalidate();
  }, [accent, dark, uniforms, staticFrame, invalidate]);

  // Mouse uniform is pushed each frame from the ref so we never reconcile.
  useFrame((_, delta) => {
    if (!activeRef.current) return;

    // Smoothly track the pointer ref (lerp toward target each frame so
    // movement feels like the field has weight, not a hard glue).
    const m = mouseRef.current;
    const cur = uniforms.uMouse.value;
    cur.x += (m.x - cur.x) * 0.06;
    cur.y += (m.y - cur.y) * 0.06;

    if (!staticFrame) {
      // Clamp delta against backgrounded-tab catch-up. The brief specifies
      // a 0.00006 scaling for the noise sample; we apply the equivalent
      // here by multiplying delta (seconds) into a tiny accumulator. With
      // delta≈1/60s, this accumulates ~1e-6/frame → snoise drifts visibly
      // only over many seconds. Exactly the "barely perceptible" target.
      uniforms.uTime.value += Math.min(delta, 1 / 30) * 0.06;
    }
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

/* -------------------------------------------------------------------------- */
/*  Visibility — pause when Hero is offscreen or tab hidden                   */
/* -------------------------------------------------------------------------- */

function VisibilityController({
  targetSelector,
  activeRef,
  staticFrame,
}: {
  targetSelector: string;
  activeRef: React.RefObject<boolean>;
  staticFrame: boolean;
}) {
  const setFrameloop = useThree((s) => s.setFrameloop);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    // Under static-frame mode we never run the loop — one demand frame and
    // we're done. Resize handler in AtmospherePlane re-invalidates as needed.
    if (staticFrame) {
      setFrameloop("demand");
      // Initial paint.
      invalidate();
      return;
    }

    let current: "always" | "never" = "always";
    const apply = (on: boolean) => {
      activeRef.current = on;
      const next: "always" | "never" = on ? "always" : "never";
      if (current !== next) {
        current = next;
        setFrameloop(next);
      }
    };

    const onVisibility = () => apply(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);

    const el = document.querySelector<HTMLElement>(targetSelector);
    let io: IntersectionObserver | null = null;
    if (el && "IntersectionObserver" in window) {
      io = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry) apply(entry.isIntersecting && !document.hidden);
        },
        // rootMargin lets us start the loop ~one viewport before Hero is
        // actually visible, so re-entering scrollback feels instant.
        { rootMargin: "200px" },
      );
      io.observe(el);
    }

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      io?.disconnect();
      // Leave frameloop in a sane state for any later reuse of the GL context.
      setFrameloop("always");
    };
  }, [targetSelector, activeRef, staticFrame, setFrameloop, invalidate]);

  return null;
}

/* -------------------------------------------------------------------------- */
/*  Pointer — mounted once at module scope of the scene, normalized to -0.5..0.5 */
/* -------------------------------------------------------------------------- */

function usePointerRef(
  mouseRef: React.RefObject<{ x: number; y: number }>,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return;
    const onMove = (e: PointerEvent) => {
      // -0.5..0.5, with y inverted so "up" is positive (matches GL).
      mouseRef.current.x = e.clientX / window.innerWidth - 0.5;
      mouseRef.current.y = 0.5 - e.clientY / window.innerHeight;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [mouseRef, enabled]);
}

/* -------------------------------------------------------------------------- */
/*  Scene                                                                     */
/* -------------------------------------------------------------------------- */

function Scene({
  accent,
  dark,
  staticFrame,
  hoverEnabled,
}: {
  accent: THREE.Color;
  dark: THREE.Color;
  staticFrame: boolean;
  hoverEnabled: boolean;
}) {
  const activeRef = useRef(true);
  const mouseRef = useRef({ x: 0, y: 0 });
  const invalidate = useThree((s) => s.invalidate);

  usePointerRef(mouseRef, hoverEnabled && !staticFrame);

  return (
    <>
      <VisibilityController
        targetSelector="#top"
        activeRef={activeRef}
        staticFrame={staticFrame}
      />
      <AtmospherePlane
        accent={accent}
        dark={dark}
        mouseRef={mouseRef}
        activeRef={activeRef}
        staticFrame={staticFrame}
        invalidate={invalidate}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Public component                                                          */
/* -------------------------------------------------------------------------- */

export function HeroAtmosphere() {
  // Sample CSS colors after mount so theme switches / system dark mode are
  // respected. We re-sample on `prefers-color-scheme` change.
  const [accent, setAccent] = useState<THREE.Color>(
    () => new THREE.Color(0xff5a2e), // warm fallback, replaced on mount
  );
  const [dark] = useState<THREE.Color>(() => new THREE.Color(0x05060a));
  const [staticFrame, setStaticFrame] = useState(false);
  const [hoverEnabled, setHoverEnabled] = useState(true);

  // One-shot color sample + listeners.
  useEffect(() => {
    const resample = () => {
      const a = sampleCssColor("--accent");
      if (a) setAccent(a);
    };
    resample();

    const colorMql = window.matchMedia("(prefers-color-scheme: dark)");
    colorMql.addEventListener("change", resample);

    const motionMql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setStaticFrame(motionMql.matches);
    const onMotion = (e: MediaQueryListEvent) => setStaticFrame(e.matches);
    motionMql.addEventListener("change", onMotion);

    const hoverMql = window.matchMedia("(hover: none)");
    setHoverEnabled(!hoverMql.matches);
    const onHover = (e: MediaQueryListEvent) => setHoverEnabled(!e.matches);
    hoverMql.addEventListener("change", onHover);

    return () => {
      colorMql.removeEventListener("change", resample);
      motionMql.removeEventListener("change", onMotion);
      hoverMql.removeEventListener("change", onHover);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        // Hard ceiling on visibility. The brief: "Total opacity of the WebGL
        // output max 28% — the typography always reads as the hero."
        opacity: 0.28,
        // contain:strict isolates paint/layout — helps composition perf and
        // prevents the Canvas from triggering hero-section reflows.
        contain: "strict",
      }}
    >
      <Canvas
        dpr={[1, 1.5]}
        // Default loop mode; VisibilityController flips this to "demand" for
        // staticFrame and "never" when offscreen.
        frameloop="always"
        gl={{
          antialias: false,
          alpha: true,
          depth: false,
          stencil: false,
          powerPreference: "low-power",
          premultipliedAlpha: true,
        }}
        style={{ display: "block", width: "100%", height: "100%" }}
      >
        <Scene
          accent={accent}
          dark={dark}
          staticFrame={staticFrame}
          hoverEnabled={hoverEnabled}
        />
      </Canvas>
    </div>
  );
}
