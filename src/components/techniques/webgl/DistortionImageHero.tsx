'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { useWebGLSupport } from './useWebGLSupport';
import { WebGLBoundary } from './WebGLBoundary';

/**
 * DistortionImageHero
 * ───────────────────
 * The "webgl-hero-onepoint" move (Lando-Norris tier): a hero image on a plane
 * with a fragment shader applying a subtle ripple + RGB-shift that intensifies
 * with scroll velocity or pointer movement.
 *
 * Behaviour
 *  - SSR + no-WebGL + reduced-motion  → a plain <img> (the poster). The WebGL
 *    Canvas only mounts on top of it once capability + lazy-mount pass.
 *  - The <img> stays in the DOM under the Canvas, so the LCP element is real
 *    and the swap is invisible (the texture renders the same pixels at rest).
 *  - Lazy: the heavy three/R3F chunk loads only when this hero is near the
 *    viewport (IntersectionObserver), then code-split via dynamic import.
 *  - Velocity: pass `velocityRef` (a ref whose .current is a 0..1 scroll speed,
 *    e.g. driven by Lenis) OR rely on the built-in pointer-velocity tracking.
 *  - Pauses the frameloop when offscreen / tab hidden. DPR capped (default 2,
 *    images benefit from sharpness; drop to 1.5 on mobile if needed).
 *
 * Performance budget
 *  - Frame: ~0.4–0.9ms. Fragment is 3 texture taps (RGB split) + cheap sines.
 *    Trivial vs the 4ms budget. Mid-range Android: fine at DPR 1.5.
 *  - First load: three + R3F ≈ 150KB gzip. This MUST be code-split to the hero
 *    route only — the dynamic import below + the `mounted` gate keep it out of
 *    the initial bundle and defer the fetch until the hero is in view.
 *  - LCP: unaffected — the <img> is the LCP element and paints immediately.
 */

const DistortionScene = dynamic(() => import('./DistortionImageHero.scene'), {
  ssr: false,
  loading: () => null,
});

export type DistortionImageHeroProps = {
  src: string;
  /** Alt text for the underlying <img> (accessibility + the poster). */
  alt: string;
  /** Distortion strength multiplier. 1 = tuned default. */
  intensity?: number;
  /** Max device pixel ratio for the Canvas. Default 2. */
  dprCap?: number;
  /**
   * Optional external scroll-velocity ref (0..1). If supplied, the shader uses
   * the max of this and the internal pointer velocity. Wire it from Lenis:
   *   onScroll(({ velocity }) => velRef.current = Math.min(1, Math.abs(velocity)/40))
   */
  velocityRef?: React.RefObject<number>;
  className?: string;
  /** Sizes hint for the poster <img>. */
  sizes?: string;
  priority?: boolean;
};

export default function DistortionImageHero({
  src,
  alt,
  intensity = 1,
  dprCap = 2,
  velocityRef,
  className,
  sizes = '100vw',
  priority = true,
}: DistortionImageHeroProps) {
  const webgl = useWebGLSupport();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Lazy-mount the Canvas only when the hero is near the viewport.
  const [near, setNear] = useState(false);
  // Hide the poster only once the GL texture is actually rendering, so there
  // is never a flash of empty Canvas.
  const [glReady, setGlReady] = useState(false);

  useEffect(() => {
    if (!webgl) return;
    const el = wrapperRef.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [webgl]);

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {/* Poster / LCP element / reduced-motion + no-WebGL fallback. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        sizes={sizes}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        draggable={false}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          // Fade the poster out once GL is rendering the same pixels.
          opacity: glReady ? 0 : 1,
          transition: 'opacity 300ms ease',
          userSelect: 'none',
        }}
      />

      {webgl && near && (
        // If the scene throws after mount, the boundary renders nothing and the
        // poster <img> above (still opacity 1, because onReady never fired) stays
        // as the hero. So the worst case is the crisp static image, never black.
        <WebGLBoundary label="DistortionImageHero" fallback={null} onError={() => setGlReady(false)}>
          <DistortionScene
            src={src}
            intensity={intensity}
            dprCap={dprCap}
            externalVelocityRef={velocityRef}
            onReady={() => setGlReady(true)}
          />
        </WebGLBoundary>
      )}
    </div>
  );
}
