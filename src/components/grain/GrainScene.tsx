'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/* -------------------------------------------------------------------------- */
/*  CONCEPT                                                                     */
/*  「同じ田の同じ一粒が、年を越すごとに新米の艶から古米の落ち着きへ           */
/*   材質を変えながら、形は変わらず受け継がれる」＝ 継承。                      */
/*                                                                             */
/*  - GEOMETRY NEVER CHANGES. Only the SURFACE response (uSeason 0..1) morphs. */
/*  - uSeason は「カーソルから米までの距離」を smooth した連続値。              */
/*       近い(0) = 新米: wet / glossy / faint blue / translucent rim          */
/*       遠い(1) = 古米: matte / warm / dry / settled                          */
/*  - 二値 hover 禁止 / scroll-into-view 禁止。距離場のみ。                      */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*  Grain geometry — one rice grain, magnified beyond cuteness into texture.   */
/*  Built procedurally (lathe profile + surface noise displacement) so there   */
/*  is no external asset. The geometry is generated ONCE and never mutated.    */
/* -------------------------------------------------------------------------- */

function makeGrainGeometry(): THREE.BufferGeometry {
  // Rice profile: long, plump in the middle, tapered to rounded points.
  // Lathe a half-silhouette around Y, then displace by low-freq noise to give
  // the dimpled, organic surface of a real polished grain.
  const profile: THREE.Vector2[] = [];
  const SEG = 40;
  for (let i = 0; i <= SEG; i++) {
    const t = i / SEG; // 0..1 along the grain length
    // y from -1 (bottom tip) to +1 (top tip)
    const y = (t - 0.5) * 2.0;
    // radius: a smooth bump fattest just below centre (rice is asymmetric)
    const bump = Math.sin(Math.PI * t);
    // asymmetry: one end slightly blunter (the germ end)
    const asym = 1.0 - 0.18 * Math.cos(Math.PI * t);
    const r = Math.pow(bump, 0.62) * 0.46 * asym;
    profile.push(new THREE.Vector2(Math.max(r, 0.0008), y));
  }

  const geo = new THREE.LatheGeometry(profile, 96);
  geo.computeVertexNormals();

  // Surface displacement — subtle facets/dimples of a polished grain.
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const nrm = geo.attributes.normal as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();
  // A cheap value-noise via trig sums (deterministic, no deps).
  const noise = (x: number, y: number, z: number) =>
    0.5 *
      Math.sin(x * 7.0 + y * 3.0) *
      Math.cos(z * 6.0 - y * 2.0) +
    0.5 * Math.sin((x + z) * 11.0 + y * 5.0) * 0.5;

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(nrm, i);
    const d = noise(v.x, v.y, v.z) * 0.016; // very subtle
    v.addScaledVector(n, d);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  // A faint longitudinal crease (rice has a ventral groove) baked via a 2nd pass
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(nrm, i);
    const angle = Math.atan2(v.z, v.x);
    const groove = Math.exp(-Math.pow((angle) / 0.35, 2.0)) * 0.05;
    v.addScaledVector(n, -groove);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  geo.computeTangents?.();
  return geo;
}

/* -------------------------------------------------------------------------- */
/*  Material — material-morph-WITHOUT-geometry.                                */
/*  A single shader analytically blends two surface "seasons" by uSeason:      */
/*   newRice (0): high spec, sharp highlight, cool rim, wet translucency        */
/*   oldRice (1): broad soft diffuse, warm body, dry, settled                  */
/*  We DO NOT swap materials or geometry — only the uniform moves.             */
/* -------------------------------------------------------------------------- */

