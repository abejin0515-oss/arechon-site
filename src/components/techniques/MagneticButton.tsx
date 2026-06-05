"use client";

// MagneticButton — true magnetic pull: the element itself is dragged toward the cursor
// within a radius and eases back on leave. "magnetic" + "hover-physics" (Cuberto).
//
// Implementation: gsap.quickTo for x/y gives a persistent, interruptible setter that lerps
// the element toward a target every call — no new tween per mousemove (cheap, smooth).
// We also translate the inner label slightly further than the wrapper for a parallax
// "the text leans into the cursor" feel.
//
// Touch / coarse pointer = NO-OP: magnetic hover is meaningless without a fine pointer and
// would jank on touch. We detect `(pointer: fine)` + `(hover: hover)` and bail, returning a
// plain interactive element. Keyboard focus is unaffected (it's a real <button>/<a>).
//
// Lenis<->ScrollTrigger: NONE. This is pointer-driven, not scroll-linked. No sync needed.
//
// Performance:
//   - quickTo writes transform directly; ~one matrix update per mousemove frame, < 0.2ms.
//   - No ScrollTrigger, no rAF loop of our own (gsap's shared ticker handles the ease-back).
//   - Bundle: 0 beyond gsap.
//
// Mobile: no-op (coarse pointer) -> zero cost, fully usable as a normal button.
//
// Reduced motion: no magnetic motion (we skip the quickTo wiring). The element still works
//   as a button/link; only the pull is removed.

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "@/lib/gsap";

type MagneticButtonProps = {
  children: ReactNode;
  /** 0..1 — fraction of the cursor offset the element follows. ~0.4 feels premium */
  strength?: number;
  /** px beyond the element's bounds where the pull engages */
  radius?: number;
  className?: string;
  as?: "button" | "a";
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  "aria-label"?: string;
};

export function MagneticButton({
  children,
  strength = 0.4,
  radius = 40,
  className,
  as = "button",
  href,
  onClick,
  type = "button",
  ...rest
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement & HTMLAnchorElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    const label = labelRef.current;
    if (!el || !label) return;

    const fine = window.matchMedia("(pointer: fine) and (hover: hover)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return; // touch/coarse/reduced -> plain element, no listeners

    const xTo = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });
    // Label leans ~1.6x further for depth.
    const lxTo = gsap.quickTo(label, "x", { duration: 0.6, ease: "power3.out" });
    const lyTo = gsap.quickTo(label, "y", { duration: 0.6, ease: "power3.out" });

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      // Engage only within bounds + radius; otherwise treat as leave.
      const within =
        Math.abs(dx) < r.width / 2 + radius && Math.abs(dy) < r.height / 2 + radius;
      if (!within) {
        reset();
        return;
      }
      xTo(dx * strength);
      yTo(dy * strength);
      lxTo(dx * strength * 1.6);
      lyTo(dy * strength * 1.6);
    };

    const reset = () => {
      xTo(0);
      yTo(0);
      lxTo(0);
      lyTo(0);
    };

    // pointermove on window so the pull engages slightly before the cursor enters bounds.
    window.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", reset);

    return () => {
      window.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", reset);
      gsap.killTweensOf([el, label]);
      gsap.set([el, label], { x: 0, y: 0 });
    };
  }, [strength, radius]);

  const inner = (
    <span ref={labelRef} style={{ display: "inline-block", willChange: "transform" }}>
      {children}
    </span>
  );

  const style = { display: "inline-block", willChange: "transform" } as const;

  if (as === "a") {
    return (
      <a ref={ref} href={href} className={className} style={style} onClick={onClick} {...rest}>
        {inner}
      </a>
    );
  }
  return (
    <button
      ref={ref}
      type={type}
      className={className}
      style={style}
      onClick={onClick}
      {...rest}
    >
      {inner}
    </button>
  );
}
