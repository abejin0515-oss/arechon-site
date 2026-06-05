'use client';

import dynamic from 'next/dynamic';
import { MotionStage } from './MotionStage';

/**
 * DISTORTION on three editorial photos.
 *
 * The owner kept the fluid-distortion treatment and cut depth + cinemagraph, and
 * asked to swap the (cheap) rice macro for three "premium from frame one"
 * subjects that fluid warping flatters. So /motion is now ONE treatment applied
 * to THREE high-quality photos — a vertical "which reads as world-class?" compare.
 *
 * Each photo dynamically imports the SAME DistortionScene (ssr:false, code-split)
 * inside the shared MotionStage, getting the same robust poster/fallback/boundary.
 * `vignette` (0..1) tunes the Cinematic-Dark grade per photo so a dark subject
 * (the iris on black) isn't crushed by edge falloff.
 *
 * `velocityRef` (optional) carries Lenis scroll velocity (0..1) so the warp also
 * reacts to scroll, not just the cursor.
 */

const DistortionScene = dynamic(() => import('./DistortionScene'), {
  ssr: false,
  loading: () => null,
});

export type MotionPhoto = {
  id: string;
  src: string;
  alt: string;
  /** grade vignette strength 0..1 (lower = gentler edges, for dark subjects) */
  vignette: number;
};

type Props = {
  photo: MotionPhoto;
  velocityRef?: React.RefObject<number>;
  dprCap?: number;
};

export function DistortionTreatment({ photo, velocityRef, dprCap = 2 }: Props) {
  return (
    <MotionStage src={photo.src} alt={photo.alt} className="motion-stage">
      {(onReady) => (
        <DistortionScene
          src={photo.src}
          intensity={1}
          vignette={photo.vignette}
          dprCap={dprCap}
          externalVelocityRef={velocityRef}
          onReady={onReady}
        />
      )}
    </MotionStage>
  );
}
