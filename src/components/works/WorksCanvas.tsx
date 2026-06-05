"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrthographicCamera } from "@react-three/drei";
import { works } from "@/data/works";
import { getWorkImage } from "./imageMap";
import { ImagePlane, type ImagePlaneLiveState } from "./ImagePlane";

/**
 * WorksCanvas — DOM-anchored WebGL gallery.
 *
 * Pattern: the Works section keeps its semantic <ul><li> DOM (SEO + a11y).
 * Each <li> exposes a `[data-work-image][data-slug]` anchor element. This
 * canvas overlays the page (fixed inset-0, pointer-events: none), reads each
 * anchor's getBoundingClientRect() per frame, and maps it to a textured plane
 * using a pixel-perfect orthographic camera.
 *
 * The plane bends with scroll velocity (vertex curl) and aberrates with
 * cursor proximity (fragment RGB split). All input is gathered in this file
 * via refs; <ImagePlane> just reads its props per frame inside useFrame.
 *
 * Lifecycle:
 *   - frameloop="always" only while #works is in viewport (IntersectionObserver).
 *   - On (hover: none), cursor input is disabled; only scroll-velocity drives.
 *   - On prefers-reduced-motion, this component is not mounted (gated upstream).
 */

const MAX_VEL_PX_PER_SEC = 3000;
const POINTER_INFLATE_PX = 80; // hover hot-zone grows ~80px beyond the rect.
const POINTER_FALLOFF_PX = 220; // distance over which hover decays to 0.

interface PlaneState {
  slug: string;
  imageUrl: string;
  x: number;
  y: number;
  w: number;
  h: number;
  hover: number;
  progress: number;
  visible: boolean;
}

/**
 * Reads getBoundingClientRect() for each [data-work-image] each frame and
 * pushes pixel-space transforms + hover values into a parallel state array.
 *
 * Why a ref-driven array (not React state): we re-measure every frame; using
 * React state would cause O(frames) reconciles. The shape of `planes` is
 * stable for the lifetime of the section (one entry per work).
 */
function SceneController({
  planesRef,
  mouseRef,
  hoverEnabled,
}: {
  planesRef: React.RefObject<PlaneState[]>;
  mouseRef: React.RefObject<{ x: number; y: number; active: boolean }>;
  hoverEnabled: boolean;
}) {
  const { size } = useThree();

  useFrame(() => {
    const planes = planesRef.current;
    if (!planes) return;
    const vw = size.width;
    const vh = size.height;
    const mouse = mouseRef.current;

    for (const p of planes) {
      const el = document.querySelector<HTMLElement>(
        `[data-work-image][data-slug="${p.slug}"]`,
      );
      if (!el) {
        p.visible = false;
        continue;
      }
      const rect = el.getBoundingClientRect();

      // Cull when entirely offscreen — leaves the plane parked but skips work.
      if (rect.bottom < -200 || rect.top > vh + 200) {
        p.visible = false;
        continue;
      }
      p.visible = true;

      // Convert CSS-px rect → world coords. Camera is set so 1 unit = 1 px
      // and origin is screen center with +y up. So:
      //   worldCenterX = (rect.left + rect.width/2) - vw/2
      //   worldCenterY = vh/2 - (rect.top + rect.height/2)
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      p.x = cx - vw / 2;
      p.y = vh / 2 - cy;
      p.w = rect.width;
      p.h = rect.height;

      // Viewport progress: 0 when rect center is at viewport bottom,
      // 1 when at top. Drives the parallax window slide in-shader.
      p.progress = Math.max(0, Math.min(1, 1 - cy / vh));

      // Hover: distance from mouse to rect (inflated). Saturate at the rect,
      // decay linearly across POINTER_FALLOFF_PX outside it.
      let hoverTarget = 0;
      if (hoverEnabled && mouse && mouse.active) {
        const dx = Math.max(
          rect.left - POINTER_INFLATE_PX - mouse.x,
          0,
          mouse.x - (rect.right + POINTER_INFLATE_PX),
        );
        const dy = Math.max(
          rect.top - POINTER_INFLATE_PX - mouse.y,
          0,
          mouse.y - (rect.bottom + POINTER_INFLATE_PX),
        );
        const d = Math.hypot(dx, dy);
        hoverTarget = 1 - Math.min(1, d / POINTER_FALLOFF_PX);
      }
      // Smooth hover toward target so micro-jitter doesn't translate to flicker.
      p.hover += (hoverTarget - p.hover) * 0.15;
    }
  });

  return null;
}

interface WorksCanvasInnerProps {
  active: boolean;
  hoverEnabled: boolean;
}

