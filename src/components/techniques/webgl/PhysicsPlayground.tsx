'use client';

import dynamic from 'next/dynamic';
import { useWebGLSupport } from './useWebGLSupport';
import { WebGLBoundary } from './WebGLBoundary';
import type { CSSProperties } from 'react';

/**
 * PhysicsPlayground
 * ─────────────────
 * The "real-physics-in-the-browser" move (Bruno Simon tier, kept tasteful).
 * A constrained glass arena of soft, branded tokens that fall under gravity,
 * collide, and can be grabbed + thrown with the pointer. One classy
 * interactive moment for a hero or a section — not a full game.
 *
 * Architecture
 *  - This file is the SSR-safe shell: it owns the capability gate and the
 *    STATIC fallback. It carries NO three / rapier imports, so it stays in the
 *    light client bundle.
 *  - The heavy `.scene` module (three + R3F + @react-three/rapier + the Rapier
 *    WASM) is pulled in only on the client, only when the gate passes, via
 *    `dynamic(..., { ssr: false })`. Next 16 requires `ssr: false` to live
 *    inside a Client Component — this file is `'use client'`, so that holds.
 *
 * Capability gate (`useWebGLSupport`) → STATIC fallback when:
 *  - SSR / first paint (poster shown, no hydration mismatch, no CLS)
 *  - prefers-reduced-motion: reduce
 *  - WebGL unavailable / blocked
 *  - low deviceMemory
 * The fallback is a tidy CSS grid of the same shapes/colors — zero JS motion,
 * zero physics, zero WASM downloaded.
 *
 * Performance budget (see `.scene` for the detail)
 *  - Idle: 0ms. Frameloop AND the Rapier world both pause when the arena is
 *    offscreen or the tab is hidden (IntersectionObserver + visibility).
 *  - Active frame: ~1.5–3ms at the default count on a mid GPU. Physics scales
 *    ~O(n) for broadphase + ~O(contacts); worst case is a dense pile of all
 *    bodies touching (see `.scene` note). `count` is capped on mobile.
 *  - Bundle: @react-three/rapier (~30KB gzip JS) + the Rapier WASM
 *    (~1.44MB raw / ~440KB gzip, streamed + cached, fetched lazily and ONLY
 *    when the gate passes). three + R3F are shared with the other techniques.
 */

const PhysicsScene = dynamic(() => import('./PhysicsPlayground.scene'), {
  ssr: false,
  loading: () => null,
});

export type PhysicsShape = 'rounded-box' | 'sphere' | 'capsule';

export type PhysicsPlaygroundProps = {
  /**
   * Desired number of bodies. Automatically clamped to a safe range and
   * reduced on small / touch viewports inside the scene (stated below).
   * @defaultValue 18
   */
  count?: number;
  /**
   * Restrained palette for the tokens. Pull these from your CSS vars / theme
   * so the arena matches the site rather than being a rainbow toy. Cycled per
   * body. Any THREE.Color-parseable string.
   * @defaultValue a muted slate/sand set
   */
  colors?: string[];
  /**
   * Token silhouette. All three are cheap, low-poly, and share one geometry
   * instance across every body of that shape.
   * @defaultValue 'rounded-box'
   */
  shape?: PhysicsShape;
  /** World gravity (m/s²). Negative = down. @defaultValue -9.81 */
  gravity?: number;
  /** Background of the arena card (CSS color). @defaultValue 'transparent' */
  background?: string;
  /** Max device pixel ratio. @defaultValue 1.5 */
  dprCap?: number;
  /** Accessible label for the interactive region. */
  ariaLabel?: string;
  /** Extra classes on the arena wrapper. */
  className?: string;
  /** Inline styles merged onto the arena wrapper (e.g. height). */
  style?: CSSProperties;
};

const DEFAULT_COLORS = ['#c9c4ba', '#a7a092', '#8d8576', '#6f6a60', '#e7e3da'];

