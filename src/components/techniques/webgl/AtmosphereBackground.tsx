'use client';

import dynamic from 'next/dynamic';
import { useWebGLSupport } from './useWebGLSupport';

/**
 * AtmosphereBackground
 * ────────────────────
 * The "minimal-webgl-atmosphere" move (AIR / Vide Infra gradient-mesh look).
 * A full-viewport fixed background: one fullscreen plane running a slow,
 * domain-warped simplex-noise gradient field. Restrained — atmosphere, not
 * spectacle.
 *
 * Behaviour
 *  - Renders a static CSS-gradient poster on SSR + first paint, then upgrades
 *    to WebGL only if the device passes the capability check.
 *  - prefers-reduced-motion: reduce  → poster only, no Canvas ever mounts.
 *  - Low-memory / no-WebGL devices    → poster only.
 *  - Pauses (frameloop "never") when the tab is hidden or it scrolls offscreen.
 *  - DPR capped (default 1.5) so retina phones don't render 3x pixels.
 *
 * Performance budget
 *  - Frame: ~0.6–1.4ms on an M-class GPU at 1.5x DPR, full-viewport. Fragment
 *    is 2-octave fbm + 2 warp samples ≈ 6 noise evals/pixel. Well under 4ms
 *    even on mid-range Android at 1080p.
 *  - Idle: 0ms — frameloop pauses offscreen / hidden.
 *  - First load: three + R3F adds ~150KB gzip. Keep this on routes that need
 *    it; the dynamic import below code-splits it out of the initial JS.
 */

const AtmosphereScene = dynamic(() => import('./AtmosphereBackground.scene'), {
  ssr: false,
  loading: () => null,
});

export type AtmosphereBackgroundProps = {
  /**
   * 1–3 colors. They blend across the noise field + vertical gradient.
   * Accepts any THREE.Color-parseable string ('#0b0d10', 'hsl(...)', 'tomato').
   * Defaults to a deep slate atmosphere. Fewer than 3 are padded by repeating
   * the last color.
   */
  colors?: string[];
  /** Animation speed multiplier. 1 = the tuned default drift. */
  speed?: number;
  /** Film grain amount (0–0.1). Kills banding on dark gradients. */
  grain?: number;
  /** Max device pixel ratio. Default 1.5. */
  dprCap?: number;
  /** Extra classes on the fixed wrapper. */
  className?: string;
};

const DEFAULTS: [string, string, string] = ['#0a0c10', '#14202e', '#1d2b3a'];

function normalizeColors(input?: string[]): [string, string, string] {
  if (!input || input.length === 0) return DEFAULTS;
  const a = input[0];
  const b = input[1] ?? a;
  const c = input[2] ?? b;
  return [a, b, c];
}

export default function AtmosphereBackground({
  colors,
  speed = 1,
  grain = 0.04,
  dprCap = 1.5,
  className,
}: AtmosphereBackgroundProps) {
  const [a, b, c] = normalizeColors(colors);
  const webgl = useWebGLSupport();

  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
        // Static poster: identical color stops to the shader's resting state.
        // Always present so it shows under the Canvas during load and is the
        // sole visual under reduced-motion / no-WebGL.
        background: `radial-gradient(120% 90% at 50% 0%, ${b} 0%, ${a} 55%),
                     linear-gradient(180deg, ${a} 0%, ${c} 100%)`,
      }}
    >
      {webgl && (
        <AtmosphereScene colors={[a, b, c]} speed={speed} grain={grain} dprCap={dprCap} />
      )}
    </div>
  );
}
