"use client";

// SoundProvider — the audio "engine" for Arechon. This is the differentiator piece: most
// Japanese sites ship zero sound; Cartier-tier sites use it as texture. The hard part is doing
// it WITHOUT being obnoxious or violating autoplay policy, so the rules here are strict:
//
//   1. NOTHING is created or played until the first real user gesture (pointerdown/keydown).
//      Browsers block AudioContext start without a gesture; Howler.js also defers its ctx.
//      We add a one-shot capture listener that (a) unlocks Howler and (b) lazily builds Howls.
//   2. We default to MUTED when `prefers-reduced-motion: reduce` — we treat that as a general
//      "less stimulation, please" signal. The user can still opt in via the toggle.
//   3. The explicit mute choice is persisted in localStorage and always wins over the rm default
//      on return visits.
//   4. Howls are created LAZILY (first play of each name) and only the cheap cues are warmed on
//      unlock — so audio never competes with LCP. Ambient is never auto-warmed.
//   5. On unmount every Howl is unload()'d and every listener removed. No leaks, no dangling ctx.
//
// SSR-safe: all window/Howler/localStorage access is inside effects or gesture handlers; the
// provider renders its children unconditionally so it composes anywhere in the tree.
//
// 'use client' BOUNDARY: this file. Howler is only imported here (and transitively nowhere on
// the server), so the ~10KB gz howler payload lands exclusively in the client bundle.

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Howl, Howler } from "howler";
import {
  MUTE_STORAGE_KEY,
  PRELOAD_ON_UNLOCK,
  SOUND_REGISTRY,
  type SoundName,
} from "./sounds";

export interface SoundContextValue {
  /** Play a named cue. No-op until audio is unlocked or while muted. */
  play: (name: SoundName) => void;
  mute: () => void;
  unmute: () => void;
  toggle: () => void;
  /** Current mute state (true = silent). */
  muted: boolean;
  /** True once the first user gesture has unlocked the audio context. */
  unlocked: boolean;
}

// `null` sentinel lets useSound() detect "outside a provider" and no-op safely.
export const SoundContext = createContext<SoundContextValue | null>(null);

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function readStoredMuted(): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(MUTE_STORAGE_KEY);
    if (v === "1") return true;
    if (v === "0") return false;
    return null; // never set
  } catch {
    return null; // private mode / storage disabled
  }
}

function writeStoredMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MUTE_STORAGE_KEY, muted ? "1" : "0");
  } catch {
    /* storage may be unavailable; preference is best-effort */
  }
}

export interface SoundProviderProps {
  children: ReactNode;
  /**
   * Force an initial muted state, overriding the rm-default heuristic (storage still wins on
   * return visits). Leave undefined for the recommended behavior.
   */
  defaultMuted?: boolean;
}

export function SoundProvider({ children, defaultMuted }: SoundProviderProps) {
  // Initial muted resolution happens in an effect (SSR can't read storage/matchMedia), so we
  // start `true` (silent) to guarantee we never make noise before we've decided — the safest
  // default and also correct for the very first frame after hydration.
  const [muted, setMuted] = useState(true);
  const [unlocked, setUnlocked] = useState(false);

  // Live Howl instances, created on demand. Kept in a ref so play() never causes re-renders.
  const howlsRef = useRef<Partial<Record<SoundName, Howl>>>({});
  // Last play timestamp per sound, for per-sound debounce of rapid retriggers.
  const lastPlayedRef = useRef<Partial<Record<SoundName, number>>>({});
  // Mirror muted into a ref so the gesture/event handlers read the latest value without
  // re-subscribing.
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  // Lazily build (or return) the Howl for a name.
  const getHowl = useCallback((name: SoundName): Howl => {
    const existing = howlsRef.current[name];
    if (existing) return existing;
    const def = SOUND_REGISTRY[name];
    const howl = new Howl({
      src: def.src,
      volume: def.volume,
      loop: def.loop ?? false,
      // We unlocked via our own gesture handler; let Howler manage the shared ctx, but don't
      // autoplay-unlock on its own — `html5: false` keeps everything in WebAudio for low latency.
      html5: false,
      preload: true,
      ...(def.sprite ? { sprite: def.sprite } : {}),
    });
    howlsRef.current[name] = howl;
    return howl;
  }, []);

  const play = useCallback(
    (name: SoundName) => {
      if (typeof window === "undefined") return; // SSR guard
      if (mutedRef.current) return; // honor mute
      if (!unlockedRef.current) return; // never before first gesture

      const def = SOUND_REGISTRY[name];
      const now = performance.now();
      const last = lastPlayedRef.current[name] ?? 0;
      if (def.debounceMs && now - last < def.debounceMs) return; // throttle retriggers
      lastPlayedRef.current[name] = now;

      const howl = getHowl(name);
      if (def.spriteId) howl.play(def.spriteId);
      else howl.play();
    },
    [getHowl],
  );

  // unlocked needs a ref too (read inside play/handlers without resubscribing).
  const unlockedRef = useRef(unlocked);
  unlockedRef.current = unlocked;

  const applyMuted = useCallback((next: boolean) => {
    setMuted(next);
    writeStoredMuted(next);
    // Howler.mute() flips the master gain — covers any already-playing ambient instantly.
    if (typeof window !== "undefined") Howler.mute(next);
  }, []);

  const mute = useCallback(() => applyMuted(true), [applyMuted]);
  const unmute = useCallback(() => applyMuted(false), [applyMuted]);
  const toggle = useCallback(
    () => applyMuted(!mutedRef.current),
    [applyMuted],
  );

  // ── Resolve the initial muted state once on mount (storage > rm-default > defaultMuted) ──
  useEffect(() => {
    const stored = readStoredMuted();
    let initial: boolean;
    if (stored !== null) {
      initial = stored; // explicit user choice always wins
    } else if (typeof defaultMuted === "boolean") {
      initial = defaultMuted;
    } else {
      // No stored choice: default OFF (muted) when reduced-motion is requested, else ON.
      initial = prefersReducedMotion() ? true : false;
    }
    setMuted(initial);
    if (typeof window !== "undefined") Howler.mute(initial);
  }, [defaultMuted]);

  // ── First-gesture unlock: build cheap Howls + flip the audio context on ──
  useEffect(() => {
    if (typeof window === "undefined") return;

    let done = false;
    const unlock = () => {
      if (done) return;
      done = true;
      setUnlocked(true);
      unlockedRef.current = true;

      // Warm only the cheap cues so the next hover/click is instant. Never block the gesture:
      // construction is synchronous-cheap (just Audio decode kicks off async).
      for (const name of PRELOAD_ON_UNLOCK) getHowl(name);

      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };

    // capture:true so we unlock as early as possible; once:true would also work but we manage
    // the one-shot manually to remove all three together.
    window.addEventListener("pointerdown", unlock, { capture: true, passive: true });
    window.addEventListener("keydown", unlock, { capture: true });
    window.addEventListener("touchstart", unlock, { capture: true, passive: true });

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, [getHowl]);

  // ── Full teardown on unmount: unload every Howl, drop refs ──
  useEffect(() => {
    const howls = howlsRef.current;
    return () => {
      for (const key of Object.keys(howls) as SoundName[]) {
        howls[key]?.unload();
      }
      howlsRef.current = {};
      lastPlayedRef.current = {};
    };
  }, []);

  const value = useMemo<SoundContextValue>(
    () => ({ play, mute, unmute, toggle, muted, unlocked }),
    [play, mute, unmute, toggle, muted, unlocked],
  );

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}