/* -------------------------------------------------------------------------- */
/*  Static fallback — a tidy CSS grid of the same shapes. No physics, no JS    */
/*  motion, no WASM. This is the entire visual under reduced-motion / no-WebGL.*/
/* -------------------------------------------------------------------------- */

function shapeRadius(shape: PhysicsShape): string {
  switch (shape) {
    case 'sphere':
      return '50%';
    case 'capsule':
      return '999px';
    case 'rounded-box':
    default:
      return '28%';
  }
}

function StaticFallback({
  count,
  colors,
  shape,
  background,
  ariaLabel,
  className,
  style,
}: Required<Pick<PhysicsPlaygroundProps, 'count' | 'colors' | 'shape'>> &
  Pick<PhysicsPlaygroundProps, 'background' | 'ariaLabel' | 'className' | 'style'>) {
  // Cap the poster to a sensible grid so it reads as a calm pattern.
  const tiles = Math.max(6, Math.min(count, 24));
  const radius = shapeRadius(shape);

  return (
    <div
      role="img"
      aria-label={ariaLabel ?? 'A grid of soft geometric tokens'}
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 16,
        background: background ?? 'transparent',
        ...style,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(56px, 1fr))',
          gap: 'clamp(10px, 3vw, 22px)',
          alignContent: 'center',
          justifyItems: 'center',
          padding: 'clamp(16px, 5vw, 40px)',
        }}
      >
        {Array.from({ length: tiles }, (_, i) => {
          const color = colors[i % colors.length];
          const isCapsule = shape === 'capsule';
          return (
            <span
              key={i}
              style={{
                display: 'block',
                width: isCapsule ? '44%' : 'clamp(28px, 6vw, 52px)',
                height: isCapsule ? 'clamp(40px, 8vw, 72px)' : 'clamp(28px, 6vw, 52px)',
                borderRadius: radius,
                background: color,
                // Soft material read without animating anything.
                boxShadow:
                  'inset 0 2px 6px rgba(255,255,255,0.25), 0 6px 14px rgba(0,0,0,0.12)',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Public component                                                           */
/* -------------------------------------------------------------------------- */

export default function PhysicsPlayground({
  count = 18,
  colors = DEFAULT_COLORS,
  shape = 'rounded-box',
  gravity = -9.81,
  background = 'transparent',
  dprCap = 1.5,
  ariaLabel = 'Interactive physics tokens — drag and throw',
  className,
  style,
}: PhysicsPlaygroundProps) {
  const palette = colors.length > 0 ? colors : DEFAULT_COLORS;
  const webgl = useWebGLSupport();

  // Default height if the consumer didn't set one — the arena needs a box.
  const wrapperStyle: CSSProperties = {
    width: '100%',
    height: style?.height ?? 'min(72vh, 560px)',
    ...style,
  };

  // The static poster — shown for the capability gate AND as the error-boundary
  // fallback if the live scene throws after mount (driver shader fail, Rapier
  // WASM reject, lost context). Either way the section is NEVER an empty box.
  const fallback = (
    <StaticFallback
      count={count}
      colors={palette}
      shape={shape}
      background={background}
      ariaLabel={ariaLabel}
      className={className}
      style={wrapperStyle}
    />
  );

  if (!webgl) return fallback;

  return (
    <WebGLBoundary label="PhysicsPlayground" fallback={fallback}>
      <div
        className={className}
        aria-label={ariaLabel}
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 16,
          background,
          // The interaction is pointer-only; allow vertical page scroll to start
          // from this region unless a drag is in progress (the scene escalates to
          // `touch-action: none` on pointer-down — see `.scene`).
          touchAction: 'pan-y',
          ...wrapperStyle,
        }}
      >
        <PhysicsScene
          count={count}
          colors={palette}
          shape={shape}
          gravity={gravity}
          dprCap={dprCap}
        />
      </div>
    </WebGLBoundary>
  );
}
