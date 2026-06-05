"use client";

// AnimatedBars — a compact bar set that grows from 0 on enter, staggered, with
// labels and values. Built with SVG + Framer Motion so it stays light and
// on-brand (no charting lib).
//
// Why scaleY/scaleX instead of animating width/height? scale runs on the
// compositor (transform only) — zero layout per frame. Each bar is anchored at
// its baseline via transform-origin so it grows from the axis, not the centre.
// The value-fill uses transform; the track rect is static.
//
// Accessibility:
//   - The whole figure is role="img" with an aria-label summarising the series,
//     plus an sr-only <ul> enumerating every label/value pair as real text. So
//     AT users get the data immediately, before (and without) any animation.
//   - Visible value labels are aria-hidden to avoid double-reading.
//
// Reduced motion: bars render at full extent instantly (initial = animate target),
// no stagger, no transition.
//
// Accent colour: pass a CSS custom property name (e.g. "--accent") via `accentVar`
// or a literal colour via `color`. CSS var lets the bars inherit brand theming.
//
// Bundle: 0 beyond framer-motion.

import { useRef } from "react";
import { motion, useInView, type Transition, type UseInViewOptions } from "framer-motion";
import { easings } from "@/lib/motion";
import { CountUp } from "./CountUp";
import { useReducedMotionFlag } from "./useReducedMotionFlag";

export type BarDatum = {
  label: string;
  value: number;
};

export type AnimatedBarsProps = {
  data: BarDatum[];
  /** Force the axis maximum. Defaults to the largest value in `data`. */
  max?: number;
  /** "horizontal" = bars grow rightward (default). "vertical" = bars grow upward. */
  orientation?: "horizontal" | "vertical";
  /** Literal colour for the fill. Ignored if `accentVar` is set. */
  color?: string;
  /** CSS custom property name for the fill, e.g. "--accent". Takes precedence. */
  accentVar?: string;
  /** Seconds per bar grow. Default 1.1. */
  duration?: number;
  /** Seconds between successive bars. Default 0.12. */
  stagger?: number;
  /** Show numeric value beside each bar (animated CountUp). Default true. */
  showValues?: boolean;
  /** Suffix for value labels, e.g. "%". */
  valueSuffix?: string;
  className?: string;
};

export function AnimatedBars({
  data,
  max,
  orientation = "horizontal",
  color = "currentColor",
  accentVar,
  duration = 1.1,
  stagger = 0.12,
  showValues = true,
  valueSuffix = "",
  className,
}: AnimatedBarsProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, {
    once: true,
    margin: "-10% 0px" as UseInViewOptions["margin"],
  });
  const reduced = useReducedMotionFlag();

  const fill = accentVar ? `var(${accentVar})` : color;
  const axisMax = max ?? Math.max(...data.map((d) => d.value), 1);
  const horizontal = orientation === "horizontal";

  const summary = data.map((d) => `${d.label}: ${d.value}${valueSuffix}`).join(", ");

  const ease = easings.outExpo;

  return (
    <div ref={ref} className={className} role="img" aria-label={summary}>
      {/* Real, pre-animation data for assistive tech. */}
      <ul className="sr-only">
        {data.map((d) => (
          <li key={d.label}>
            {d.label}: {d.value}
            {valueSuffix}
          </li>
        ))}
      </ul>

      <div
        aria-hidden="true"
        style={
          horizontal
            ? { display: "flex", flexDirection: "column", gap: "0.85rem" }
            : {
                display: "flex",
                alignItems: "flex-end",
                gap: "0.85rem",
                height: "100%",
                minHeight: "12rem",
              }
        }
      >
        {data.map((d, i) => {
          const extent = `${(d.value / axisMax) * 100}%`;
          const delay = reduced ? 0 : i * stagger;
          const transition: Transition = reduced
            ? { duration: 0 }
            : { duration, ease, delay };

          const valueLabel = showValues ? (
            <span
              style={{
                fontVariantNumeric: "tabular-nums",
                fontSize: "0.875rem",
                opacity: 0.7,
                whiteSpace: "nowrap",
              }}
            >
              <CountUp
                value={d.value}
                suffix={valueSuffix}
                duration={reduced ? 0 : duration}
                ease={ease}
              />
            </span>
          ) : null;

          if (horizontal) {
            return (
              <div key={d.label} style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.875rem",
                  }}
                >
                  <span>{d.label}</span>
                  {valueLabel}
                </div>
                {/* Track */}
                <div
                  style={{
                    position: "relative",
                    height: "0.5rem",
                    borderRadius: "999px",
                    background: "color-mix(in oklab, currentColor 12%, transparent)",
                    overflow: "hidden",
                  }}
                >
                  <motion.div
                    initial={{ transform: "scaleX(0)" }}
                    animate={inView ? { transform: "scaleX(1)" } : undefined}
                    transition={transition}
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: extent,
                      transformOrigin: "left center",
                      borderRadius: "999px",
                      background: fill,
                      willChange: "transform",
                    }}
                  />
                </div>
              </div>
            );
          }

          // vertical
          return (
            <div
              key={d.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.4rem",
                height: "100%",
                flex: 1,
              }}
            >
              <div style={{ height: "0.875rem" }}>{valueLabel}</div>
              {/* Track fills remaining column height */}
              <div
                style={{
                  position: "relative",
                  flex: 1,
                  width: "100%",
                  maxWidth: "3rem",
                  display: "flex",
                  alignItems: "flex-end",
                  borderRadius: "0.4rem",
                  background: "color-mix(in oklab, currentColor 12%, transparent)",
                  overflow: "hidden",
                }}
              >
                <motion.div
                  initial={{ transform: "scaleY(0)" }}
                  animate={inView ? { transform: "scaleY(1)" } : undefined}
                  transition={transition}
                  style={{
                    width: "100%",
                    height: extent,
                    transformOrigin: "center bottom",
                    borderRadius: "0.4rem",
                    background: fill,
                    willChange: "transform",
                  }}
                />
              </div>
              <span style={{ fontSize: "0.8125rem", textAlign: "center" }}>{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
