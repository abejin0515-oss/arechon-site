"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

type Step = {
  index: string;
  name: string;
  body: string;
};

const STEPS: readonly Step[] = [
  {
    index: "01",
    name: "Listen",
    body: "事業の文脈を聞き、勝ち筋を見つける。提案ではなく、診断から始める。",
  },
  {
    index: "02",
    name: "Build",
    body: "Next.js + Tailwind v4 を素早く、正しく組む。Claude Code でレビューを並列化。",
  },
  {
    index: "03",
    name: "Operate",
    body: "月7,500円の薄保守。ドメイン管理から障害対応まで一括で受け持つ。",
  },
  {
    index: "04",
    name: "Grow",
    body: "アクセス解析からコピー改善まで、3ヶ月後の数字に責任を持つ。",
  },
] as const;

const MOBILE_BREAKPOINT_PX = 768;

/**
 * Process — pinned + scrubbed vertical cross-fade of 4 steps.
 *
 * Approach: one section pins for `STEPS.length * 100vh`. A single timeline
 * holds 4 frames (one per step) with opacity tweens that cross-fade between
 * neighbors; `scrub: 1` ties the timeline head to scroll progress, and a
 * dedicated `progress` element scales 0 → 1 over the same range so the user
 * sees their position through the section.
 *
 * Fallback (reduced-motion OR < 768px): all 4 steps render as a normal
 * vertical stack with a soft fade-in via IntersectionObserver. No pin, no
 * scrub, no measurement — content fully visible if JS fails.
 */
export function Process() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const stepRefs = useRef<Array<HTMLDivElement | null>>([]);
  const progressRef = useRef<HTMLDivElement | null>(null);

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
    const stage = stageRef.current;
    const progress = progressRef.current;
    const steps = stepRefs.current.filter(
      (el): el is HTMLDivElement => el !== null,
    );
    if (!section || !stage || !progress || steps.length !== STEPS.length) {
      return;
    }

    ScrollTrigger.normalizeScroll(false);

    const ctx = gsap.context(() => {
      // Initialize: step 0 visible, others hidden.
      gsap.set(steps[0], { opacity: 1, y: 0 });
      gsap.set(steps.slice(1), { opacity: 0, y: 24 });
      gsap.set(progress, { scaleY: 0, transformOrigin: "top center" });

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${window.innerHeight * STEPS.length}`,
          pin: stage,
          pinSpacing: true,
          scrub: 1,
          invalidateOnRefresh: true,
          anticipatePin: 1,
        },
      });

      // Cross-fade through steps. Each step "owns" one unit of timeline,
      // so STEPS.length total units == STEPS.length viewport-heights of scroll.
      for (let i = 0; i < steps.length - 1; i += 1) {
        const current = steps[i];
        const next = steps[i + 1];
        // Hold a beat on the current step, then cross-fade.
        tl.to(current, { opacity: 1, y: 0, duration: 0.6 }, i)
          .to(current, { opacity: 0, y: -24, duration: 0.4 }, i + 0.6)
          .to(next, { opacity: 1, y: 0, duration: 0.4 }, i + 0.6);
      }
      // Hold the last step for one final beat.
      tl.to(steps[steps.length - 1], { opacity: 1, duration: 0.6 }, steps.length - 1);

      // Progress bar — independent tween so it tracks scroll, not the
      // step timeline's local progress.
      gsap.to(progress, {
        scaleY: 1,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${window.innerHeight * STEPS.length}`,
          scrub: true,
          invalidateOnRefresh: true,
        },
      });

      const onResize = () => ScrollTrigger.refresh();
      window.addEventListener("resize", onResize);

      return () => {
        window.removeEventListener("resize", onResize);
      };
    }, section);

    return () => ctx.revert();
  }, [useFallback]);

  if (useFallback) {
    return (
      <section
        id="process"
        aria-label="Process"
        className="bg-[var(--bg)] text-[var(--fg)] py-[var(--space-24)] sm:py-[var(--space-32)]"
      >
        <div className="container-editorial">
          <p className="font-mono-accent text-[var(--muted)] mb-12">— Process</p>
          <ol className="flex flex-col gap-[var(--space-16)] sm:gap-[var(--space-24)]">
            {STEPS.map((s) => (
              <li
                key={s.index}
                className="grid grid-cols-12 gap-x-[var(--space-6)] sm:gap-x-[var(--space-8)] items-start"
              >
                <div className="col-span-12 sm:col-span-5">
                  <p
                    className="font-display font-bold leading-[0.85] tracking-[-0.04em] text-[var(--accent)]"
                    style={{ fontSize: "clamp(5rem, 18vw, 12rem)" }}
                  >
                    {s.index}
                  </p>
                </div>
                <div className="col-span-12 sm:col-span-7 sm:pt-[var(--space-8)]">
                  <h3 className="type-h1 font-display mb-4">{s.name}</h3>
                  <p className="type-body max-w-[40ch] text-[var(--fg)]/85">
                    {s.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      id="process"
      aria-label="Process"
      className="relative bg-[var(--bg)] text-[var(--fg)]"
      style={{ height: `${(STEPS.length + 1) * 100}vh` }}
    >
      <div
        ref={stageRef}
        className="relative h-screen w-full overflow-hidden flex items-center"
      >
        <p
          className="font-mono-accent absolute left-[var(--pad-x)] top-[max(6rem,10vh)] text-[var(--muted)] z-10"
          aria-hidden="true"
        >
          — Process
        </p>

        {/* Progress indicator — a thin vertical bar pinned to the right edge. */}
        <div
          className="absolute right-[var(--pad-x)] top-1/2 -translate-y-1/2 h-[40vh] w-px bg-[var(--border)] z-10"
          aria-hidden="true"
        >
          <div
            ref={progressRef}
            className="absolute inset-0 bg-[var(--accent)] origin-top"
            style={{ transform: "scaleY(0)" }}
          />
        </div>

        {/* Stacked steps — all stacked in the same grid cell, opacity-cross-faded. */}
        <div className="container-editorial relative w-full">
          <div className="relative">
            {STEPS.map((s, i) => (
              <div
                key={s.index}
                ref={(el) => {
                  stepRefs.current[i] = el;
                }}
                className={
                  i === 0
                    ? "grid grid-cols-12 gap-x-[var(--space-6)] sm:gap-x-[var(--space-8)] items-center"
                    : "absolute inset-0 grid grid-cols-12 gap-x-[var(--space-6)] sm:gap-x-[var(--space-8)] items-center"
                }
                aria-hidden={i === 0 ? undefined : "true"}
              >
                <div className="col-span-12 sm:col-span-5">
                  <p
                    className="font-display font-bold leading-[0.85] tracking-[-0.04em] text-[var(--accent)] select-none"
                    style={{ fontSize: "clamp(8rem, 26vw, 22rem)" }}
                  >
                    {s.index}
                  </p>
                </div>
                <div className="col-span-12 sm:col-span-7">
                  <h3 className="type-h1 font-display mb-6">{s.name}</h3>
                  <p className="type-body max-w-[40ch] text-[var(--fg)]/85">
                    {s.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SEO/no-JS fallback: every step also lives in the DOM as a hidden
          list so search engines see the full content even though the visual
          layer cross-fades. Wrapped in sr-only so it doesn't double-render. */}
      <ol className="sr-only">
        {STEPS.map((s) => (
          <li key={`${s.index}-sr`}>
            <h3>
              {s.index} — {s.name}
            </h3>
            <p>{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
