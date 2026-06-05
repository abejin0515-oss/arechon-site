'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GRADE_GLSL } from './grade.glsl';
import {
  InteractionController,
  coverScale,
  useImageTexture,
  useDataTexture,
  type Pointer,
} from './sceneShared';

/* (b) 2.5D DEPTH PARALLAX
 * ───────────────────────
 * A subdivided plane is displaced along Z by an APPROXIMATE depth map (white =
 * near). A perspective camera drifts with the pointer + a slow idle orbit, so
 * the flat photo reveals real depth: near grains slide against the far bokeh.
 *
 * The depth map is a hand-built radial/luminance approximation (see
 * scripts/gen-depth-map.mjs). In PRODUCTION, replace public/motion/rice-depth.png
 * with an AI monocular depth map (Depth Anything V2 / MiDaS) for per-grain
 * accuracy — this shader reads whatever grayscale lives at that path.
 *
 * UV parallax: the fragment also offsets the photo sample by depth * cameraShift
 * so parallax is felt across the whole frame, not only at the silhouette. */

const vertexShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  varying float vDepth;

  uniform sampler2D uDepth;
  uniform vec2  uImageScale;
  uniform float uDisplace;   // world-units of Z push for near pixels

  vec2 coverUv(vec2 uv) { return (uv - 0.5) * uImageScale + 0.5; }

  void main() {
    vUv = uv;
    vec2 duv = coverUv(uv);
    // depth sampled in vertex shader: smooth map → fine on a 64x64 grid.
    float d = texture2D(uDepth, duv).r;
    vDepth = d;
    vec3 pos = position;
    // Push near pixels toward the camera (+Z). Center the field so the plane
    // doesn't translate as a whole.
    pos.z += (d - 0.45) * uDisplace;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  varying float vDepth;

  uniform sampler2D uTexture;
  uniform vec2  uImageScale;
  uniform vec2  uParallax;   // depth-scaled UV shift from camera/pointer
  uniform float uTime;

  ${GRADE_GLSL}

  vec2 coverUv(vec2 uv) { return (uv - 0.5) * uImageScale + 0.5; }

  void main() {
    vec2 uv = coverUv(vUv);
    // Near pixels parallax more than far pixels.
    vec2 off = uParallax * vDepth;
    vec2 sampleUv = uv + off;
    vec3 col = texture2D(uTexture, sampleUv).rgb;

    vec2 edge = step(0.0, sampleUv) * step(sampleUv, vec2(1.0));
    col *= edge.x * edge.y;

    col = grade(col, vUv, uTime, 1.0);
    gl_FragColor = vec4(col, 1.0);
  }
`;

function Plane({
  texture,
  depth,
  imageAspect,
  intensity,
  pointerRef,
  velocityRef,
  onFirstFrame,
}: {
  texture: THREE.Texture;
  depth: THREE.Texture;
  imageAspect: number;
  intensity: number;
  pointerRef: React.RefObject<Pointer>;
  velocityRef: React.RefObject<number>;
  onFirstFrame: () => void;
}) {
  const { size, camera } = useThree();
  const painted = useRef(false);
  const meshRef = useRef<THREE.Mesh>(null);
  // Eased camera offset so parallax damps smoothly.
  const cam = useRef({ x: 0, y: 0 });

  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uDepth: { value: depth },
      uImageScale: { value: new THREE.Vector2(1, 1) },
      uParallax: { value: new THREE.Vector2(0, 0) },
      uDisplace: { value: 0.6 * intensity },
      uTime: { value: 0 },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    uniforms.uTexture.value = texture;
    uniforms.uDepth.value = depth;
    uniforms.uDisplace.value = 0.6 * intensity;
  }, [texture, depth, intensity, uniforms]);

  // Fit the plane to the viewport at the camera distance and cover-fit the image.
  useEffect(() => {
    const aspect = size.width / size.height;
    coverScale(aspect, imageAspect, uniforms.uImageScale.value);
    const persp = camera as THREE.PerspectiveCamera;
    persp.aspect = aspect;
    // Plane is 2x2 in local space at z=0; size camera so it fills the frame
    // with a touch of headroom for parallax bleed.
    const dist = 2.6;
    persp.position.set(0, 0, dist);
    persp.lookAt(0, 0, 0);
    const vFov = 2 * Math.atan(1.06 / dist) * (180 / Math.PI); // ~plane half-height/dist
    persp.fov = vFov;
    persp.near = 0.1;
    persp.far = 10;
    persp.updateProjectionMatrix();
    if (meshRef.current) {
      // Scale local plane (2 units) to cover; aspect handled by uImageScale in UV.
      meshRef.current.scale.set(aspect >= 1 ? aspect : 1, aspect >= 1 ? 1 : 1 / aspect, 1);
    }
  }, [size.width, size.height, imageAspect, camera, uniforms]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30);
    uniforms.uTime.value += dt;
    const p = pointerRef.current;

    // Idle orbit so the depth is legible even without input (very slow).
    const t = state.clock.elapsedTime;
    const idleX = Math.sin(t * 0.25) * 0.18;
    const idleY = Math.cos(t * 0.21) * 0.12;

    const targetX = p.x * 1.1 + idleX;
    const targetY = p.y * 1.1 + idleY;
    const k = 1 - Math.exp(-6 * dt);
    cam.current.x += (targetX - cam.current.x) * k;
    cam.current.y += (targetY - cam.current.y) * k;

    const persp = camera as THREE.PerspectiveCamera;
    const amt = 0.22 * intensity;
    persp.position.x = cam.current.x * amt;
    persp.position.y = cam.current.y * amt;
    persp.lookAt(0, 0, 0);

    // UV parallax in the opposite direction, scaled small.
    uniforms.uParallax.value.set(-cam.current.x * 0.04 * intensity, -cam.current.y * 0.04 * intensity);

    if (!painted.current) {
      painted.current = true;
      onFirstFrame();
    }
    // velocityRef is read by the shared controller for frameloop only; touch
    // pulses still register because they move the pointer target.
    void velocityRef;
  });

  return (
    <mesh ref={meshRef} frustumCulled={false}>
      <planeGeometry args={[2, 2, 96, 96]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        depthTest
        depthWrite
      />
    </mesh>
  );
}

function Gate({
  src,
  depthSrc,
  intensity,
  pointerRef,
  velocityRef,
  onReady,
}: {
  src: string;
  depthSrc: string;
  intensity: number;
  pointerRef: React.RefObject<Pointer>;
  velocityRef: React.RefObject<number>;
  onReady: () => void;
}) {
  const loaded = useImageTexture(src);
  const depth = useDataTexture(depthSrc);
  if (!loaded || !depth) return null;
  return (
    <Plane
      texture={loaded.texture}
      depth={depth}
      imageAspect={loaded.aspect}
      intensity={intensity}
      pointerRef={pointerRef}
      velocityRef={velocityRef}
      onFirstFrame={onReady}
    />
  );
}

export type DepthSceneProps = {
  src: string;
  depthSrc: string;
  intensity?: number;
  dprCap?: number;
  externalVelocityRef?: React.RefObject<number>;
  onReady?: () => void;
};

export default function DepthScene({
  src,
  depthSrc,
  intensity = 1,
  dprCap = 2,
  externalVelocityRef,
  onReady,
}: DepthSceneProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const velocityRef = useRef(0);
  const pointerRef = useRef<Pointer>({ x: 0, y: 0 });

  return (
    <div ref={wrapperRef} style={{ position: 'absolute', inset: 0 }}>
      <Canvas
        gl={{ antialias: true, alpha: true, stencil: false, powerPreference: 'high-performance' }}
        dpr={[1, dprCap]}
        camera={{ fov: 45, position: [0, 0, 2.6] }}
        frameloop="always"
      >
        <InteractionController
          wrapperRef={wrapperRef}
          velocityRef={velocityRef}
          pointerRef={pointerRef}
          externalVelocityRef={externalVelocityRef}
        />
        <Gate
          src={src}
          depthSrc={depthSrc}
          intensity={intensity}
          pointerRef={pointerRef}
          velocityRef={velocityRef}
          onReady={onReady ?? (() => {})}
        />
      </Canvas>
    </div>
  );
}
