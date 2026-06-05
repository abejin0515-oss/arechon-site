'use client';

import { useEffect } from 'react';
import type Lenis from 'lenis';

/**
 * GrainScroll
 * ───────────
 * Route-scoped smooth-scroll + scroll-progress driver for /grain.
 *
 * The /grain route has its OWN layout (no global Nav/Footer, no global
 * SmoothScroll), so this component owns the Lenis instance for this page and,
 * crucially, publishes a single normalized scroll progress (0..1) onto
 * `window.__grainScroll` for the R3F scene to read each frame.
 *
 * Why a window value and not React state / context: the WebGL scene reads it in
 * its `useFrame` loop (imperatively, off the React render path) exactly like the
 * existing proximity field publishes `seasonRef`. Pushing scroll through React
 * state would re-render on every scroll frame — wasteful and janky. A single
 * mutable number read in the rAF loop is the correct seam.
 *
 * The inheritance-beat fade/rise is also done here with GSAP ScrollTrigger so the
 * motion is JS-driven (project rule: no CSS animation for scroll-linked motion).
 *
 * Reduced motion: Lenis never initializes (native scroll stays). The scene reads
 * progress=0 forever, presenting the calm frozen mid-state; the beats are set
 * fully visible up-front (no scroll reveal). The page is still vertically
 * scrollable as a plain document.
 */
export function GrainScroll() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const w = window as Window & { __grainScroll?: number };
    w.__grainScroll = 0;

    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    let lenis: Lenis | null = null;
    let tickerCb: ((t: number) => void) | null = null;
    let cancelled = false;
    let ctxRevert: (() => void) | null = null;

    const computeProgress = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const y = window.scrollY || doc.scrollTop || 0;
      w.__grainScroll = max > 0 ? Math.min(Math.max(y / max, 0), 1) : 0;
    };

    const init = async () => {
      if (cancelled) return;
      const { gsap, ScrollTrigger } = await import('@/lib/gsap');
      if (cancelled) return;

      // ---- Inheritance beats: JS-driven fade/rise, gated by reduced motion. --
      const beats = gsap.utils.toArray<HTMLElement>('[data-grain-beat]');

      if (reduced) {
        // No pin, no scrub, no smooth scroll. Beats simply visible; the page is
        // a plain readable document. Publish progress from native scroll so the
        // (frozen) scene stays coherent if it ever reads it.
        gsap.set(beats, { opacity: 1, y: 0 });
        computeProgress();
        window.addEventListener('scroll', computeProgress, { passive: true });
        window.addEventListener('resize', computeProgress);
        ctxRevert = () => {
          window.removeEventListener('scroll', computeProgress);
          window.removeEventListener('resize', computeProgress);
        };
        return;
      }

      // ---- Lenis smooth scroll, wired through the GSAP ticker. --------------
      const { default: LenisCtor } = await import('lenis');
      if (cancelled) return;

      lenis = new LenisCtor({ lerp: 0.1, smoothWheel: true, syncTouch: false });

      lenis.on('scroll', () => {
        ScrollTrigger.update();
        computeProgress();
      });

      tickerCb = (time: number) => lenis?.raf(time * 1000);
      gsap.ticker.add(tickerCb);
      gsap.ticker.lagSmoothing(0);

      const ctx = gsap.context(() => {
        // The persistent hero truth (#grain-overlay's statement) is the opening
        // line; as the visitor scrolls into the beats it recedes so the single
        // grain is never crowded by two layers of text. The mono labels stay.
        const heroStatement = document.querySelector<HTMLElement>(
          '#grain-overlay .grain-statement',
        );
        if (heroStatement) {
          gsap.fromTo(
            heroStatement,
            { opacity: 1 },
            {
              opacity: 0,
              ease: 'none',
              scrollTrigger: {
                trigger: document.documentElement,
                start: 'top top',
                end: () => `+=${window.innerHeight * 0.6}`,
                scrub: true,
                invalidateOnRefresh: true,
              },
            },
          );
        }

        beats.forEach((beat) => {
          gsap.fromTo(
            beat,
            { opacity: 0, y: 28 },
            {
              opacity: 1,
              y: 0,
              ease: 'none',
              scrollTrigger: {
                trigger: beat,
                start: 'top 82%',
                end: 'top 50%',
                scrub: true,
                invalidateOnRefresh: true,
              },
            },
          );
          // fade back out as the beat leaves the top — one beat reads at a time,
          // so the single grain is never crowded by stacked text.
          gsap.fromTo(
            beat,
            { opacity: 1 },
            {
              opacity: 0,
              ease: 'none',
              scrollTrigger: {
                trigger: beat,
                start: 'top 28%',
                end: 'top 8%',
                scrub: true,
                invalidateOnRefresh: true,
              },
            },
          );
        });
      });

      ctxRevert = () => ctx.revert();

      computeProgress();
      ScrollTrigger.refresh();
      if (document.fonts?.ready) {
        void document.fonts.ready.then(() => {
          if (!cancelled) {
            ScrollTrigger.refresh();
            computeProgress();
          }
        });
      }
    };

    void init();

    return () => {
      cancelled = true;
      ctxRevert?.();
      if (lenis) {
        void (async () => {
          const { gsap, ScrollTrigger } = await import('@/lib/gsap');
          if (tickerCb) gsap.ticker.remove(tickerCb);
          ScrollTrigger.getAll().forEach((t) => t.kill());
          lenis?.destroy();
        })();
      }
    };
  }, []);

  return null;
}