const grainVert = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  varying vec3 vPosW;
  varying float vY;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vPosW = worldPos.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    vY = position.y;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const grainFrag = /* glsl */ `
  precision highp float;

  varying vec3 vNormalW;
  varying vec3 vViewDir;
  varying vec3 vPosW;
  varying float vY;

  uniform float uSeason;   // 0 = 新米(wet) .. 1 = 古米(aged)
  uniform float uTime;
  uniform vec3  uLightPos; // single warm-white spot
  uniform vec3  uLightColor;
  uniform vec3  uNewBody;  // new-rice translucent body color
  uniform vec3  uOldBody;  // old-rice warm settled body color
  uniform float uFresnelPow;

  // cheap hash for micro-grain
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }

  void main() {
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(vViewDir);
    vec3 L = normalize(uLightPos - vPosW);
    vec3 H = normalize(L + V);

    float ndl = max(dot(N, L), 0.0);
    float ndv = max(dot(N, V), 0.0);
    float ndh = max(dot(N, H), 0.0);

    // --- NEW RICE (season 0): wet, glossy, sharp small highlight, cool rim ---
    // tight specular lobe
    float specNew = pow(ndh, 220.0) * 1.35;
    // a secondary broader wet sheen
    float sheenNew = pow(ndh, 28.0) * 0.30;
    // cool translucent rim (faint blue) — light passing the wet kernel edge
    float rim = pow(1.0 - ndv, uFresnelPow);
    vec3 coolRim = vec3(0.62, 0.72, 0.95) * rim * 0.5;
    vec3 bodyNew = uNewBody * (0.18 + 0.82 * ndl);
    vec3 colNew = bodyNew + uLightColor * (specNew + sheenNew) + coolRim;

    // --- OLD RICE (season 1): matte, warm, dry, broad soft diffuse ---
    // wrapped (half-lambert) diffuse → soft settled look
    float wrap = ndl * 0.5 + 0.5;
    float specOld = pow(ndh, 16.0) * 0.06; // barely-there dry sheen
    vec3 bodyOld = uOldBody * (0.30 + 0.70 * wrap);
    // warm self-shadow in the groove/underside
    vec3 colOld = bodyOld + uLightColor * specOld * 0.4;

    // --- blend ONLY by uSeason (no geometry change) ---
    vec3 col = mix(colNew, colOld, uSeason);

    // micro-grain texture of polished rice (constant, both seasons)
    float g = (hash(gl_FragCoord.xy) - 0.5) * 0.025;
    col += g;

    // gentle tone — keep it in the cinematic-dark range, never blown out
    col = col / (col + vec3(0.85));
    col = pow(col, vec3(0.92));

    gl_FragColor = vec4(col, 1.0);
  }
`;

/* -------------------------------------------------------------------------- */
/*  Environment time — scroll progress (0..1) → the single lamp's position,     */
/*  colour temperature and intensity across one day. ONE accent (warm white)    */
/*  shifted along a hue/temperature track; never a second colour.               */
/*  Keyframes: 0 dawn · 0.34 noon · 0.68 dusk · 1 night.                         */
/* -------------------------------------------------------------------------- */

const TOD_POS = [
  new THREE.Vector3(-3.4, 1.4, 2.6), // dawn — low, raking from the side
  new THREE.Vector3(0.6, 4.2, 2.8), // noon — high overhead
  new THREE.Vector3(3.6, 1.2, 2.6), // dusk — low, opposite side
  new THREE.Vector3(1.4, 3.6, -1.2), // night — steep, behind/cool
];
const TOD_COL = [
  new THREE.Color('#ffcf9e'), // dawn — warm amber
  new THREE.Color('#fff4e2'), // noon — warm white (the signature accent)
  new THREE.Color('#ffb27a'), // dusk — deep amber
  new THREE.Color('#bcd0ff'), // night — cool moon-white
];
const TOD_INT = [10, 20, 12, 7]; // spotLight intensity per phase

function todLerp<T extends THREE.Vector3 | THREE.Color>(
  arr: T[],
  t: number,
  out: T,
): T {
  const seg = 1 / (arr.length - 1);
  const i = Math.min(Math.floor(t / seg), arr.length - 2);
  const f = (t - i * seg) / seg;
  // @ts-expect-error Vector3 & Color both implement lerpVectors-like via copy/lerp
  out.copy(arr[i]).lerp(arr[i + 1], f);
  return out;
}

const _todPos = new THREE.Vector3();
const _todCol = new THREE.Color();

function timeOfDay(t: number): {
  pos: THREE.Vector3;
  color: THREE.Color;
  intensity: number;
} {
  const p = THREE.MathUtils.clamp(t, 0, 1);
  todLerp(TOD_POS, p, _todPos);
  todLerp(TOD_COL, p, _todCol);
  // intensity: piecewise-linear along the same 4 phases
  const seg = 1 / 3;
  const i = Math.min(Math.floor(p / seg), 2);
  const f = (p - i * seg) / seg;
  const intensity = TOD_INT[i] + (TOD_INT[i + 1] - TOD_INT[i]) * f;
  return { pos: _todPos, color: _todCol, intensity };
}

