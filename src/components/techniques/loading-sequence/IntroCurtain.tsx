// IntroCurtain — the static, SSR'd half of the "幕開け" technique.
//
// This is a SERVER component (no "use client"): it renders raw DOM that exists
// in the server's HTML, so the curtain covers the page from frame 0 — before any
// JS or React. That is what kills the "blank/unstyled first frame" flash. The
// matching client controller (LoadingSequence) later grabs #intro-curtain by id,
// plays the reveal-out, and remove()s it. The node lives OUTSIDE React's tree,
// so a hydration mismatch is impossible by construction.
//
// Pair this with the folder's loading-sequence.css (imported once at the route
// layout) and drop <IntroCurtain /> before {children} in that layout. Two files,
// one self-contained technique — see ./index.ts.

import { INTRO_KEY } from "./constants";

/**
 * Frame-0 anti-flash script (render-blocking, synchronous).
 *
 * Rendered as the FIRST node of this subtree, BEFORE #intro-curtain in DOM
 * order. A plain inline <script> with no async/defer runs synchronously the
 * instant the parser reaches it — i.e. before the curtain below is even parsed
 * or painted. If this session already saw the intro, it stamps data-intro-seen
 * on <html>; CSS then keeps the curtain display:none from the very first frame
 * (the complete fix for the repeat-visit flash). This is the sanctioned
 * "preventing flash before hydration" pattern (see Next.js docs of that name):
 * a try/caught storage read that sets a data-attribute before first paint.
 *
 * Why a raw <script> and not next/script: next/script beforeInteractive hoists
 * to <head> but does NOT guarantee execution before the curtain paints. We need
 * strict DOM-order synchronous execution — only a raw inline script gives that.
 * It carries no id/src, so React leaves it in-tree (no hoist).
 */
const INTRO_SKIP_SCRIPT = `(function(){try{if(sessionStorage.getItem('${INTRO_KEY}')==='1'){document.documentElement.setAttribute('data-intro-seen','');}}catch(e){}})();`;

export function IntroCurtain() {
  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <script dangerouslySetInnerHTML={{ __html: INTRO_SKIP_SCRIPT }} />

      {/* No-JS / frame-0 curtain. Static SSR DOM; React never owns it. */}
      <div id="intro-curtain" aria-hidden="true">
        <div className="intro-curtain__panel intro-curtain__panel--top" />
        <div className="intro-curtain__panel intro-curtain__panel--bottom" />
        <div className="intro-curtain__seam" />
        <p className="intro-curtain__wordmark font-mono-accent">
          ARECHON · TECHNIQUE SHOWCASE
        </p>
      </div>
    </>
  );
}
