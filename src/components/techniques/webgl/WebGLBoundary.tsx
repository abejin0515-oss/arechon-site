'use client';

import { Component, type ReactNode } from 'react';

/**
 * WebGLBoundary
 * ─────────────
 * A hard guarantee against the "blank / white / broken demo" report.
 *
 * The heavy WebGL scenes (three + R3F + Rapier WASM) are dynamically imported
 * and run real GPU code. On some real-world setups a scene can throw AFTER it
 * mounts — a shader fails to compile on a quirky driver, the Rapier WASM init
 * rejects, a context is lost mid-frame, an R3F invariant trips. React's default
 * behaviour for an uncaught render error is to unmount the WHOLE subtree, which
 * is exactly how an owner ends up staring at an empty dark box ("映らない").
 *
 * This boundary catches that and swaps in `fallback` (the same calm static
 * poster the capability gate would have shown). So the worst case is no longer
 * "nothing" — it is "the tasteful static version". Combined with the
 * `useWebGLSupport` gate (which handles the *predictable* no-WebGL cases up
 * front), every heavy demo now always shows SOMETHING real.
 *
 * It only catches errors thrown during React render/commit of its children
 * (which includes the scene's mount + the first effect-driven renders). Async
 * GPU failures that don't throw through React are handled inside each scene
 * (context-lost listeners, swallowed texture errors).
 */

type Props = {
  children: ReactNode;
  fallback: ReactNode;
  /** Optional: notified once when the boundary trips (for diagnostics). */
  onError?: (error: Error) => void;
  /** Dev-only label so a thrown scene is identifiable in the console. */
  label?: string;
};

type State = { failed: boolean };

export class WebGLBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    // Surface once so a real failure is debuggable, but never crash the page.
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(
        `[WebGLBoundary${this.props.label ? `:${this.props.label}` : ''}] scene failed, showing static fallback —`,
        error?.message ?? error,
      );
    }
    this.props.onError?.(error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
