// "幕開け" opening-curtain technique — self-contained in this folder.
//
//   <IntroCurtain />   server component: static SSR curtain DOM + frame-0 script.
//   <LoadingSequence/> client controller: plays the reveal-out on real load.
//   loading-sequence.css  the curtain's styles (import once at the route layout).
//   INTRO_KEY          the shared sessionStorage key all three agree on.
//
// To use: import "<...>/loading-sequence/loading-sequence.css" in the route
// layout, render <IntroCurtain /> before {children}, and place <LoadingSequence/>
// anywhere on the page.
export { IntroCurtain } from "./IntroCurtain";
export { LoadingSequence } from "./LoadingSequence";
export { INTRO_KEY } from "./constants";
