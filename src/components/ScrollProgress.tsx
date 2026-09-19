"use client";

import { useEffect, useRef, useState } from "react";

const sections = [
  { id: "top", label: "Hero" },
  { id: "operations", label: "Operations" },
  { id: "works", label: "Works" },
  { id: "demos", label: "Index" },
  { id: "process", label: "Process" },
  { id: "about", label: "About" },
  { id: "faq", label: "FAQ" },
  { id: "source", label: "Source" },
];

/**
 * Bottom-right scroll indicator. Two lines:
 *   - Current section label (updated via IntersectionObserver)
 *   - Progress bar 0..100% of document scroll
 *
 * Hidden under prefers-reduced-motion? No — this is informational, not motion.
 * Hidden on mobile (cluttered).
 */
export function ScrollProgress() {
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState("Hero");
  const ticking = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const h = document.documentElement;
        const max = Math.max(1, h.scrollHeight - h.clientHeight);
        setProgress(Math.min(1, Math.max(0, window.scrollY / max)));
        ticking.current = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const observed: HTMLElement[] = [];
    const io = new IntersectionObserver(
      (entries) => {
        // pick the most-visible section
        let best: { label: string; ratio: number } | null = null;
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const id = (e.target as HTMLElement).id;
          const section = sections.find((s) => s.id === id);
          if (!section) continue;
          if (!best || e.intersectionRatio > best.ratio) {
            best = { label: section.label, ratio: e.intersectionRatio };
          }
        }
        if (best) setActive(best.label);
      },
      { rootMargin: "-40% 0px -40% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) {
        io.observe(el);
        observed.push(el);
      }
    }
    return () => io.disconnect();
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed right-6 bottom-6 z-40 hidden sm:flex flex-col items-end gap-2 mix-blend-difference text-white"
    >
      <div className="font-mono-accent text-[10px] leading-none">
        <span className="opacity-60">SECTION / </span>
        <span>{active}</span>
      </div>
      <div className="relative h-px w-[180px] bg-white/20 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-white"
          style={{
            width: `${(progress * 100).toFixed(2)}%`,
            transition: "width 120ms linear",
          }}
        />
      </div>
      <div className="font-mono-accent text-[10px] leading-none tabular-nums opacity-60">
        {(progress * 100).toFixed(0).padStart(3, "0")} / 100
      </div>
    </div>
  );
}
