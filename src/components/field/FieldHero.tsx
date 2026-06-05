'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useWebGLSupport } from '@/components/techniques/webgl/useWebGLSupport';
import { WebGLBoundary } from '@/components/techniques/webgl/WebGLBoundary';
import type { FieldSceneProps } from './FieldHero.scene';

/* ════════════════════════════════════════════════════════════════════════════
 * FieldHero — client shell
 * ────────────────────────────────────────────────────────────────────────────
 * Owns: capability gate, error boundary, the near-black + single-accent static
 * poster (the sole visual under reduced-motion / no-WebGL / software-renderer /
 * scene-crash), quality tiering, and the minimal type overlay.
 *
 * The dynamic import code-splits three + R3F + postprocessing out of the route's
 * initial JS, and ssr:false guarantees no window/document access on the server.
 * ════════════════════════════════════════════════════════════════════════════ */

const FieldScene = dynamic(() => import('./FieldHero.scene'), {
  ssr: false,
  loading: () => null,
});

/* -------------------------------------------------------------------------- */
/*  Palette — ONE accent.                                                       */
/*  Cold desaturated blue-white ≈ 470–490nm, the real emission band of marine  */
/*  bioluminescence (dinoflagellates / Aequorea). Low chroma = premium, not    */
/*  "AI-glow neon". Bloom supplies the richness; no second hue anywhere.        */
/* -------------------------------------------------------------------------- */

const GROUND = '#04070b'; // near-black ink water
const GROUND_2 = '#070d14'; // a touch of depth at the floor
const ACCENT = '#9fd4e8'; // bioluminescent blue-white (the single accent)
const ACCENT_CORE = '#eaf6fb'; // hot core the particles blow out toward

/* -------------------------------------------------------------------------- */
/*  Quality tiers                                                               */
/* -------------------------------------------------------------------------- */

type Tier = Omit<FieldSceneProps, 'accent' | 'ground' | 'ground2'>;

const TIER_DESKTOP: Tier = {
  count: 11000,
  dprCap: 2,
  bloom: 0.9,
  bloomKernel: 3,
  flow: 1,
};

const TIER_MID: Tier = {
  count: 7000,
  dprCap: 1.75,
  bloom: 0.8,
  bloomKernel: 2,
  flow: 1,
};

const TIER_MOBILE: Tier = {
  count: 4200,
  dprCap: 1.5,
  bloom: 0.7,
  bloomKernel: 1,
  flow: 1,
};

/**
 * Pick a tier from coarse device signals. Conservative on touch / low memory so
 * the post stack (Bloom is the cost) never tanks a mid-range Android.
 */
function pickTier(): Tier {
  if (typeof window === 'undefined') return TIER_MID;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 8;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const narrow = window.matchMedia('(max-width: 768px)').matches;

  if (coarse || narrow || mem <= 4 || cores <= 4) {
    return mem <= 4 || cores <= 4 ? TIER_MOBILE : TIER_MID;
  }
  return TIER_DESKTOP;
}

/* -------------------------------------------------------------------------- */
/*  Static poster — near-black water with a single cold luminous bloom.         */
/*  Pure CSS, no animation. This is what reduced-motion / no-WebGL users see,   */
/*  and it must look intentional on its own — not "the thing failed".           */
/* -------------------------------------------------------------------------- */

function Poster() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        background: [
          // The single accent glow, sunk in the ink — off-center, like a distant
          // bioluminescent bloom under water.
          `radial-gradient(70% 55% at 42% 38%, ${ACCENT}1f 0%, ${ACCENT}0d 26%, transparent 62%)`,
          `radial-gradient(40% 30% at 62% 64%, ${ACCENT_CORE}14 0%, transparent 60%)`,
          `radial-gradient(120% 100% at 50% 0%, ${GROUND_2} 0%, ${GROUND} 60%)`,
          `linear-gradient(180deg, ${GROUND} 0%, #02050a 100%)`,
        ].join(','),
      }}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  FieldHero                                                                   */
/* -------------------------------------------------------------------------- */

export default function FieldHero() {
  const webgl = useWebGLSupport();
  const [tier, setTier] = useState<Tier | null>(null);

  useEffect(() => {
    setTier(pickTier());
  }, []);

  const sceneProps: FieldSceneProps | null = tier
    ? { ...tier, accent: ACCENT, ground: GROUND, ground2: GROUND_2 }
    : null;

  return (
    <section
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100svh',
        overflow: 'hidden',
        background: GROUND,
      }}
    >
      {/* Poster is ALWAYS mounted under the canvas: it shows during load, under
          reduced-motion / no-WebGL, and through the alpha:true canvas if the GPU
          never paints. The Canvas, when present, draws over it. */}
      <Poster />

      {webgl && sceneProps && (
        <WebGLBoundary label="field" fallback={null}>
          <FieldScene {...sceneProps} />
        </WebGLBoundary>
      )}

      {/* ---- Minimal type overlay. One line + one mono label. Negative space
              does the rest. Field is the subject; text never competes. ---- */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: 'clamp(1.5rem, 5vw, 4rem)',
          pointerEvents: 'none',
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-jetbrains), ui-monospace, monospace',
            fontSize: 'clamp(0.62rem, 1.1vw, 0.72rem)',
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
            color: `${ACCENT}b3`,
          }}
        >
          Arechon — Generative Field
        </p>

        <h1
          style={{
            margin: '0.6rem 0 0',
            fontFamily: 'var(--font-fraunces), Georgia, serif',
            fontWeight: 360,
            fontSize: 'clamp(2.4rem, 7vw, 5.6rem)',
            lineHeight: 1.02,
            letterSpacing: '-0.015em',
            color: ACCENT_CORE,
            maxWidth: '16ch',
            textShadow: `0 0 40px ${ACCENT}26`,
          }}
        >
          光は、暗い水のなかで生まれる。
        </h1>
      </div>

      {/* Top-edge mono coordinate label — quiet, structural. */}
      <div
        style={{
          position: 'absolute',
          top: 'clamp(1.5rem, 5vw, 4rem)',
          left: 'clamp(1.5rem, 5vw, 4rem)',
          right: 'clamp(1.5rem, 5vw, 4rem)',
          display: 'flex',
          justifyContent: 'space-between',
          pointerEvents: 'none',
          fontFamily: 'var(--font-jetbrains), ui-monospace, monospace',
          fontSize: 'clamp(0.58rem, 1vw, 0.66rem)',
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: `${ACCENT}66`,
        }}
      >
        <span>490nm</span>
        <span>bioluminescent / fluid</span>
      </div>
    </section>
  );
}
