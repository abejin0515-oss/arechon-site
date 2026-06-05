"use client";

// useSound() — the consumer hook. Returns a stable control surface that is ALWAYS safe to call:
//   - On the server (no provider mounted) it returns inert no-ops, so a component using sound
//     renders identically during SSR with zero throwing.
//   - Outside a <SoundProvider> it also returns no-ops instead of throwing, so dropping a
//     sound-aware component into a page that hasn't mounted the provider degrades gracefully
//     rather than crashing. (If you'd rather catch the mistake loudly, swap the fallback for a
//     `throw`.)
//
// The returned object matches the spec: { play, mute, unmute, muted, toggle } (+ `unlocked`
// for UI that wants to reflect "audio armed" state).

import { useContext } from "react";
import { SoundContext, type SoundContextValue } from "./SoundProvider";

const NOOP_SOUND: SoundContextValue = {
  play: () => {},
  mute: () => {},
  unmute: () => {},
  toggle: () => {},
  muted: true,
  unlocked: false,
};

export function useSound(): SoundContextValue {
  const ctx = useContext(SoundContext);
  return ctx ?? NOOP_SOUND;
}
