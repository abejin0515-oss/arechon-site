"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import {
  LinearMipmapLinearFilter,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  SRGBColorSpace,
  Vector2,
  type IUniform,
  type Texture,
} from "three";

/**
 * ImagePlane — a still, beautifully-rendered textured plane that responds
 * with quiet restraint to scroll and cursor.
 *
 * No vertex distortion. No chromatic aberration. The image is content; the
 * craft is in how *little* we touch it.
 *
 * Motion language:
 *   - Hover: plane scales 1.0 → 1.04 (mesh scale, not shader) + brightness lift
 *   - Scroll velocity: vertical inertia drag, up to ±8px (mesh.y, not curl)
 *   - Edge vignette: subtle, so the image sits on the page like a print
 */

export interface ImagePlaneLiveState {
  /** World-space (pixel) center of the plane. y is CSS-up. */
  position: [number, number];
  /** World-space (pixel) base size of the plane. */
  size: [number, number];
  /** Normalized scroll velocity [-1, 1]. Drives Y-direction motion smear. */
  velocity: number;
  /** Pointer proximity 0..1. Drives hover scale + brightness. */
  hover: number;
  /** Viewport progress 0..1. Drives the parallax window slide. */
  progress: number;
}

export interface ImagePlaneProps {
  imageUrl: string;
  live: ImagePlaneLiveState;
}

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;

  uniform sampler2D uTexture;
  uniform vec2 uTexSize;
  uniform vec2 uPlaneSize;
  uniform float uHover;
  uniform float uProgress;
  uniform float uVelocity;
  uniform float uBreath;

  varying vec2 vUv;

  // Cover-fit UVs (object-fit: cover) — texture fills the plane, never stretched.
  vec2 coverUv(vec2 uv, vec2 texSize, vec2 planeSize) {
    float texAspect = texSize.x / texSize.y;
    float planeAspect = planeSize.x / planeSize.y;
    vec2 scale = vec2(1.0);
    if (planeAspect > texAspect) {
      scale.y = texAspect / planeAspect;
    } else {
      scale.x = planeAspect / texAspect;
    }
    return (uv - 0.5) * scale + 0.5;
  }

  void main() {
    // Cover-fit, then zoom in 30% to reserve room for the parallax window slide.
    vec2 uv = coverUv(vUv, uTexSize, uPlaneSize);
    uv = (uv - 0.5) * 0.70 + 0.5;

    // Parallax window — visible portion sweeps vertically with viewport progress.
    uv.y -= (uProgress - 0.5) * 0.50;

    // Breath zoom — content zooms in 8% at viewport center, neutral at edges.
    // All "scale" effects live in UV land so the mesh never exceeds its rect.
    uv = (uv - 0.5) * (1.0 - uBreath * 0.08) + 0.5;

    // Hover zoom on top of breath — image leans into the cursor.
    uv = (uv - 0.5) * (1.0 - uHover * 0.12) + 0.5;

    // Clamp so we never sample outside the texture (prevents edge streaking
    // when smear or parallax pushes samples toward 0/1).
    uv = clamp(uv, vec2(0.001), vec2(0.999));

    // 5-tap vertical motion smear, weighted by velocity.
    float smear = uVelocity * 0.030;
    vec3 col = vec3(0.0);
    col += texture2D(uTexture, clamp(vec2(uv.x, uv.y - smear * 1.5), 0.001, 0.999)).rgb * 0.15;
    col += texture2D(uTexture, clamp(vec2(uv.x, uv.y - smear * 0.5), 0.001, 0.999)).rgb * 0.25;
    col += texture2D(uTexture, uv).rgb * 0.20;
    col += texture2D(uTexture, clamp(vec2(uv.x, uv.y + smear * 0.5), 0.001, 0.999)).rgb * 0.25;
    col += texture2D(uTexture, clamp(vec2(uv.x, uv.y + smear * 1.5), 0.001, 0.999)).rgb * 0.15;

    // Soft edge vignette — image feels printed, not floating.
    float d = length(vUv - 0.5);
    float vig = smoothstep(0.95, 0.25, d);
    col *= mix(0.82, 1.0, vig);

    // Hover brightness + saturation lift.
    float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = mix(col, mix(vec3(lum), col, 1.25), uHover);
    col *= 1.0 + uHover * 0.18;

    gl_FragColor = vec4(col, 1.0);
  }
`;

interface PlaneUniforms {
  uTexture: IUniform<Texture | null>;
  uTexSize: IUniform<Vector2>;
  uPlaneSize: IUniform<Vector2>;
  uHover: IUniform<number>;
  uProgress: IUniform<number>;
  uVelocity: IUniform<number>;
  uBreath: IUniform<number>;
  [key: string]: IUniform;
}

const VELOCITY_DRAG_PX = 24;

export function ImagePlane({ imageUrl, live }: ImagePlaneProps) {
  const meshRef = useRef<Mesh>(null);
  const { gl } = useThree();

  const texture = useTexture(imageUrl);

  useEffect(() => {
    texture.colorSpace = SRGBColorSpace;
    texture.minFilter = LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    const maxAniso = gl.capabilities.getMaxAnisotropy?.() ?? 1;
    texture.anisotropy = Math.min(4, maxAniso);
    texture.needsUpdate = true;
  }, [texture, gl]);

  // 2×2 segments is enough — no vertex deformation, so segment count doesn't help.
  const geometry = useMemo(() => new PlaneGeometry(1, 1, 2, 2), []);

  const material = useMemo(() => {
    const uniforms: PlaneUniforms = {
      uTexture: { value: null },
      uTexSize: { value: new Vector2(1, 1) },
      uPlaneSize: { value: new Vector2(1, 1) },
      uHover: { value: 0 },
      uProgress: { value: 0.5 },
      uVelocity: { value: 0 },
      uBreath: { value: 0 },
    };
    return new ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms,
      transparent: false,
    });
  }, []);

  useEffect(() => {
    material.uniforms.uTexture.value = texture;
    const img = texture.image as
      | { width?: number; height?: number; naturalWidth?: number; naturalHeight?: number }
      | undefined;
    const w = img?.naturalWidth ?? img?.width ?? 1;
    const h = img?.naturalHeight ?? img?.height ?? 1;
    (material.uniforms.uTexSize.value as Vector2).set(w, h);
  }, [material, texture]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    // Mesh ALWAYS exactly fits its rect. Every "scale" effect (breath, hover)
    // is done as UV zoom inside the fragment shader, so the image content
    // changes intensity without the plane geometry ever exceeding its bounds.
    mesh.position.x = live.position[0];
    mesh.position.y = live.position[1] - live.velocity * VELOCITY_DRAG_PX;
    mesh.scale.x = live.size[0];
    mesh.scale.y = live.size[1];

    // Breath: bell curve over viewport progress (0 at edges, 1 at center).
    const breath = Math.sin(live.progress * Math.PI);

    material.uniforms.uHover.value = live.hover;
    material.uniforms.uProgress.value = live.progress;
    material.uniforms.uVelocity.value = live.velocity;
    material.uniforms.uBreath.value = breath;
    (material.uniforms.uPlaneSize.value as Vector2).set(
      live.size[0],
      live.size[1],
    );
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      frustumCulled={false}
    />
  );
}
