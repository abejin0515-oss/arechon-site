'use client';

import { useEffect, useState } from 'react';

/**
 * Detects whether the current environment should render WebGL at all.
 *
 * Returns `false` (force the static fallback) when:
 *  - SSR (no window yet)
 *  - the user prefers reduced motion
 *  - WebGL context creation fails (very old / blocked GPUs)
 *  - deviceMemory reports a low-end device (<= 4GB) — optional guard
 *
 * The first paint is intentionally `false` so SSR + the very first client
 * frame both show the cheap static poster; we only flip to WebGL after the
 * capability check passes. This avoids hydration mismatch and CLS.
 */
export function useWebGLSupport(opts: { respectLowMemory?: boolean } = {}): boolean {
  const { respectLowMemory = true } = opts;
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Diagnostic / power-user override. `?webgl=force` bypasses the software-
    // renderer rejection (lets us observe the real scenes under SwiftShader in
    // headless CI); `?webgl=off` forces the static posters. Never affects
    // production users unless they opt in via the URL.
    const override = (() => {
      try {
        const v = new URLSearchParams(window.location.search).get('webgl');
        return v === 'force' || v === 'off' ? v : null;
      } catch {
        return null;
      }
    })();

    const evaluate = () => {
      if (override === 'off') {
        setEnabled(false);
        return;
      }
      if (reduced.matches && override !== 'force') {
        setEnabled(false);
        return;
      }

      // Low-memory Android / cheap tablets: bail to poster.
      if (respectLowMemory) {
        const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
        if (typeof mem === 'number' && mem <= 1) {
          setEnabled(false);
          return;
        }
      }

      // Probe a real context, then throw it away.
      try {
        const canvas = document.createElement('canvas');
        const gl =
          canvas.getContext('webgl2') ||
          canvas.getContext('webgl') ||
          canvas.getContext('experimental-webgl');
        if (!gl) {
          setEnabled(false);
          return;
        }

        // Reject SOFTWARE rasterizers (SwiftShader / llvmpipe / Microsoft Basic
        // Render / Apple software). They pass the context probe but render heavy
        // R3F+physics scenes slowly and often visibly WRONG (e.g. the physics
        // arena paints as a flat white box). On these, the static poster
        // fallback is both faster and correct, so force it. This is the common
        // case when a desktop GPU is blocklisted and Chrome falls back to
        // SwiftShader — exactly what produces the "blank white demo" report.
        const dbg = (gl as WebGLRenderingContext).getExtension(
          'WEBGL_debug_renderer_info',
        );
        const renderer = dbg
          ? String(
              (gl as WebGLRenderingContext).getParameter(
                dbg.UNMASKED_RENDERER_WEBGL,
              ),
            )
          : '';
        if (
          override !== 'force' &&
          /swiftshader|software|llvmpipe|basic render|microsoft basic|apple software/i.test(renderer)
        ) {
          setEnabled(false);
          return;
        }

        // Release the probe context immediately.
        const lose = (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context');
        lose?.loseContext();
        setEnabled(true);
      } catch {
        setEnabled(false);
      }
    };

    evaluate();
    reduced.addEventListener('change', evaluate);
    return () => reduced.removeEventListener('change', evaluate);
  }, [respectLowMemory]);

  return enabled;
}
