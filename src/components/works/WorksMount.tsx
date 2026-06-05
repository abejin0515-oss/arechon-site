"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

/**
 * Client-only mount for the WebGL Works canvas.
 *
 * - Lazy-loads WorksCanvas with ssr:false (must be done from a Client
 *   Component in Next.js 16; Server Components cannot call dynamic({ ssr:false })).
 * - Honors prefers-reduced-motion by not mounting the canvas at all. The
 *   underlying DOM list in <Works /> remains the visible content.
 */

const WorksCanvas = dynamic(
  () => import("./WorksCanvas").then((m) => m.WorksCanvas),
  { ssr: false },
);

export function WorksMount() {
  const [shouldMount, setShouldMount] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setShouldMount(!mql.matches);
    const h = (e: MediaQueryListEvent) => setShouldMount(!e.matches);
    mql.addEventListener("change", h);
    return () => mql.removeEventListener("change", h);
  }, []);

  if (!shouldMount) return null;
  return <WorksCanvas />;
}
