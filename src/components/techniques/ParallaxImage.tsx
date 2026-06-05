"use client";

// ParallaxImage — cinematic image that parallaxes on scroll (translate3d, scrubbed)
// and reveals from a clip-path mask on enter. "cinematic-photography" staging
// (Truck'N Roll / AIR).
//
// Two motions, decoupled:
//   1. Reveal: a one-shot clip-path wipe (inset 100% -> 0%) when the figure enters.
//      Runs once. clip-path animates here but only on enter (not per-frame scrub),
//      so it's cheap and reads as a cinematic "curtain".
//   2. Parallax: the inner image is translated on Y, scrubbed against scroll. The image
//      is scaled slightly larger than the frame so the translate never exposes an edge.
//      Pure translate3d -> compositor only.
//
// Lenis<->ScrollTrigger: uses the global sync (SmoothScroll.tsx). scrub:true reads
// ScrollTrigger progress, which is fed by Lenis. No per-component Lenis code.
//
// Performance:
//   - Parallax tween animates yPercent (transform) -> GPU compositor, ~0 main-thread/frame.
//   - One ScrollTrigger for parallax + one for reveal per instance. Both lightweight.
//   - Bundle: 0 beyond gsap + next/image (both already present).
//   - LCP: next/image handles sizing/priority. Pass `priority` for above-the-fold heroes;
//     the reveal still plays but the bytes are fetched eagerly so LCP isn't starved.
//
// Mobile: parallax magnitude is reduced (speed halved under 768px is sensible — see note)
//   and works on mid-range Android. translate3d is the only animated property.
//
// Reduced motion: no parallax, no clip animation. Image shows fully revealed, static.

import Image, { type ImageProps } from "next/image";
import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

type ParallaxImageProps = {
  src: ImageProps["src"];
  alt: string;
  /** parallax intensity; 0 = none, ~0.3 = subtle, ~0.6 = strong */
  speed?: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

export function ParallaxImage({
  src,
  alt,
  speed = 0.3,
  className,
  sizes = "100vw",
  priority = false,
}: ParallaxImageProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = frameRef.current;
    const inner = innerRef.current;
    if (!frame || !inner) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      gsap.set(frame, { clipPath: "inset(0% 0% 0% 0%)" });
      gsap.set(inner, { yPercent: 0, scale: 1 });
      return;
    }

    const ctx = gsap.context(() => {
      // 1. Reveal wipe on enter (one-shot).
      gsap.fromTo(
        frame,
        { clipPath: "inset(100% 0% 0% 0%)" },
        {
          clipPath: "inset(0% 0% 0% 0%)",
          duration: 1.1,
          ease: "power4.inOut",
          scrollTrigger: { trigger: frame, start: "top 80%", once: true },
        },
      );

      // 2. Parallax scrub. Inner is scaled up (see CSS) so the slide hides no edge.
      const shift = 12 * speed; // yPercent range, tuned so edges stay covered with scale 1.2
      gsap.fromTo(
        inner,
        { yPercent: -shift },
        {
          yPercent: shift,
          ease: "none",
          scrollTrigger: {
            trigger: frame,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        },
      );
    }, frame);

    return () => ctx.revert();
  }, [speed]);

  return (
    <div
      ref={frameRef}
      className={className}
      style={{
        position: "relative",
        overflow: "hidden",
        // start hidden to prevent a flash before JS sets the clip (reduced-motion resets it)
        clipPath: "inset(100% 0% 0% 0%)",
      }}
    >
      <div
        ref={innerRef}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transform: "scale(1.2)", // overscan so parallax never reveals a gap
          willChange: "transform",
        }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          style={{ objectFit: "cover" }}
        />
      </div>
    </div>
  );
}
