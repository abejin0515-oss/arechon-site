// sounds.ts — the named-sound registry (no "use client": this is plain data, safe to import
// from either environment; it pulls in zero runtime, just types + a config map).
//
// Each entry points at one or more source files (Howler picks the first the browser can play)
// plus per-sound defaults: volume (kept subtle), whether it loops (ambient), and an optional
// debounce window so a single named sound can't retrigger faster than N ms (rapid hover).
//
// To swap in a sprite sheet later, give every cue the SAME `src` and add a `sprite` map +
// per-name `spriteId`; the provider already calls `play(spriteId)` when present. We default to
// discrete tiny files because they're simpler to author and tree-shake at the CDN edge.

export type SoundName = "hover" | "click" | "transition" | "ambient";

export interface SoundDef {
  /** Source files in preference order (Howler falls through formats). Served from /public. */
  src: string[];
  /** 0..1. Deliberately low — UI sound should be felt, not heard. */
  volume: number;
  /** Looping ambient bed. Only `ambient` should set this. */
  loop?: boolean;
  /** Minimum ms between two plays of THIS sound. Guards rapid hover retriggers. */
  debounceMs?: number;
  /** If this def is one cue inside a sprite sheet, the sprite id to play. */
  spriteId?: string;
  /** Sprite definition `{ id: [offsetMs, durationMs] }`. Present only on sprite-based defs. */
  sprite?: Record<string, [number, number]>;
  /** Skip preloading until first actually played (e.g. ambient — never block the unlock). */
  preload?: boolean;
}

// NOTE: these paths are placeholders under /public/sounds/. Drop real assets there
// (prefer .webm + .mp3 fallback, mono, -18 LUFS, < 20KB each) before shipping.
export const SOUND_REGISTRY: Record<SoundName, SoundDef> = {
  hover: {
    src: ["/sounds/hover.webm", "/sounds/hover.mp3"],
    volume: 0.12,
    debounceMs: 70,
  },
  click: {
    src: ["/sounds/click.webm", "/sounds/click.mp3"],
    volume: 0.22,
    debounceMs: 40,
  },
  transition: {
    src: ["/sounds/transition.webm", "/sounds/transition.mp3"],
    volume: 0.18,
    debounceMs: 120,
  },
  ambient: {
    src: ["/sounds/ambient.webm", "/sounds/ambient.mp3"],
    volume: 0.06,
    loop: true,
    preload: false, // never preloaded; only loaded if the site explicitly starts it
  },
};

export const ALL_SOUND_NAMES = Object.keys(SOUND_REGISTRY) as SoundName[];

/** Sounds eagerly created on the unlock gesture. Ambient is excluded (opt-in, larger). */
export const PRELOAD_ON_UNLOCK: SoundName[] = ALL_SOUND_NAMES.filter(
  (n) => SOUND_REGISTRY[n].preload !== false,
);

export const MUTE_STORAGE_KEY = "arechon:sound:muted";