type GrainProps = {
  seasonRef: React.RefObject<number>;
  progressRef: React.RefObject<number>;
  reduced: boolean;
  activeRef: React.RefObject<boolean>;
};

function Grain({ seasonRef, progressRef, reduced, activeRef }: GrainProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometry = useMemo(makeGrainGeometry, []);

  const uniforms = useMemo(
    () => ({
      uSeason: { value: reduced ? 0.5 : 1.0 },
      uTime: { value: 0 },
      uLightPos: { value: new THREE.Vector3(2.2, 3.0, 3.0) },
      uLightColor: { value: new THREE.Color('#fff4e2') }, // warm white spot
      uNewBody: { value: new THREE.Color('#e9eef0') }, // cool wet pearl
      uOldBody: { value: new THREE.Color('#d8c4a3') }, // warm aged ivory
      uFresnelPow: { value: 2.6 },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // dispose geometry on unmount
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((_, delta) => {
    if (!activeRef.current) return;
    const dt = Math.min(delta, 1 / 30);
    uniforms.uTime.value += dt;

    // TWO time axes, combined so proximity ALWAYS wins (intimate > macro):
    //   - scroll progress advances a slow BASE aging (the years passing as you
    //     descend through the granary). base: 0.35 → 0.95 across the scroll.
    //   - cursor proximity (seasonRef, 0=新米 near .. 1=古米 far) pulls AGAINST
    //     that base toward 新米 when you lean in. We take the MINIMUM so leaning
    //     in can always restore "that year" to new rice, no matter how far the
    //     scroll has aged it. macro time can never override the intimate touch.
    const prog = reduced ? 0 : progressRef.current;
    const base = 0.35 + prog * 0.6; // year drifts toward 古米 down the scroll
    const proximity = seasonRef.current; // 0 near (新米) .. 1 far (古米)
    const target = reduced ? 0.5 : Math.min(base, proximity);
    const cur = uniforms.uSeason.value;
    uniforms.uSeason.value = cur + (target - cur) * (1 - Math.pow(0.0015, dt));

    // Diagnostic-only hook (non-production): lets Playwright assert that the
    // proximity field actually moves the smoothed season uniform with the
    // cursor. Headless software-rendering can't be eyeballed, so we verify the
    // value, not the pixels. No effect on production users.
    if (process.env.NODE_ENV !== 'production') {
      (
        window as Window & { __grainSeason?: number }
      ).__grainSeason = uniforms.uSeason.value;
    }

    // --- environment time: the one lamp moves through the day as you scroll ---
    // dawn (warm-dim, low/side) → noon (neutral-bright, high) → dusk (amber,
    // low) → night (cool-dim, steep). We interpolate the SAME warm-white accent
    // along a single hue/temperature track — never a second accent colour.
    const ld = timeOfDay(prog);
    uniforms.uLightPos.value.copy(ld.pos);
    uniforms.uLightColor.value.copy(ld.color);

    // environment-breathes: ultra-slow self-rotation (off when reduced motion)
    if (!reduced && meshRef.current) {
      meshRef.current.rotation.y += dt * 0.12;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} rotation={[0.18, 0, 0.32]}>
      <shaderMaterial
        vertexShader={grainVert}
        fragmentShader={grainFrag}
        uniforms={uniforms}
      />
    </mesh>
  );
}

/* -------------------------------------------------------------------------- */
/*  Nuka (糠) particles — faint motes that drift down past the grain.          */
/*  Environmental pulse, kept very restrained. Off under reduced motion.       */
/* -------------------------------------------------------------------------- */

function NukaParticles({
  seasonRef,
  activeRef,
}: {
  seasonRef: React.RefObject<number>;
  activeRef: React.RefObject<boolean>;
}) {
  const COUNT = 90;
  const pointsRef = useRef<THREE.Points>(null);

  const { geometry, material, speeds } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const speeds = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 3.2;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 4.0;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2.4 - 0.3;
      speeds[i] = 0.06 + Math.random() * 0.14;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: new THREE.Color('#f3e6cf'),
      size: 0.018,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { geometry, material, speeds };
  }, []);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((_, delta) => {
    if (!activeRef.current || !pointsRef.current) return;
    const dt = Math.min(delta, 1 / 30);
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3 + 1] -= speeds[i] * dt;
      // slight lateral sway
      arr[i * 3] += Math.sin((arr[i * 3 + 1] + i) * 1.5) * dt * 0.02;
      if (arr[i * 3 + 1] < -2.0) {
        arr[i * 3 + 1] = 2.0;
        arr[i * 3] = (Math.random() - 0.5) * 3.2;
      }
    }
    pos.needsUpdate = true;
    // more motes settle in the "aged" (far) state — the granary dust of years
    const target = 0.05 + seasonRef.current * 0.16;
    material.opacity += (target - material.opacity) * (1 - Math.pow(0.02, dt));
  });

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}

