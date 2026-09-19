"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

type Statement = {
  eyebrow: string;
  headline: string;
};

const STATEMENTS: readonly Statement[] = [
  { eyebrow: "01 — 任せる", headline: "調査も実装も、AIに。" },
  { eyebrow: "02 — 決める", headline: "何を作るかは、人が。" },
  { eyebrow: "03 — 疑う", headline: "出力は、必ず試す。" },
] as const;

const MOBILE_BREAKPOINT_PX = 768;

/**
 * Manifesto — horizontal-scroll-on-vertical-scroll, pinned + scrubbed.
 *
 * Approach: a 300vh outer wrapper pins on enter; the inner strip is wider
 * than the viewport (3 panels + gaps), and its `x` is tweened from 0 to
 * `-(stripWidth - innerWidth)` over the pinned distance. Because Lenis is
 * already wired to gsap.ticker in <SmoothScroll />, scrub stays frame-perfect.
 *
 * Fallback (reduced-motion OR < 768px): a plain vertical stack of the same
 * statements, content fully visible and indexable. No pin, no horizontal
 * translation, no ScrollTrigger created.
 */
export function Manifesto() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);

  // Resolve once on mount so SSR markup matches the "rich" branch — content
  // is identical in both branches; only the GSAP wiring is gated.
  const [useFallback, setUseFallback] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const mobile = window.matchMedia(
      `(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`,
    ).matches;

    setUseFallback(reduced || mobile);
  }, []);

  useEffect(() => {
    if (useFallback) return;
    const section = sectionRef.current;
    const strip = stripRef.current;
    const inner = innerRef.current;
    if (!section || !strip || !inner) return;

    ScrollTrigger.normalizeScroll(false);

    const ctx = gsap.context(() => {
      const getDistance = () => {
        // How far the strip needs to translate so its right edge meets the
        // viewport's right edge. Recomputed on resize via invalidateOnRefresh.
        const stripWidth = strip.scrollWidth;
        const innerWidth = inner.clientWidth;
        return Math.max(0, stripWidth - innerWidth);
      };

      const tween = gsap.to(strip, {
        x: () => -getDistance(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${getDistance()}`,
          pin: true,
          pinSpacing: true,
          scrub: 1,
          invalidateOnRefresh: true,
          anticipatePin: 1,
        },
      });

      // Keep ScrollTrigger's measured distance in sync with the real DOM.
      const onResize = () => ScrollTrigger.refresh();
      window.addEventListener("resize", onResize);

      return () => {
        window.removeEventListener("resize", onResize);
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    }, section);

    return () => ctx.revert();
  }, [useFallback]);

  if (useFallback) {
    return (
      <section
        aria-label="Manifesto"
        className="bg-[var(--accent)] text-[var(--on-accent)] py-[var(--space-24)] sm:py-[var(--space-32)]"
      >
        <div className="container-editorial">
          <p className="font-mono-accent text-[var(--on-accent)]/70 mb-12">
            — Manifesto
          </p>
          <ul className="flex flex-col gap-[var(--space-16)] sm:gap-[var(--space-24)]">
            {STATEMENTS.map((s) => (
              <li key={s.eyebrow}>
                <p className="font-mono-accent text-[var(--on-accent)]/70 mb-4">
                  {s.eyebrow}
                </p>
                <h2
                  className="font-display font-bold leading-[0.92] tracking-[-0.04em]"
                  style={{ fontSize: "clamp(2.5rem, 12vw, 6rem)" }}
                >
                  {s.headline}
                </h2>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      aria-label="Manifesto"
      className="relative bg-[var(--accent)] text-[var(--on-accent)] overflow-hidden"
      style={{ height: "100vh" }}
    >
      <div
        ref={innerRef}
        className="relative h-full w-full overflow-hidden flex items-center"
      >
        <p
          className="font-mono-accent absolute left-[var(--pad-x)] top-[max(6rem,12vh)] text-[var(--on-accent)]/70 z-10"
          aria-hidden="true"
        >
          — Manifesto
        </p>

        <div
          ref={stripRef}
          className="flex items-center will-change-transform"
          style={{
            paddingInline: "var(--pad-x)",
            gap: "clamp(6rem, 14vw, 16rem)",
          }}
        >
          {STATEMENTS.map((s) => (
            <article
              key={s.eyebrow}
              className="flex-none flex flex-col justify-center"
            >
              <p className="font-mono-accent text-[var(--on-accent)]/70 mb-6">
                {s.eyebrow}
              </p>
              <h2
                className="font-display font-bold leading-[0.92] tracking-[-0.04em] whitespace-nowrap"
                style={{ fontSize: "clamp(4rem, 14vw, 14rem)" }}
              >
                {s.headline}
              </h2>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
