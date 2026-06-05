"use client";

import { useEffect, useRef } from "react";

/**
 * Custom magnetic cursor.
 * - Hidden on touch / no-hover devices.
 * - Hidden when prefers-reduced-motion.
 * - Lerps toward pointer.
 * - Magnetic pull toward any element matching [data-magnetic] within 80px.
 * - Hover scale on [data-magnetic] elements.
 */
export function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const noHover = window.matchMedia("(hover: none)").matches;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (noHover || reduced) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ringPos = { x: pointer.x, y: pointer.y };
    let hover = 0;
    let hoverTarget = 0;

    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    };

    const onOver = (e: PointerEvent) => {
      const target = e.target as Element | null;
      const magnet = target?.closest<HTMLElement>("[data-magnetic], a, button");
      hoverTarget = magnet ? 1 : 0;
    };

    const onLeave = () => {
      hoverTarget = 0;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("pointerleave", onLeave);

    let rafId = 0;
    const tick = () => {
      // Dot: exact pointer (no lerp) for precision feel
      dot.style.transform = `translate3d(${pointer.x - 3}px, ${pointer.y - 3}px, 0)`;

      // Ring: lerped follow + magnetic pull when near an interactive element
      const magnetEl = document
        .elementFromPoint(pointer.x, pointer.y)
        ?.closest<HTMLElement>("[data-magnetic]");

      let tx = pointer.x;
      let ty = pointer.y;
      if (magnetEl) {
        const r = magnetEl.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = cx - pointer.x;
        const dy = cy - pointer.y;
        const d = Math.hypot(dx, dy);
        if (d < 120) {
          const pull = (1 - d / 120) * 0.35;
          tx = pointer.x + dx * pull;
          ty = pointer.y + dy * pull;
        }
      }

      ringPos.x += (tx - ringPos.x) * 0.18;
      ringPos.y += (ty - ringPos.y) * 0.18;
      hover += (hoverTarget - hover) * 0.12;

      const scale = 1 + hover * 1.6;
      const alpha = 0.55 + hover * 0.25;
      ring.style.transform = `translate3d(${ringPos.x - 16}px, ${ringPos.y - 16}px, 0) scale(${scale})`;
      ring.style.opacity = String(alpha);

      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <>
      <div
        ref={ringRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[60] hidden h-8 w-8 rounded-full border border-[var(--fg)] mix-blend-difference [@media(hover:hover)]:block"
        style={{ transform: "translate3d(-100px, -100px, 0)", opacity: 0 }}
      />
      <div
        ref={dotRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[60] hidden h-1.5 w-1.5 rounded-full bg-[var(--accent)] mix-blend-difference [@media(hover:hover)]:block"
        style={{ transform: "translate3d(-100px, -100px, 0)" }}
      />
    </>
  );
}
