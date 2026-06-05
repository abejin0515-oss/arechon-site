'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useWebGLSupport } from '@/components/techniques/webgl/useWebGLSupport';
import { WebGLBoundary } from '@/components/techniques/webgl/WebGLBoundary';

/**
 * MotionStage
 * ───────────
 * The shared frame for all three /motion treatments. Guarantees that the worst
 * case is the crisp static photo + label — never a blank box.
 *
 *  - Renders the poster <img> underneath (LCP element + the fallback for SSR,
 *    no-WebGL, software-renderer, reduced-motion, and scene-throw cases).
 *  - Gates the heavy R3F scene on useWebGLSupport AND an IntersectionObserver
 *    lazy-mount, so three/R3F only loads when a stage nears the viewport.
 *  - Fades the poster out ONLY after the scene's first real frame (onReady), so
 *    there is never a flash of empty canvas.
 *  - Wraps the scene in WebGLBoundary: if it throws post-mount, we render the
 *    poster (which is still opacity 1 because onReady never fired).
 *
 * The render-prop `children(onReady)` lets each treatment mount its own scene.
 */
export function MotionStage({
  src,
  alt,
  children,
  className,
}: {
  src: string;
  alt: string;
  /** receives the onReady callback to wire into the scene */
  children: (onReady: () => void) => ReactNode;
  className?: string;
}) {
  const webgl = useWebGLSupport();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
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
      { rootMargin: '300px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [webgl]);

  return (
    <div ref={wrapperRef} className={className} data-gl-ready={glReady ? '1' : '0'}>
      {/* Poster / LCP / universal fallback. Stays visible until GL paints. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        decoding="async"
        draggable={false}
        className="motion-stage__poster"
        style={{ opacity: glReady ? 0 : 1 }}
      />

      {webgl && near && (
        <WebGLBoundary label="MotionStage" fallback={null} onError={() => setGlReady(false)}>
          {children(() => setGlReady(true))}
        </WebGLBoundary>
      )}

      {/* CSS grain + vignette overlay also covers the static fallback, so the
          poster itself never reads as a raw <img>. The WebGL grade matches it. */}
      <div className="motion-stage__grade" aria-hidden />
    </div>
  );
}
