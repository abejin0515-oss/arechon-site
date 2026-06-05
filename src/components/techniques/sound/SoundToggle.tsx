"use client";

// SoundToggle — the always-present escape hatch. Because we never force sound on, the site MUST
// surface a control so users can mute/unmute on demand. Accessibility contract:
//   - Real <button> (keyboard operable, focusable, Enter/Space activate for free).
//   - aria-pressed reflects the *muted* state semantically (pressed = muted = "I silenced it").
//   - aria-label updates so screen readers announce the action, not just an icon.
//   - Visible focus ring (focus-visible) — never removed.
//   - The icon is aria-hidden; the accessible name comes from aria-label.
//
// It plays a tiny `click` cue on unmute-via-toggle as a confirmation that audio is now on (only
// when turning sound ON, so muting stays silent — muting that makes noise is absurd).
//
// Styling: minimal inline + a className passthrough so the art-director can theme it. No CSS
// animation here beyond a static focus ring; the toggle is UI state, not scroll-linked motion.

import { useCallback } from "react";
import { useSound } from "./useSound";

export interface SoundToggleProps {
  className?: string;
  /** Accessible label when sound is currently ON (pressing will mute). */
  labelMute?: string;
  /** Accessible label when sound is currently OFF (pressing will unmute). */
  labelUnmute?: string;
}

export function SoundToggle({
  className,
  labelMute = "サウンドをオフにする",
  labelUnmute = "サウンドをオンにする",
}: SoundToggleProps) {
  const { muted, toggle, play } = useSound();

  const onClick = useCallback(() => {
    const willUnmute = muted;
    toggle();
    // Confirmation tick only when enabling sound. play() is internally muted-guarded, but we've
    // just unmuted via toggle()'s state update which is async — so fire the cue on the next tick.
    if (willUnmute) {
      // microtask: lets Howler.mute(false) settle before we play.
      queueMicrotask(() => play("click"));
    }
  }, [muted, toggle, play]);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={muted}
      aria-label={muted ? labelUnmute : labelMute}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
    >
      <SpeakerIcon muted={muted} />
    </button>
  );
}

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      {muted ? (
        // muted: an X over the waves
        <>
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </>
      ) : (
        // on: sound waves
        <>
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M19 5a9 9 0 0 1 0 14" />
        </>
      )}
    </svg>
  );
}
