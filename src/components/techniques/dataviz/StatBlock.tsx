"use client";

// StatBlock — editorial wrapper that frames a CountUp as a story beat (Cleo style),
// not a dashboard cell. A big warm number, an eyebrow label above it, and a short
// narrative line below that gives the figure meaning ("...returned within a week").
//
// The whole block rises + fades in on enter (transform/opacity only) while the
// number counts; the label and narrative settle in with a small stagger so it
// reads as a sentence assembling itself.
//
// Accessibility: the block is a <figure> with a <figcaption> that, for AT, reads as
// one coherent sentence: "<value> — <label>. <narrative>". The CountUp already
// exposes its final value to screen readers, and visual decorative pieces are
// aria-hidden so nothing double-reads.
//
// Reduced motion: no rise/fade, no count — final value and full opacity instantly.
//
// Bundle: 0 beyond framer-motion.

import { useRef } from "react";
import { motion, useInView, type Variants, type UseInViewOptions } from "framer-motion";
import { easings, durations } from "@/lib/motion";
import { CountUp, type CountUpProps } from "./CountUp";
import { useReducedMotionFlag } from "./useReducedMotionFlag";

export type StatBlockProps = {
  /** Eyebrow / category label above the number. */
  label: string;
  /** One short narrative line giving the number meaning. */
  narrative?: string;
  /** Props forwarded to the inner CountUp (value, prefix, suffix, decimals...). */
  number: CountUpProps;
  /** "left" (default) | "center". */
  align?: "left" | "center";
  className?: string;
};

export function StatBlock({
  label,
  narrative,
  number,
  align = "left",
  className,
}: StatBlockProps) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, {
    once: true,
    margin: "-10% 0px" as UseInViewOptions["margin"],
  });
  const reduced = useReducedMotionFlag();

  const container: Variants = {
    hidden: {},
    show: {
      transition: reduced ? { duration: 0 } : { staggerChildren: 0.08, delayChildren: 0.02 },
    },
  };

  const item: Variants = {
    hidden: reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 },
    show: {
      opacity: 1,
      y: 0,
      transition: reduced ? { duration: 0 } : { duration: durations.standard, ease: easings.outExpo },
    },
  };

  // Compose the sr-only sentence so AT hears it as one beat.
  const srValue = `${number.prefix ?? ""}${number.value}${number.suffix ?? ""}`;
  const srSentence = `${srValue}. ${label}.${narrative ? ` ${narrative}` : ""}`;

  return (
    <motion.figure
      ref={ref}
      className={className}
      variants={container}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
      style={{
        margin: 0,
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        textAlign: align,
        alignItems: align === "center" ? "center" : "flex-start",
      }}
    >
      <figcaption className="sr-only">{srSentence}</figcaption>

      <motion.span
        variants={item}
        aria-hidden="true"
        style={{
          fontSize: "0.8125rem",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          opacity: 0.6,
        }}
      >
        {label}
      </motion.span>

      <motion.span
        variants={item}
        aria-hidden="true"
        style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)", fontWeight: 600, lineHeight: 1 }}
      >
        <CountUp {...number} />
      </motion.span>

      {narrative && (
        <motion.span
          variants={item}
          aria-hidden="true"
          style={{ fontSize: "1rem", opacity: 0.75, maxWidth: "32ch" }}
        >
          {narrative}
        </motion.span>
      )}
    </motion.figure>
  );
}