/* -------------------------------------------------------------------------- */
/*  Proximity field — cursor→grain distance drives uSeason via seasonRef.      */
/*  Projects the grain centre to screen space and measures normalized cursor   */
/*  distance. Continuous. Pointer-leave eases back to 古米 (settled).          */
/* -------------------------------------------------------------------------- */

function ProximityController({
  seasonRef,
}: {
  seasonRef: React.RefObject<number>;
}) {
  const { camera, size } = useThree();

  useEffect(() => {
    const grainWorld = new THREE.Vector3(0, 0, 0);

    // Project the grain centre to NDC → pixel space.
    const computeGrainScreen = () => {
      const v = grainWorld.clone().project(camera);
      return {
        x: (v.x * 0.5 + 0.5) * size.width,
        y: (-v.y * 0.5 + 0.5) * size.height,
      };
    };
    let grainScreen = computeGrainScreen();

    // Distance over which season runs 0→1, scaled to the smaller viewport axis
    // so it feels consistent on phone & desktop.
    const reach = () => Math.min(size.width, size.height) * 0.62;

    const onMove = (e: PointerEvent) => {
      const gs = grainScreen;
      const dx = e.clientX - gs.x;
      const dy = e.clientY - gs.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // near → 0 (新米), far → 1 (古米). smoothstep for an organic field.
      const t = THREE.MathUtils.clamp(dist / reach(), 0, 1);
      seasonRef.current = t * t * (3 - 2 * t); // smoothstep
    };

    const onLeave = () => {
      // cursor gone → drift to 古米 (the grain settles into its aged self)
      seasonRef.current = 1.0;
    };

    const onResize = () => {
      grainScreen = computeGrainScreen();
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerleave', onLeave);
    window.addEventListener('blur', onLeave);
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
      window.removeEventListener('resize', onResize);
    };
  }, [camera, size, seasonRef]);

  return null;
}

/* -------------------------------------------------------------------------- */
/*  Scroll progress — mirror window.__grainScroll (published by GrainScroll)    */
/*  into the in-frame progressRef. One number, read imperatively, no re-render. */
/* -------------------------------------------------------------------------- */

function ScrollProgressController({
  progressRef,
}: {
  progressRef: React.RefObject<number>;
}) {
  useFrame(() => {
    const v = (window as Window & { __grainScroll?: number }).__grainScroll;
    if (typeof v === 'number') progressRef.current = v;
  });
  return null;
}

/* -------------------------------------------------------------------------- */
/*  Single warm-white spot — 蔵の闇に一灯。                                     */
/* -------------------------------------------------------------------------- */

