'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useWebGLSupport } from '@/components/techniques/webgl/useWebGLSupport';
import { WebGLBoundary } from '@/components/techniques/webgl/WebGLBoundary';

/**
 * GrainExperience
 * ───────────────
 * Client orchestrator for the /grain one-wow.
 *
 * Layering (all over the SSR poster, which is rendered by the server page so it
 * exists from frame 0):
 *   poster (z1, SSR)  →  webgl canvas (z2, client)  →  typography (z3, SSR)
 *
 * The Canvas is dynamically imported (ssr:false) and only mounts once
 * `useWebGLSupport` confirms a real, non-software GPU and motion is allowed.
 * It is wrapped in WebGLBoundary so a mid-flight shader/driver failure swaps to
 * `null` (revealing the poster) instead of unmounting the page. Worst case is
 * always: dark granary + a pool of light + the truth line. Never a white box.
 */

const GrainScene = dynamic(() => import('./GrainScene'), {
  ssr: false,
  loading: () => null,
});

export default function GrainExperience() {
  const webglOk = useWebGLSupport();
  const [reduced, setReduced] = useState(false);

  // Track reduced-motion so the scene renders the static mid-season grain.
  // (useWebGLSupport already forces the poster under reduced motion, so the
  // scene only mounts when motion is allowed — but we keep `reduced` for the
  // ?webgl=force diagnostic path, where the scene can mount under reduced
  // motion and must then present the frozen mid-state.)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  if (!webglOk) {
    // Poster (rendered by the server page) is the whole experience. Nothing to
    // mount — and crucially, no white canvas.
    return null;
  }

  return (
    <div id="grain-canvas">
      <WebGLBoundary label="grain" fallback={null}>
        <GrainScene reduced={reduced} />
      </WebGLBoundary>
    </div>
  );
}
