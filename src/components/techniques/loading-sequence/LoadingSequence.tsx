"use client";

// LoadingSequence — the client controller half of the "幕開け" technique.
//
// This component renders NOTHING. The curtain itself is static SSR DOM
// (#intro-curtain) emitted by its sibling <IntroCurtain /> (./IntroCurtain.tsx),
// so it covers the page from frame 0 (kills the blank-first-frame flash). This
// component's only job: when the page is actually ready, grab that static node,
// play the reveal-out, and remove() it. Because the curtain lives OUTSIDE
// React's tree, there is no hydration mismatch by construction.
//
// EXIT TRIGGER — real-load driven, NOT a fixed fake duration:
//   exit = Promise.race([
//     Promise.allSettled([ document.fonts.ready, firstFramePainted ]),
//     wait(900)  // hard cap so it can never hang
//   ])
//   - document.fonts.ready: the curtain doubles as a FOUT mask for the Fraunces
//     display face — open only once the real type has landed.
//   - firstFramePainted: two rAFs, i.e. the page behind has painted ≥1 frame.
//   - WebGL (AtmosphereBackground) is intentionally NOT awaited; it boots behind
//     the lifted curtain.
//   Fast connections exit in ~200–400ms; slow ones always open by 900ms.
//
// REVEAL-OUT:
//   - wordmark leaves first (up 8px + fade, 0.25s) — a small sense of sequence.
//   - then two panels slide apart, yPercent ±100 (compositor-only transform),
//     0.7s, ease cubic-bezier(0.16,1,0.3,1) (expo.out — snap open, settle still),
//     stagger 0.04 so the split reads as a "crack".
//   - a 1px accent hairline runs the seam for one beat (scaleX 0→1→fade, 0.4s).
//   Curtain bg already equals the page --bg, so the split has zero color jump.
//
// SCROLL LOCK: overflow:hidden on BOTH <html> and <body> while the curtain is up
//   (which element owns scroll differs across browsers, notably iOS Safari).
//
// REDUCED MOTION: the curtain is hidden by CSS (@media reduce); we detect it,
//   skip all animation, and just fire onComplete so parent gating proceeds.
//   (We do not touch the DOM node in that case — CSS already hid it.)
//
// Performance: one gsap timeline, transform/opacity only -> compositor. Bundle:
//   0 beyond gsap (already a dependency). Mobile: full support.

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { INTRO_KEY } from "./constants";

type LoadingSequenceProps = {
  /** sessionStorage key; bump to force a re-show during dev */
  sessionKey?: string;
  /** called once the curtain has fully lifted (or was skipped) */
  onComplete?: () => void;
};

/** expo.out-equivalent — snaps open then settles to rest. */
const EASE_EXPO_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";

/** Resolve after two animation frames = the page behind has painted ≥1 frame. */
function firstFramePainted(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/** Resolve after `ms`. The hard cap that prevents the curtain ever hanging. */
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function LoadingSequence({
  sessionKey = INTRO_KEY,
  onComplete,
}: LoadingSequenceProps) {
  // onComplete is held in a ref so an inline-function parent prop does not churn
  // the effect deps (which would kill the timeline mid-reveal on a parent
  // re-render). The ref always points at the latest callback.
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    // Mark the intro as seen for the rest of the session (covers every exit
    // path below: skipped, animated, or capped).
    const markSeen = () => {
      try {
        sessionStorage.setItem(sessionKey, "1");
      } catch {
        /* private mode etc. — next load just shows it again */
      }
    };

    // ── Decide whether to run the reveal at all ────────────────────────────
    let seen = false;
    try {
      seen = sessionStorage.getItem(sessionKey) === "1";
    } catch {
      /* unreadable -> fall to showing it (seen stays false) */
    }
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // Skip paths: the curtain is already CSS-hidden (data-intro-seen / @media
    // reduce). Just stamp + notify the parent, render nothing.
    if (seen || reduced) {
      markSeen();
      onCompleteRef.current?.();
      return;
    }

    const curtain = document.getElementById("intro-curtain");
    // If the static curtain is missing for any reason, degrade gracefully:
    // don't block the page, just complete.
    if (!curtain) {
      markSeen();
      onCompleteRef.current?.();
      return;
    }

    const topPanel = curtain.querySelector<HTMLElement>(
      ".intro-curtain__panel--top",
    );
    const bottomPanel = curtain.querySelector<HTMLElement>(
      ".intro-curtain__panel--bottom",
    );
    const seam = curtain.querySelector<HTMLElement>(".intro-curtain__seam");
    const wordmark = curtain.querySelector<HTMLElement>(
      ".intro-curtain__wordmark",
    );

    // ── Scroll lock (both html and body — see header note) ─────────────────
    const html = document.documentElement;
    const body = document.body;
    const prev = { html: html.style.overflow, body: body.style.overflow };
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    const unlock = () => {
      html.style.overflow = prev.html;
      body.style.overflow = prev.body;
    };

    let tl: gsap.core.Timeline | null = null;
    let cancelled = false;

    const finish = () => {
      unlock();
      markSeen();
      // Remove the static node entirely — it is React-external, so a plain
      // remove() is correct and leaves no orphaned willChange layers.
      curtain.remove();
      onCompleteRef.current?.();
    };

    // ── Build the reveal-out timeline (paused until we're actually ready) ───
    const buildTimeline = () => {
      if (cancelled) return;
      const t = gsap.timeline({ onComplete: finish });

      // (a) wordmark leaves first — small sense of sequence.
      if (wordmark) {
        t.to(wordmark, {
          y: -8,
          opacity: 0,
          duration: 0.25,
          ease: "power2.in",
        });
      }

      // (b) panels split apart — compositor-only transform.
      t.to(
        [topPanel, bottomPanel],
        {
          yPercent: (i: number) => (i === 0 ? -100 : 100),
          duration: 0.7,
          ease: EASE_EXPO_OUT,
          stagger: 0.04,
        },
        wordmark ? ">-0.05" : 0,
      );

      // (c) accent hairline runs the seam for one beat, concurrent with split.
      if (seam) {
        t.fromTo(
          seam,
          { scaleX: 0, opacity: 1 },
          { scaleX: 1, duration: 0.4, ease: EASE_EXPO_OUT },
          "<",
        ).to(seam, { opacity: 0, duration: 0.2, ease: "power1.out" }, ">-0.1");
      }

      tl = t;
    };

    // ── Exit trigger: real readiness, capped at 900ms ──────────────────────
    const fontsReady: Promise<unknown> = document.fonts
      ? document.fonts.ready
      : Promise.resolve();

    Promise.race([
      Promise.allSettled([fontsReady, firstFramePainted()]),
      wait(900),
    ]).then(() => {
      buildTimeline();
    });

    // ── Cleanup: kill any timeline, always restore scroll ──────────────────
    return () => {
      cancelled = true;
      tl?.kill();
      unlock();
    };
  }, [sessionKey]); // onComplete is ref'd, intentionally not a dep

  // This component renders no DOM — the curtain is the static SSR node.
  return null;
}
