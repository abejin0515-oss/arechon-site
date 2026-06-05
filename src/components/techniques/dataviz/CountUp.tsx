"use client";

// CountUp — animates a number 0 -> value when it scrolls into view. The core
// "warm number": a KPI that arrives rather than just sits there.
//
// Design notes:
//   - Frame-rate INDEPENDENT. The loop advances by wall-clock elapsed / duration,
//     not by per-frame increments, so it lands on `value` in `duration` seconds on
//     a 60Hz, 120Hz or throttled display alike.
//   - Easing is an explicit cubic-bezier (default outExpo from @/lib/motion) sampled
//     numerically — no dependency on any animation engine for the count itself; we
//     only borrow Framer's `useInView` for a clean, GC-safe IntersectionObserver.
//   - Accessibility: the FINAL formatted value is always present in the DOM as real
//     text inside an aria-hidden-free, sr-only span, so screen readers and crawlers
//     read "¥1,240,000" regardless of animation progress. The animated digits are
//     marked aria-hidden so AT doesn't hear every intermediate frame.
//   - Reduced motion: renders the final value immediately, no rAF scheduled.
//
// transform/opacity policy: this animates text content (unavoidable for a counter),
// not layout — `tabular-nums` keeps width stable so no reflow jitter per frame.
//
// Bundle: 0 beyond framer-motion (already a dependency).

import { useEffect, useRef, useState } from "react";
import { useInView, type UseInViewOptions } from "framer-motion";
import { easings } from "@/lib/motion";
import { useReducedMotionFlag } from "./useReducedMotionFlag";

type CubicBezier = readonly [number, number, number, number];

export type CountUpProps = {
  /** Target value to count to. */
  value: number;
  /** Start value (default 0). */
  from?: number;
  /** Seconds. Default 2. */
  duration?: number;
  /** cubic-bezier control points. Default easings.outExpo. */
  ease?: CubicBezier;
  /** Decimal places. Default 0. */
  decimals?: number;
  /** e.g. "¥", "+". Rendered before the number. */
  prefix?: string;
  /** e.g. "%", "+", "k". Rendered after the number. */
  suffix?: string;
  /** BCP-47 locale for grouping/decimals. Default "ja-JP". */
  locale?: string;
  /** Trigger margin for the in-view observer. Default "-10% 0px". */
  rootMargin?: string;
  className?: string;
  /** Element tag for the wrapper. Default "span". */
  as?: "span" | "div" | "p" | "strong";
};

// Solve cubic-bezier(p1x, p2x) for y at a given time t in [0,1].
// Newton-Raphson on x to find the parametric s, then evaluate y(s).
function cubicBezier([p1x, p1y, p2x, p2y]: CubicBezier) {
  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;

  const sampleX = (s: number) => ((ax * s + bx) * s + cx) * s;
  const sampleY = (s: number) => ((ay * s + by) * s + cy) * s;
  const sampleDX = (s: number) => (3 * ax * s + 2 * bx) * s + cx;

  return (t: number) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let s = t;
    for (let i = 0; i < 6; i++) {
      const x = sampleX(s) - t;
      const dx = sampleDX(s);
      if (Math.abs(x) < 1e-5 || dx === 0) break;
      s -= x / dx;
    }
    return sampleY(s);
  };
}

export function CountUp({
  value,
  from = 0,
  duration = 2,
  ease = easings.outExpo,
  decimals = 0,
  prefix = "",
  suffix = "",
  locale = "ja-JP",
  rootMargin = "-10% 0px",
  className,
  as = "span",
}: CountUpProps) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, {
    once: true,
    margin: rootMargin as UseInViewOptions["margin"],
  });
  const reduced = useReducedMotionFlag();
  const [display, setDisplay] = useState(from);
  const rafRef = useRef<number | null>(null);

  const format = (n: number) =>
    n.toLocaleString(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

  const finalText = `${prefix}${format(value)}${suffix}`;

  useEffect(() => {
    if (!inView) return;

    if (reduced || duration <= 0) {
      setDisplay(value);
      return;
    }

    const easeFn = cubicBezier(ease);
    const startTime = performance.now();
    const span = value - from;

    const tick = (now: number) => {
      const t = Math.min((now - startTime) / (duration * 1000), 1);
      setDisplay(from + span * easeFn(t));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(value);
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [inView, reduced, value, from, duration, ease]);

  // Polymorphic tag. Each intrinsic element wants a different ref type; we keep a
  // single HTMLElement ref and present the component with a uniform prop signature
  // (the four allowed tags are all phrasing/flow HTML elements).
  const Tag = as as unknown as React.FC<
    React.HTMLAttributes<HTMLElement> & { ref?: React.Ref<HTMLElement> }
  >;

  return (
    <Tag
      ref={ref}
      className={className}
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {/* Real, final value for assistive tech & no-JS / pre-animation crawlers. */}
      <span className="sr-only">{finalText}</span>
      <span aria-hidden="true">
        {prefix}
        {format(display)}
        {suffix}
      </span>
    </Tag>
  );
}
