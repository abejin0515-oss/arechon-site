"use client";

// AnimatedLine — an SVG line/area chart whose path draws itself in on enter
// (stroke-dashoffset 1 -> 0, animated via Framer's pathLength), with an optional
// dot that travels the path and an optional fill area that fades up underneath.
//
// Geometry is viewBox-based (0..100 x 0..100 user units), so the chart is fully
// responsive: it scales to whatever box you give it via width/height/className.
// preserveAspectRatio="none" lets the curve stretch to fill non-square frames
// while stroke width stays visually constant via vectorEffect="non-scaling-stroke".
//
// Path smoothing: a monotone-ish Catmull-Rom -> cubic-bezier conversion gives an
// organic, "human" curve rather than jagged polylines, while never overshooting
// wildly. Set `smooth={false}` for straight segments.
//
// Animation properties: pathLength (-> stroke-dashoffset, compositor-friendly,
// no layout) for the line; opacity for the area; offsetDistance for the dot.
// All transform/opacity/stroke only.
//
// Accessibility: role="img" + aria-label summary, plus an sr-only data table of
// every point as real text. The drawing path is aria-hidden.
//
// Reduced motion: the path is shown fully drawn, the area at full opacity, and the
// dot parked at the end — instantly, no transition.
//
// Bundle: 0 beyond framer-motion.

import { useId, useMemo, useRef } from "react";
import { motion, useInView, type Transition, type UseInViewOptions } from "framer-motion";
import { easings } from "@/lib/motion";
import { useReducedMotionFlag } from "./useReducedMotionFlag";

export type LinePoint = {
  /** Domain x (any scale; mapped to viewBox by min/max of the series). */
  x: number;
  /** Domain y. */
  y: number;
  /** Optional label used in the sr-only data summary. */
  label?: string;
};

export type AnimatedLineProps = {
  points: LinePoint[];
  /** Stroke colour. Accepts a literal or e.g. "var(--accent)". Default currentColor. */
  color?: string;
  /** Draw the filled area under the line. Default false. */
  area?: boolean;
  /** Stroke width in viewBox units (visually constant via non-scaling-stroke). Default 2. */
  strokeWidth?: number;
  /** Smooth the line with bezier interpolation. Default true. */
  smooth?: boolean;
  /** Show a dot travelling the path as it draws. Default true. */
  travelDot?: boolean;
  /** Seconds for the draw. Default 1.8. */
  duration?: number;
  /** Vertical padding inside the viewBox (user units, 0..50) so the curve isn't clipped. Default 8. */
  padY?: number;
  /** Accessible summary label. */
  ariaLabel?: string;
  className?: string;
  style?: React.CSSProperties;
};

const VB = 100; // viewBox is 0..100 in both axes

function project(points: LinePoint[], padY: number) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const top = padY;
  const bottom = VB - padY;

  return points.map((p) => ({
    // x across the full width
    px: ((p.x - minX) / spanX) * VB,
    // y inverted (SVG y grows downward) into the padded band
    py: bottom - ((p.y - minY) / spanY) * (bottom - top),
  }));
}

function buildPath(pts: { px: number; py: number }[], smooth: boolean): string {
  if (pts.length === 0) return "";
  if (pts.length === 1 || !smooth) {
    return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.px} ${p.py}`).join(" ");
  }
  // Catmull-Rom -> cubic bezier
  let d = `M ${pts[0].px} ${pts[0].py}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.px + (p2.px - p0.px) / 6;
    const c1y = p1.py + (p2.py - p0.py) / 6;
    const c2x = p2.px - (p3.px - p1.px) / 6;
    const c2y = p2.py - (p3.py - p1.py) / 6;
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p2.px} ${p2.py}`;
  }
  return d;
}

export function AnimatedLine({
  points,
  color = "currentColor",
  area = false,
  strokeWidth = 2,
  smooth = true,
  travelDot = true,
  duration = 1.8,
  padY = 8,
  ariaLabel,
  className,
  style,
}: AnimatedLineProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, {
    once: true,
    margin: "-10% 0px" as UseInViewOptions["margin"],
  });
  const reduced = useReducedMotionFlag();
  const gradId = useId();

  const { linePath, areaPath, lastPt } = useMemo(() => {
    const proj = project(points, padY);
    const line = buildPath(proj, smooth);
    const last = proj[proj.length - 1] ?? { px: 0, py: VB / 2 };
    const first = proj[0] ?? { px: 0, py: VB / 2 };
    const areaD = line ? `${line} L ${last.px} ${VB} L ${first.px} ${VB} Z` : "";
    return { linePath: line, areaPath: areaD, lastPt: last };
  }, [points, padY, smooth]);

  const summary =
    ariaLabel ??
    `Line chart: ${points
      .map((p) => (p.label ? `${p.label} ${p.y}` : `${p.x}, ${p.y}`))
      .join("; ")}`;

  const drawTransition: Transition = reduced
    ? { duration: 0 }
    : { duration, ease: easings.inOutQuart };

  return (
    <div
      ref={ref}
      className={className}
      role="img"
      aria-label={summary}
      style={{ width: "100%", color, ...style }}
    >
      <ul className="sr-only">
        {points.map((p, i) => (
          <li key={`${p.x}-${i}`}>
            {p.label ?? p.x}: {p.y}
          </li>
        ))}
      </ul>

      <svg
        aria-hidden="true"
        viewBox={`0 0 ${VB} ${VB}`}
        preserveAspectRatio="none"
        width="100%"
        height="100%"
        style={{ display: "block", overflow: "visible" }}
      >
        {area && (
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
        )}

        {area && areaPath && (
          <motion.path
            d={areaPath}
            fill={`url(#${gradId})`}
            stroke="none"
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : undefined}
            transition={
              reduced ? { duration: 0 } : { duration: duration * 0.6, delay: duration * 0.4 }
            }
          />
        )}

        {linePath && (
          <motion.path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: reduced ? 1 : 0 }}
            animate={inView ? { pathLength: 1 } : undefined}
            transition={drawTransition}
          />
        )}

        {travelDot && linePath && (
          <motion.circle
            r={strokeWidth * 1.6}
            fill={color}
            vectorEffect="non-scaling-stroke"
            initial={reduced ? { cx: lastPt.px, cy: lastPt.py, opacity: 1 } : { opacity: 0 }}
            animate={
              inView && !reduced
                ? {
                    opacity: 1,
                    // ride the same offsetPath the line draws along
                    offsetDistance: ["0%", "100%"],
                  }
                : undefined
            }
            transition={
              reduced ? { duration: 0 } : { duration, ease: easings.inOutQuart }
            }
            style={
              reduced
                ? undefined
                : {
                    offsetPath: `path("${linePath}")`,
                    // offset-path positions the element; keep cx/cy at 0
                  }
            }
            cx={reduced ? lastPt.px : 0}
            cy={reduced ? lastPt.py : 0}
          />
        )}
      </svg>
    </div>
  );
}
