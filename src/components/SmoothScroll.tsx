"use client";

import { useEffect } from "react";
import type Lenis from "lenis";

/**
 * SmoothScroll — Lenis instance + GSAP ticker wiring, deferred.
 *
 * Lenis runs through `gsap.ticker` so ScrollTrigger always reads scroll
 * positions on the same frame Lenis writes them. Without this, scrub
 * timelines stutter half a frame behind the real scroll.
 *
 * Deferral strategy: the Lenis bundle (~25KB gz) and its initialization are
 * pushed out of the critical path via dynamic import + requestIdleCallback.
 * Until idle, the page uses native scroll. Once Lenis is up, smooth scroll
 * takes over without a visible flicker (Lenis preserves current scrollY on
 * boot). Net effect: FCP/LCP no longer include Lenis JS evaluation.
 *
 * Honors prefers-reduced-motion: never initializes, native scrolling stays.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let lenisInstance: Lenis | null = null;
    let tickerCallback: ((t: number) => void) | null = null;
    let onScroll: (() => void) | null = null;
    let cancelled = false;

    const init = async () => {
      if (cancelled) return;
      const [{ default: LenisCtor }, { gsap, ScrollTrigger }] = await Promise.all([
        import("lenis"),
        import("@/lib/gsap"),
      ]);
      if (cancelled) return;

      const lenis = new LenisCtor({
        lerp: 0.1,
        smoothWheel: true,
        syncTouch: false,
      });
      lenisInstance = lenis;

      onScroll = () => ScrollTrigger.update();
      lenis.on("scroll", onScroll);

      tickerCallback = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(tickerCallback);
      gsap.ticker.lagSmoothing(0);

      // Recompute every ScrollTrigger's start/end NOW. The technique triggers
      // were created at their own mount — before Lenis took over the scroll and
      // (often) before the Fraunces webfont reflowed the text. Both shift
      // element positions, so without this refresh the scroll-reveals
      // (opacity 0 -> 1) measure against stale offsets and many never fire,
      // leaving sections visibly blank. Refresh again once webfonts settle.
      ScrollTrigger.refresh();
      if (document.fonts?.ready) {
        void document.fonts.ready.then(() => {
          if (!cancelled) ScrollTrigger.refresh();
        });
      }
    };

    type IdleWindow = Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const w = window as IdleWindow;
    let idleHandle: number | undefined;
    let timeoutHandle: number | undefined;

    if (typeof w.requestIdleCallback === "function") {
      idleHandle = w.requestIdleCallback(() => void init(), { timeout: 1500 });
    } else {
      timeoutHandle = window.setTimeout(() => void init(), 800);
    }

    return () => {
      cancelled = true;
      if (idleHandle !== undefined && w.cancelIdleCallback) {
        w.cancelIdleCallback(idleHandle);
      }
      if (timeoutHandle !== undefined) {
        window.clearTimeout(timeoutHandle);
      }
      if (lenisInstance) {
        void (async () => {
          const { gsap, ScrollTrigger } = await import("@/lib/gsap");
          if (tickerCallback) gsap.ticker.remove(tickerCallback);
          if (onScroll) lenisInstance?.off("scroll", onScroll);
          ScrollTrigger.getAll().forEach((t) => t.kill());
          lenisInstance?.destroy();
        })();
      }
    };
  }, []);

  return null;
}