function Lighting({
  progressRef,
  reduced,
  activeRef,
}: {
  progressRef: React.RefObject<number>;
  reduced: boolean;
  activeRef: React.RefObject<boolean>;
}) {
  const spotRef = useRef<THREE.SpotLight>(null);

  useFrame((_, delta) => {
    if (!activeRef.current || !spotRef.current) return;
    const dt = Math.min(delta, 1 / 30);
    const prog = reduced ? 0 : progressRef.current;
    const ld = timeOfDay(prog);
    // Damp toward the time-of-day target so scrubbing scroll reads as the light
    // *moving through the day*, not snapping. Same easing constant as the season.
    const k = 1 - Math.pow(0.0015, dt);
    const s = spotRef.current;
    s.position.lerp(ld.pos, k);
    s.color.lerp(ld.color, k);
    s.intensity += (ld.intensity - s.intensity) * k;
    // angle widens a touch at noon, narrows to a steeper pool at night
    const targetAngle = 0.42 + (1 - Math.abs(prog - 0.34) * 1.5) * 0.12;
    s.angle += (THREE.MathUtils.clamp(targetAngle, 0.32, 0.56) - s.angle) * k;
  });

  return (
    <>
      {/* the one lamp on the grain — position/colour/intensity scroll the day */}
      <spotLight
        ref={spotRef}
        position={[-3.4, 1.4, 2.6]}
        angle={0.42}
        penumbra={0.9}
        intensity={10}
        distance={14}
        color="#ffcf9e"
      />
      {/* a whisper of fill so the dark side isn't pure void */}
      <ambientLight intensity={0.06} color="#3a3026" />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Visibility controller — pause frameloop when tab hidden / offscreen.       */
/* -------------------------------------------------------------------------- */

function VisibilityController({
  activeRef,
}: {
  activeRef: React.RefObject<boolean>;
}) {
  const setFrameloop = useThree((s) => s.setFrameloop);
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    let frameloop: 'always' | 'never' = 'always';
    const setActive = (on: boolean) => {
      activeRef.current = on;
      const next: 'always' | 'never' = on ? 'always' : 'never';
      if (frameloop !== next) {
        frameloop = next;
        setFrameloop(next);
      }
    };
    const onVisibility = () => setActive(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);

    let io: IntersectionObserver | null = null;
    const el = gl.domElement;
    if (el && 'IntersectionObserver' in window) {
      io = new IntersectionObserver(
        ([entry]) => setActive(entry.isIntersecting && !document.hidden),
        { threshold: 0 },
      );
      io.observe(el);
    }

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      io?.disconnect();
      setFrameloop('always');
    };
  }, [activeRef, setFrameloop, gl]);

  return null;
}

/* -------------------------------------------------------------------------- */
/*  Scene root                                                                  */
/* -------------------------------------------------------------------------- */

export type GrainSceneProps = {
  reduced: boolean;
  dprCap?: number;
};

export default function GrainScene({ reduced, dprCap = 1.75 }: GrainSceneProps) {
  // seasonRef starts at 古米(1.0) — the grain is found already aged, settled in
  // the dark granary; approaching the cursor brings it back to its 新米 year.
  const seasonRef = useRef<number>(reduced ? 0.5 : 1.0);
  // progressRef mirrors window.__grainScroll (published by GrainScroll/Lenis).
  // Read in-frame imperatively — never through React state — so scroll never
  // triggers a re-render of the WebGL tree.
  const progressRef = useRef<number>(0);
  const activeRef = useRef(true);
  const [contextLost, setContextLost] = useState(false);

  if (contextLost) return null; // parent CSS poster takes over

  return (
    <Canvas
      aria-hidden="true"
      gl={{
        antialias: true,
        // alpha:true SAFETY NET — if the GPU never paints (headless/SwiftShader),
        // the dark CSS poster behind shows through. Never a white box.
        alpha: true,
        powerPreference: 'high-performance',
        stencil: false,
      }}
      dpr={[1, dprCap]}
      camera={{ position: [0, 0, 4.4], fov: 38 }}
      frameloop="always"
      onCreated={({ gl }) => {
        gl.setClearColor(new THREE.Color('#0c0a08'), 0);
        gl.domElement.addEventListener(
          'webglcontextlost',
          (e) => {
            e.preventDefault();
            setContextLost(true);
          },
          { once: true },
        );
      }}
    >
      <VisibilityController activeRef={activeRef} />
      <ProximityController seasonRef={seasonRef} />
      <ScrollProgressController progressRef={progressRef} />
      <Lighting progressRef={progressRef} reduced={reduced} activeRef={activeRef} />
      <Grain
        seasonRef={seasonRef}
        progressRef={progressRef}
        reduced={reduced}
        activeRef={activeRef}
      />
      {!reduced && <NukaParticles seasonRef={seasonRef} activeRef={activeRef} />}
    </Canvas>
  );
}
