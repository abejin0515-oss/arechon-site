"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

/**
 * Client-only, deferred mount for the Hero WebGL atmosphere.
 *
 * Why deferred:
 *  - The atmosphere is decorative. It MUST not block first paint or LCP.
 *  - We wait for one of: requestIdleCallback (idle main thread) OR the first
 *    user interaction (scroll / pointer / key). Whichever fires first wins.
 *  - On reduced motion devices, we never mount — atmosphere is purely visual.
 *
 * Effect: the Three.js chunk (~140KB gz) ships in a separate chunk and the
 * import resolves AFTER first paint, so LCP measures the hero typography
 * alone — no WebGL on the critical path.
 */

const HeroAtmosphere = dynamic(
  () => import("./HeroAtmosphere").then((m) => m.HeroAtmosphere),
  { ssr: false },
);

export function HeroAtmosphereMount() {
  const [mount, setMount] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    let done = false;
    const fire = () => {
      if (done) return;
      done = true;
      setMount(true);
      cleanupListeners();
    };

    const cleanupListeners = () => {
      window.removeEventListener("scroll", fire);
      window.removeEventListener("pointermove", fire);
      window.removeEventListener("touchstart", fire);
      window.removeEventListener("keydown", fire);
    };

    type IdleWindow = Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const w = window as IdleWindow;

    let idleHandle: number | undefined;
    if (typeof w.requestIdleCallback === "function") {
      idleHandle = w.requestIdleCallback(() => fire(), { timeout: 2500 });
    } else {
      const t = window.setTimeout(fire, 1500);
      return () => {
        window.clearTimeout(t);
        cleanupListeners();
      };
    }

    window.addEventListener("scroll", fire, { passive: true, once: true });
    window.addEventListener("pointermove", fire, { passive: true, once: true });
    window.addEventListener("touchstart", fire, { passive: true, once: true });
    window.addEventListener("keydown", fire, { once: true });

    return () => {
      if (idleHandle !== undefined && w.cancelIdleCallback) {
        w.cancelIdleCallback(idleHandle);
      }
      cleanupListeners();
    };
  }, []);

  if (!mount) return null;
  return <HeroAtmosphere />;
}
