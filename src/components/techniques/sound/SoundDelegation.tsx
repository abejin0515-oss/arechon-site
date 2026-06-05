"use client";

// SoundDelegation — wires declarative `data-sound` attributes to the engine with ONE listener
// pair at the document level (event delegation), not a listener per element. This means you can
// sprinkle sound onto any markup with zero per-component code:
//
//   <a data-sound="hover" data-sound-click="click">…</a>   → hover plays "hover", click plays "click"
//   <button data-sound-click="transition">Enter</button>    → only a click cue
//   <li data-sound="hover">…</li>                            → hover-only
//
// Attribute contract:
//   data-sound="<name>"        → played on pointerenter (hover). Pointer-FINE only (no touch).
//   data-sound-click="<name>"  → played on pointerdown/click. Works on touch + pointer.
//
// Why pointerenter via delegation: pointerenter doesn't bubble, so we can't delegate it directly.
// We instead listen to `pointerover` (which DOES bubble) on the document and de-dupe so we only
// fire when the pointer crosses INTO a new sound target — emulating enter semantics cheaply with
// a single listener. We also gate on `(pointer: fine)` so coarse/touch pointers never get hover
// sound (it would fire on tap and feel wrong).
//
// click delegation uses `pointerdown` (snappier than click, fires before navigation) on document.
//
// Mount this once, anywhere inside <SoundProvider>. It renders nothing.
//
// SSR-safe (all DOM access in an effect). Full cleanup removes both listeners.

import { useEffect } from "react";
import { useSound } from "./useSound";
import { SOUND_REGISTRY, type SoundName } from "./sounds";

function isSoundName(v: string | null | undefined): v is SoundName {
  return v != null && v in SOUND_REGISTRY;
}

/** Walk up from the event target to the nearest element carrying the given data attribute. */
function closestWithAttr(
  start: EventTarget | null,
  attr: string,
): { el: Element; value: string } | null {
  if (!(start instanceof Element)) return null;
  const el = start.closest(`[${attr}]`);
  if (!el) return null;
  const value = el.getAttribute(attr);
  return value ? { el, value } : null;
}

export function SoundDelegation() {
  const { play } = useSound();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const finePointer = window.matchMedia("(pointer: fine)").matches;

    // Track the last hovered sound-target element so pointerover (which fires on every descendant
    // crossing) only triggers a sound when we genuinely enter a NEW target — true "enter" feel.
    let lastHoverTarget: Element | null = null;

    const onPointerOver = (e: PointerEvent) => {
      const hit = closestWithAttr(e.target, "data-sound");
      if (!hit) {
        lastHoverTarget = null;
        return;
      }
      if (hit.el === lastHoverTarget) return; // still inside the same target
      lastHoverTarget = hit.el;
      if (isSoundName(hit.value)) play(hit.value);
    };

    const onPointerDown = (e: PointerEvent) => {
      const hit = closestWithAttr(e.target, "data-sound-click");
      if (hit && isSoundName(hit.value)) play(hit.value);
    };

    // hover sounds: pointer-fine only (no hover cue on touch devices).
    if (finePointer) {
      document.addEventListener("pointerover", onPointerOver, { passive: true });
    }
    // click sounds: always (touch + mouse + pen).
    document.addEventListener("pointerdown", onPointerDown, { passive: true });

    return () => {
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [play]);

  return null;
}
