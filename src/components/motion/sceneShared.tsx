'use client';

import { useEffect, useReducer, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

/* -------------------------------------------------------------------------- */
/*  Shared pointer / velocity / visibility wiring                              */
/*  Used by all three /motion treatments so the comparison isolates MOTION.    */
/* -------------------------------------------------------------------------- */

export type Pointer = { x: number; y: number };

/** tiny re-render trigger so a plane mounts once its async texture resolves */
export function useTick(): [number, () => void] {
  const [n, dispatch] = useReducer((x: number) => x + 1, 0);
  return [n, () => dispatch()];
}

/**
 * InteractionController
 * Tracks pointer position (-0.5..0.5, centered) and a 0..1 motion velocity
 * (max of pointer speed and any external scroll velocity), and pauses the
 * frameloop when the stage is offscreen or the tab is hidden.
 *
 * Writes into the supplied refs; scenes read them in useFrame.
 */
export function InteractionController({
  wrapperRef,
  velocityRef,
  pointerRef,
  externalVelocityRef,
}: {
  wrapperRef: React.RefObject<HTMLElement | null>;
  velocityRef: React.RefObject<number>;
  pointerRef: React.RefObject<Pointer>;
  externalVelocityRef?: React.RefObject<number>;
}) {
  const setFrameloop = useThree((s) => s.setFrameloop);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    let last = { x: 0, y: 0, t: performance.now() };
    let pointerVel = 0;
    // Target pointer (raw); the scenes ease toward it for damping.
    let targetX = 0;
    let targetY = 0;

    const onPointerMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = -((e.clientY - rect.top) / rect.height - 0.5);
      targetX = x;
      targetY = y;

      const now = performance.now();
      const dt = Math.max(16, now - last.t);
      const dx = x - last.x;
      const dy = y - last.y;
      const speed = Math.sqrt(dx * dx + dy * dy) / (dt / 1000);
      pointerVel = Math.min(1, speed * 0.35);
      last = { x, y, t: now };
      invalidate();
    };

    const onLeave = () => {
      pointerVel = 0;
      // Ease the pointer back to center when the cursor leaves.
      targetX = 0;
      targetY = 0;
    };

    el.addEventListener('pointermove', onPointerMove, { passive: true });
    el.addEventListener('pointerleave', onLeave, { passive: true });

    // Also respond to touch as a gentle "tap = pulse of velocity" so the
    // effects are perceivable on mobile without a hover device.
    const onTouch = () => {
      pointerVel = Math.min(1, pointerVel + 0.6);
      invalidate();
    };
    el.addEventListener('touchstart', onTouch, { passive: true });

    let raf = 0;
    const tick = () => {
      const ext = externalVelocityRef?.current ?? 0;
      velocityRef.current = Math.max(pointerVel, Math.min(1, ext));
      // Damp the pointer toward its target (smooth, not snappy).
      const p = pointerRef.current;
      p.x += (targetX - p.x) * 0.12;
      p.y += (targetY - p.y) * 0.12;
      // Bleed velocity so motion decays to rest.
      pointerVel *= 0.9;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    let frameloop: 'always' | 'never' = 'always';
    const setActive = (on: boolean) => {
      const next: 'always' | 'never' = on ? 'always' : 'never';
      if (frameloop !== next) {
        frameloop = next;
        setFrameloop(next);
      }
    };
    const onVisibility = () => setActive(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);

    let io: IntersectionObserver | null = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(
        ([entry]) => setActive(entry.isIntersecting && !document.hidden),
        { threshold: 0 },
      );
      io.observe(el);
    }

    return () => {
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('touchstart', onTouch);
      document.removeEventListener('visibilitychange', onVisibility);
      io?.disconnect();
      cancelAnimationFrame(raf);
      setFrameloop('always');
    };
  }, [wrapperRef, velocityRef, pointerRef, externalVelocityRef, setFrameloop, invalidate]);

  return null;
}

/* -------------------------------------------------------------------------- */
/*  Texture loader hook (imperative, fully disposed)                           */
/* -------------------------------------------------------------------------- */

export type LoadedTexture = {
  texture: THREE.Texture;
  aspect: number;
};

/**
 * Loads an image into a THREE.Texture with sane defaults for a graded photo
 * plane. Returns null until ready. Disposes on unmount / src change.
 *
 * Errors are swallowed: the caller keeps its poster <img> visible, so a failed
 * load is never a black box — it just stays the static photo.
 */
export function useImageTexture(src: string): LoadedTexture | null {
  const { gl, invalidate } = useThree();
  const ref = useRef<LoadedTexture | null>(null);
  const [, force] = useTick();

  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';
    loader.load(
      src,
      (tex) => {
        if (cancelled) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        tex.anisotropy = Math.min(4, gl.capabilities.getMaxAnisotropy());
        const img = tex.image as HTMLImageElement;
        const w = img.naturalWidth || img.width || 0;
        const h = img.naturalHeight || img.height || 0;
        tex.needsUpdate = true;
        ref.current = { texture: tex, aspect: w && h ? w / h : 4 / 3 };
        force();
        invalidate();
      },
      undefined,
      () => {
        /* swallow — poster stays up */
      },
    );

    return () => {
      cancelled = true;
      ref.current?.texture.dispose();
      ref.current = null;
    };
  }, [src, gl, invalidate, force]);

  return ref.current;
}

/**
 * Loads a plain grayscale data texture (e.g. the depth map). No color space
 * conversion; nearest-free linear sampling for a smooth displacement field.
 */
export function useDataTexture(src: string): THREE.Texture | null {
  const { invalidate } = useThree();
  const ref = useRef<THREE.Texture | null>(null);
  const [, force] = useTick();

  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';
    loader.load(
      src,
      (tex) => {
        if (cancelled) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.NoColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.needsUpdate = true;
        ref.current = tex;
        force();
        invalidate();
      },
      undefined,
      () => {
        /* swallow */
      },
    );

    return () => {
      cancelled = true;
      ref.current?.dispose();
      ref.current = null;
    };
  }, [src, invalidate, force]);

  return ref.current;
}

/** cover-fit scale (vec2) for a fullscreen plane given container + image aspect */
export function coverScale(
  containerAspect: number,
  imageAspect: number,
  out: THREE.Vector2,
): THREE.Vector2 {
  if (containerAspect > imageAspect) {
    out.set(1, imageAspect / containerAspect);
  } else {
    out.set(containerAspect / imageAspect, 1);
  }
  return out;
}