function Scene({ active, hoverEnabled }: WorksCanvasInnerProps) {
  // One PlaneState per work, stable order. The array itself is the ref so
  // SceneController and the render below share the same memory.
  const planesRef = useRef<PlaneState[]>(
    works.map((w) => ({
      slug: w.slug,
      imageUrl: getWorkImage(w.slug),
      x: 0,
      y: 0,
      w: 0,
      h: 0,
      hover: 0,
      progress: 0.5,
      visible: false,
    })),
  );
  const velocityRef = useRef(0);
  const mouseRef = useRef({ x: 0, y: 0, active: false });

  // Scroll velocity: track scrollY deltas, normalize, smooth toward 0.
  // We multiply by sign(delta) but keep velocity unsigned magnitude only?
  // → No: signed lets the curl flip direction on up-scroll vs down-scroll,
  //   which reads more lifelike (the plane bends the way you're whipping it).
  useEffect(() => {
    if (!active) return;
    let lastY = window.scrollY;
    let lastT = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const y = window.scrollY;
      const dt = Math.max(1, now - lastT); // ms
      const instant = ((y - lastY) / dt) * 1000; // px/s, signed
      lastY = y;
      lastT = now;
      // Normalize.
      const normalized = Math.max(
        -1,
        Math.min(1, instant / MAX_VEL_PX_PER_SEC),
      );
      // Blend toward instant velocity, decay otherwise.
      velocityRef.current =
        velocityRef.current * 0.92 + normalized * 0.08;
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [active]);

  // Pointer tracking — disabled on no-hover devices.
  useEffect(() => {
    if (!hoverEnabled || !active) return;
    const onMove = (e: PointerEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
    };
    const onLeave = (e: MouseEvent) => {
      if (e.relatedTarget === null) mouseRef.current.active = false;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("mouseout", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("mouseout", onLeave);
    };
  }, [hoverEnabled, active]);

  // Per-frame pull of plane geometry from DOM rects.
  return (
    <>
      {/* drei's OrthographicCamera already sets left/right/top/bottom to
          ±size.{width,height}/2, giving us a pixel-perfect camera where
          1 world unit = 1 CSS pixel and (0,0) is screen center. */}
      <OrthographicCamera
        makeDefault
        position={[0, 0, 10]}
        near={0.1}
        far={1000}
      />
      <SceneController
        planesRef={planesRef}
        mouseRef={mouseRef}
        hoverEnabled={hoverEnabled}
      />
      {planesRef.current.map((p) => (
        <PlaneAdapter
          key={p.slug}
          state={p}
          velocityRef={velocityRef}
        />
      ))}
    </>
  );
}

/**
 * Thin adapter that reads the live PlaneState ref each frame and forwards it
 * as plain props to ImagePlane. ImagePlane re-reads its own props inside
 * useFrame, so we don't actually rerender — the props are just initial values.
 *
 * Why this indirection: we want ImagePlane to remain a self-contained unit
 * that can be reused independently, without knowing about the parent's state
 * shape. We pin the props once and let useFrame inside ImagePlane do the work.
 */
function PlaneAdapter({
  state,
  velocityRef,
}: {
  state: PlaneState;
  velocityRef: React.RefObject<number>;
}) {
  // A single object whose fields are mutated each frame. ImagePlane keeps the
  // reference and reads `live.velocity` etc. inside its own useFrame — so
  // primitive updates are visible without any React reconciliation.
  const live = useMemo<ImagePlaneLiveState>(
    () => ({
      position: [0, 0],
      size: [1, 1],
      velocity: 0,
      hover: 0,
      progress: 0.5,
    }),
    [],
  );

  useFrame(() => {
    live.position[0] = state.x;
    live.position[1] = state.y;
    live.size[0] = state.w;
    live.size[1] = state.h;
    live.velocity = velocityRef.current ?? 0;
    live.hover = state.hover;
    live.progress = state.progress;
  });

  return <ImagePlane imageUrl={state.imageUrl} live={live} />;
}

export function WorksCanvas() {
  const [active, setActive] = useState(false);
  const [hoverEnabled, setHoverEnabled] = useState(true);

  // Detect (hover: none) — disable pointer input on touch devices.
  useEffect(() => {
    const mql = window.matchMedia("(hover: none)");
    setHoverEnabled(!mql.matches);
    const h = (e: MediaQueryListEvent) => setHoverEnabled(!e.matches);
    mql.addEventListener("change", h);
    return () => mql.removeEventListener("change", h);
  }, []);

  // Only render frames while the Works section is in viewport. Outside,
  // frameloop="never" — the canvas is mounted but the GPU is idle.
  useEffect(() => {
    const el = document.getElementById("works");
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setActive(entry.isIntersecting);
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // When inactive (section out of viewport), hide the canvas so the last
  // frozen frame isn't composited over other sections. visibility:hidden keeps
  // the GL context alive for a fast wake-up; opacity:0 would also work but
  // browsers may still composite it.
  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[5] pointer-events-none"
      style={{
        contain: "strict",
        visibility: active ? "visible" : "hidden",
      }}
    >
      <Canvas
        dpr={[1, 2]}
        frameloop={active ? "always" : "never"}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
          stencil: false,
          depth: false,
          premultipliedAlpha: true,
        }}
        style={{ display: "block", width: "100%", height: "100%" }}
      >
        <Suspense fallback={null}>
          <Scene active={active} hoverEnabled={hoverEnabled} />
        </Suspense>
      </Canvas>
    </div>
  );
}
