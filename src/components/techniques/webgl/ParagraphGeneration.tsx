'use client';

import dynamic from 'next/dynamic';

/**
 * ParagraphGeneration
 * ───────────────────
 * Scroll-driven WebGL signature: a single paragraph is generated word-by-word
 * as the user scrolls, with rejected ghost alternatives floating in 3D around
 * each chosen word. Built for the "Sample." (Claude self-statement) site.
 *
 * The whole site IS one paragraph. Use as the homepage signature for AI /
 * manifesto / single-statement portfolios. Pairs with `webgl-paragraph-
 * signature` skill (see ~/.claude/skills/) for the full build playbook.
 *
 * Customization
 *  - PARAGRAPH constant and FINAL_PHRASE_GHOSTS inside `.scene.tsx` carry the
 *    content. Edit those to retarget the piece.
 *  - Tunables (LINE_WIDTH, ROW_GAP, fontSize, baseDist padding) sit near the
 *    top of `.scene.tsx`. After everything works, dial type size larger via:
 *      LINE_WIDTH 9→14, ROW_GAP 1.7→1.35,
 *      baseDist `*1.18+3` → `*1.04+0.6`, fontSize 0.5→0.62 / italic 0.62→0.78.
 *
 * Requirements
 *  - Fraunces variable TTFs at `/public/fonts/fraunces.ttf` + `fraunces-
 *    italic.ttf` (copy from arechon-site/public/fonts/).
 *  - A SSR-rendered tall spacer (~5000px) before mounting. The Canvas itself
 *    is position: fixed. Wrap with a parent that provides the spacer height
 *    in SSR or you'll get catastrophic CLS.
 *  - Any subsequent <section> needs explicit `bg + zIndex: 10` or it will
 *    z-stack under the fixed canvas.
 *
 * Performance
 *  - Bundle marginal cost: ~165 KB gz (three + R3F + drei Text/SDF).
 *  - Mobile slow-4G Lighthouse: Perf ~45, LCP ~5s. Desktop: 95+, LCP <1s.
 *  - CLS = 0 when SSR spacer is correct.
 */

const ParagraphGenerationScene = dynamic(
  () => import('./ParagraphGeneration.scene').then((m) => ({ default: m.Sample })),
  {
    ssr: false,
    loading: () => null,
  },
);

export type ParagraphGenerationProps = {
  /**
   * Optional: hint the spacer height. The canvas reads window.scrollY for
   * progress so the actual scroll height is whatever the parent provides.
   * This is purely a calibration hint — set to the parent's spacer px.
   */
  scrollHeightHint?: number;
};

export default function ParagraphGeneration(_: ParagraphGenerationProps) {
  return <ParagraphGenerationScene />;
}
