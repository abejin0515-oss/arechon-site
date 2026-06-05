"use client";

// ScrollWorldTransition — a pinned section that cross-fades / swaps between 2-3 "scenes"
// as you scrub through it. Scroll = scene change, not travel. The "scroll-world-transition"
// signature (Cartier).
//
// Mechanic: the section is pinned for (scenes.length) viewport-heights of scroll. A single
// scrubbed timeline cross-fades scene N out while scene N+1 fades/scales in. Scenes are
// stacked absolutely; only opacity + a subtle scale animate (compositor-friendly).
//
// Lenis<->ScrollTrigger: REQUIRES the global sync (SmoothScroll.tsx). Pin + scrub both read
// ScrollTrigger progress fed by Lenis. Without the sync the pin would fight Lenis's transform.
// This is the technique that most needs the sync wired — see SmoothScroll.tsx.
//
// Performance:
//   - Animates opacity + scale only. No layout, no paint of new content per frame
//     (all scenes mounted up front). 1 ScrollTrigger (pin) + 1 scrubbed timeline.
//   - Pin uses pinSpacing so layout is stable; anticipatePin smooths the pin handoff.
//   - Cost: with 3 scenes, 2 cross-fade segments = a handful of tweens, < 1ms/frame.
//   - Bundle: 0 beyond gsap/ScrollTrigger.
//
// Mobile: works on mid-range Android. Pinning long sections on mobile can feel heavy if
//   scenes contain video — keep scene media lazy/poster'd. Reduce to 2 scenes on small
//   screens if needed (caller controls the array).
//
// Reduced motion: NO pin, NO scrub. Scenes render stacked in normal flow (each full-height,
//   scrollable) so the content is fully reachable without motion. Opacity all 1.

import { useEffect, useRef, type ReactNode } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

type ScrollWorldTransitionProps = {
  /** 2-3 scene nodes */
  scenes: ReactNode[];
  className?: string;
};

export function ScrollWorldTransition({ scenes, className }: ScrollWorldTransitionProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sceneEls = Array.from(
      section.querySelectorAll<HTMLElement>("[data-scene]"),
    );
    if (sceneEls.length < 2 || reduced) {
      // Reduced motion / degenerate: show everything, no pin.
      gsap.set(sceneEls, { opacity: 1, scale: 1, position: "relative" });
      return;
    }

    const ctx = gsap.context(() => {
      // Stack scenes absolutely; first visible, rest hidden.
      gsap.set(sceneEls, {
        position: "absolute",
        inset: 0,
        opacity: 0,
        scale: 1.04,
      });
      gsap.set(sceneEls[0], { opacity: 1, scale: 1 });

      const segments = sceneEls.length - 1; // number of transitions
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${window.innerHeight * segments}`,
          pin: true,
          scrub: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      // Hold each scene, then cross-fade to the next. A short hold makes scenes "land".
      for (let i = 0; i < segments; i++) {
        const current = sceneEls[i];
        const next = sceneEls[i + 1];
        tl.to({}, { duration: 0.4 }); // hold current
        tl.to(current, { opacity: 0, scale: 0.98, duration: 0.6 }, ">");
        tl.to(next, { opacity: 1, scale: 1, duration: 0.6 }, "<");
      }
      tl.to({}, { duration: 0.4 }); // hold last
    }, section);

    return () => ctx.revert(); // reverts pin spacing + tweens + ScrollTrigger
  }, [scenes.length]);

  return (
    <section
      ref={sectionRef}
      className={className}
      style={{ position: "relative", height: "100vh", overflow: "hidden" }}
    >
      {scenes.map((scene, i) => (
        <div
          key={i}
          data-scene
          style={{ width: "100%", height: "100vh", willChange: "opacity, transform" }}
        >
          {scene}
        </div>
      ))}
    </section>
  );
}
