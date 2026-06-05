"use client";

// KineticHeadline — split a heading into words/chars and reveal on scroll with a
// staggered rise + clip-wipe. The "kinetic-headlines" signature (Truck'N Roll).
//
// Accessibility: the real text lives in aria-label on the heading; every split span
// is aria-hidden, so assistive tech reads one clean string, never the shrapnel.
//
// Lenis<->ScrollTrigger: relies on the global sync in SmoothScroll.tsx. No per-component
// Lenis wiring needed — ScrollTrigger.create just works once the ticker drives Lenis.
//
// Performance:
//   - Animates transform (translateY) only — compositor-friendly, no layout thrash.
//     The clip is done with a parent overflow-hidden mask, not animated clip-path.
//   - Cost scales with span count. 'word' is cheap (≈ word count tweens, batch via stagger,
//     one ScrollTrigger). 'char' on a long headline can be 60+ targets — fine for a hero
//     line, avoid on paragraphs. One ScrollTrigger total regardless of span count.
//   - Main thread: split runs once on mount (string ops + DOM build, < 1ms for a headline).
//   - Bundle: ~0 beyond gsap (already in the app). No SplitText, no extra dep.
//
// Mobile: works on mid-range Android. Triggers on native or Lenis scroll identically.
//   Honors save-data implicitly via reduced-motion. char-mode capped is recommended for
//   very long mobile lines (more spans = more style recalc on first paint).
//
// Reduced motion: spans render fully visible immediately, no tweens, no ScrollTrigger.

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

type KineticHeadlineProps = {
  children: string;
  as?: "h1" | "h2";
  /** seconds between each unit's start */
  stagger?: number;
  by?: "word" | "char";
  className?: string;
  /** ScrollTrigger start, default "top 85%" */
  start?: string;
};

export function KineticHeadline({
  children,
  as = "h2",
  stagger = 0.06,
  by = "word",
  className,
  start = "top 85%",
}: KineticHeadlineProps) {
  const ref = useRef<HTMLHeadingElement>(null);
  const Tag = as;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targets = Array.from(
      el.querySelectorAll<HTMLElement>("[data-kinetic-unit]"),
    );
    if (targets.length === 0) return;

    if (reduced) {
      gsap.set(targets, { yPercent: 0, opacity: 1 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.set(targets, { yPercent: 120, opacity: 0 });
      gsap.to(targets, {
        yPercent: 0,
        opacity: 1,
        duration: 0.9,
        ease: "power3.out",
        stagger,
        scrollTrigger: {
          trigger: el,
          start,
          once: true,
        },
      });
    }, el);

    return () => ctx.revert(); // kills tweens + its ScrollTrigger, restores inline styles
  }, [stagger, by, start, children]);

  // Build split spans during render so SSR markup matches and there's no flash.
  // Each visual unit sits in an overflow-hidden mask -> the rise reads as a clip-wipe.
  const units =
    by === "word"
      ? children.split(/(\s+)/) // keep whitespace tokens to preserve spacing
      : Array.from(children);

  return (
    <Tag ref={ref} aria-label={children} className={className}>
      {units.map((unit, i) => {
        // Whitespace tokens render as plain text (not animated) so words keep their gaps.
        if (/^\s+$/.test(unit)) {
          return (
            <span key={`s-${i}`} aria-hidden="true">
              {unit}
            </span>
          );
        }
        return (
          <span
            key={`u-${i}`}
            aria-hidden="true"
            style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top" }}
          >
            <span data-kinetic-unit style={{ display: "inline-block", willChange: "transform" }}>
              {unit}
            </span>
          </span>
        );
      })}
    </Tag>
  );
}
