"use client";

// useReducedMotionFlag — SSR-safe `prefers-reduced-motion: reduce` subscriber.
//
// Why not Framer's `useReducedMotion`? We want a value that is:
//   - false on the server and first client render (so markup matches, no hydration
//     mismatch), then corrected in an effect, and
//   - live (updates if the user flips the OS setting while the page is open).
//
// All four dataviz components share this so the "instant final state" fallback is
// uniform. When it returns true, callers skip tweening and render the end state.

import { useEffect, useState } from "react";

export function useReducedMotionFlag(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mql.matches);

    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
