// Single source of truth for the intro's sessionStorage key.
//
// Three places must agree on this exact string, which is WHY it lives here
// instead of being re-typed in each file:
//   1. IntroCurtain's frame-0 skip script (reads it to stamp data-intro-seen)
//   2. LoadingSequence's sessionKey default (reads/writes "seen" state)
//   3. Showcase's "replay intro" dev helper (removes it to force a re-show)
// Import it everywhere; never re-type the literal.
export const INTRO_KEY = "arechon:showcase-intro";
