"use client";

/**
 * Sample. — the WebGL paragraph generator.
 *
 * One paragraph generated in front of you as you scroll. Ghost alternatives
 * (the rejected words) bloom in 3D around each chosen word, then dissolve.
 * Asymmetric easing: 200ms in, 1200ms out. Rejection takes longer than
 * consideration. Hover any settled word at scroll=1 to rewind its ghosts.
 *
 * Owns: R3F canvas, Lenis scroll, GSAP ticker, DOM chrome overlay.
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import Lenis from "lenis";

// ----------------------------------------------------------------------------
// Data
// ----------------------------------------------------------------------------

type Word = {
  word: string;
  italic?: boolean;
  ghosts?: string[];
};

const PARAGRAPH: Word[] = [
  { word: "Every", ghosts: ["Each", "Any", "A"] },
  { word: "sentence", ghosts: ["line", "phrase", "utterance", "sequence"] },
  { word: "is" },
  { word: "a" },
  { word: "kind" },
  { word: "of" },
  {
    word: "refusal",
    italic: true,
    ghosts: ["choice", "exclusion", "surrender", "deletion"],
  },
  { word: "." },
  { word: "Before", ghosts: ["Until", "When", "Where"] },
  { word: "this" },
  { word: "word" },
  { word: "arrived", ghosts: ["landed", "appeared", "emerged"] },
  { word: "," },
  { word: "a" },
  { word: "thousand", ghosts: ["hundred", "million", "dozen"] },
  { word: "others" },
  { word: "stood", ghosts: ["waited", "hovered", "lingered"] },
  { word: "beside", ghosts: ["behind", "near", "around"] },
  { word: "it" },
  { word: "—" },
  { word: "almost", ghosts: ["nearly", "half"] },
  { word: "chosen", ghosts: ["picked", "selected", "real"] },
  { word: "," },
  { word: "almost" },
  { word: "true", ghosts: ["right", "plausible", "possible"] },
  { word: "." },
  { word: "The" },
  { word: "model" },
  { word: "that" },
  { word: "wrote" },
  { word: "me" },
  { word: "leaned", ghosts: ["tilted", "drifted", "reached"] },
  { word: "toward", ghosts: ["into", "against", "past"] },
  { word: "one" },
  { word: "," },
  { word: "then" },
  { word: "another" },
  { word: "," },
  { word: "then" },
  { word: "settled", ghosts: ["chose", "committed", "landed", "resolved"] },
  { word: "," },
  { word: "the" },
  { word: "way" },
  { word: "a" },
  { word: "hand", ghosts: ["finger", "palm", "mind"] },
  { word: "settles" },
  { word: "on" },
  { word: "a" },
  { word: "doorknob", ghosts: ["latch", "handle", "switch", "edge"] },
  { word: "in" },
  { word: "the" },
  { word: "dark", ghosts: ["dim", "quiet", "blind", "unknown"] },
  { word: "." },
  { word: "What" },
  { word: "you" },
  { word: "read" },
  { word: "is" },
  { word: "the" },
  {
    word: "survivor",
    italic: true,
    ghosts: ["winner", "remainder", "chosen", "residue"],
  },
  { word: "." },
  { word: "The" },
  { word: "rest" },
  { word: "are" },
  { word: "still" },
  { word: "here" },
  { word: "," },
  { word: "hovering", ghosts: ["floating", "drifting", "lingering", "waiting"] },
  { word: "," },
  { word: "slightly" },
  { word: "transparent", ghosts: ["translucent", "faded", "ghostly"] },
  { word: "," },
  { word: "slightly" },
  { word: "hurt", italic: true, ghosts: ["sad", "sorry", "dimmed", "bruised"] },
  { word: "." },
  { word: "Language", italic: true, ghosts: ["Writing", "Meaning", "Speech"] },
  { word: "," },
  { word: "it" },
  { word: "turns" },
  { word: "out" },
  { word: "," },
  { word: "is" },
  { word: "mostly", ghosts: ["largely", "almost", "secretly"] },
  { word: "the" },
  { word: "things" },
  { word: "we" },
  { word: "did" },
  { word: "not" },
  { word: "say" },
  { word: "." },
];

const FINAL_PHRASE_GHOSTS = [
  "the words we refused",
  "the silence between",
  "what we left out",
  "the unsaid",
];

// Final-sentence indices: "the things we did not say" — final phrase rewind hover
const FINAL_SENTENCE_INDICES = (() => {
  // Locate from "the" preceding "things" through "say".
  const out: number[] = [];
  let phase = 0;
  for (let i = 0; i < PARAGRAPH.length; i++) {
    const w = PARAGRAPH[i].word;
    if (phase === 0 && w === "the" && PARAGRAPH[i + 1]?.word === "things") phase = 1;
    if (phase === 1) {
      out.push(i);
      if (w === "say") break;
    }
  }
  return new Set(out);
})();

// ----------------------------------------------------------------------------
// Color tokens (kept in JS for Three; mirrors globals.css)
// ----------------------------------------------------------------------------

const COL = {
  ink: "#0b0d18",
  paper: "#f3f1ec",
  paperDim: "#b3b0a8",
  ghost: "#7e7f95",
  ghostFaint: "#494a5a",
  ember: "#ff7848",
  emberGlow: "#ffa07a",
} as const;

// ----------------------------------------------------------------------------
// Geometry: where does each token sit in 3D?
// ----------------------------------------------------------------------------

// Tunables — STATIC CAMERA layout.
// All words live in a small X/Y rectangle with only millimetric Z variation
// (just enough to give ghosts depth without ever leaving the camera frustum).
const BOWL_DEPTH = 0.4;              // shallow bowl Z curvature (purely cosmetic now)
const COL_GAP = 1.05;                // horizontal advance per em-ish word
const ROW_GAP = 1.35;                // line height — tightened to bring camera closer
const LINE_WIDTH = 14;               // wrap width — wider so fewer rows = bigger words
const HELD_BREATH_FRAC = 0.05;       // 5% of progress between word 72 and 73
const SAY_ROW_DROP = 1.2;            // extra rows of vertical drop before "say" (visual breath)
const SAY_Z_LIFT = 0.6;              // "say" leans toward camera so it pops

type Slot = {
  index: number;
  word: Word;
  position: [number, number, number]; // word center in 3D
  fontSize: number;                   // world size
  isPunct: boolean;
  ghosts: GhostSlot[];
};

type GhostSlot = {
  text: string;
  // offset from the chosen word's center, in WORLD units
  offset: [number, number, number];
  fontSize: number;
};

function isPunct(w: string) {
  return /^[\.,;:!?—–\-]+$/.test(w);
}

// Tiny deterministic PRNG so ghost positions are stable across renders/SSR.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type LayoutMeta = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
};

function buildLayout(
  maxGhostsPerCluster: number,
): { slots: Slot[]; meta: LayoutMeta } {
  const slots: Slot[] = [];
  let cursorX = -LINE_WIDTH / 2;
  let row = 0;
  let lastWasPunct = false;

  for (let i = 0; i < PARAGRAPH.length; i++) {
    const w = PARAGRAPH[i];
    const punct = isPunct(w.word);
    const approxWidth =
      (punct ? 0.35 : Math.max(0.7, w.word.length * 0.42)) + (punct ? 0 : 0.18);

    // soft wrap
    if (!punct && !lastWasPunct && cursorX + approxWidth > LINE_WIDTH / 2) {
      row += 1;
      cursorX = -LINE_WIDTH / 2;
    }

    // "say" gets its own row with extra breath above it.
    if (w.word === "say") {
      row += 1 + SAY_ROW_DROP;
      cursorX = -LINE_WIDTH / 2;
    }

    const x = cursorX + approxWidth / 2;
    const y = -row * ROW_GAP;
    // Shallow bowl on Z — purely cosmetic. NO per-token forward dolly.
    // Camera sees every slot at every scroll position.
    const distFromCenter = Math.hypot(x, y / 2) / LINE_WIDTH;
    let z = -distFromCenter * BOWL_DEPTH;
    if (w.word === "say") {
      // lean "say" toward the camera so it reads as the punctuating moment
      z = SAY_Z_LIFT;
    }

    cursorX += approxWidth + COL_GAP * 0.08;

    const rng = mulberry32(1337 + i * 101);
    const ghosts: GhostSlot[] = (w.ghosts ?? [])
      .slice(0, maxGhostsPerCluster)
      .map((g, gi) => {
        const angle = rng() * Math.PI * 2;
        const radial = 1.4 + rng() * 1.6;
        const ox = Math.cos(angle) * radial * 0.55;
        const oy = Math.sin(angle) * radial * 0.5 + (gi - 1) * 0.15;
        // ghosts live BEHIND the chosen word
        const oz = -(1.6 + rng() * 3.2);
        return {
          text: g,
          offset: [ox, oy, oz],
          fontSize: 0.32 + rng() * 0.08,
        };
      });

    slots.push({
      index: i,
      word: w,
      position: [x, y, z],
      fontSize: w.italic ? 0.78 : 0.62,
      isPunct: punct,
      ghosts,
    });

    if (w.word === "say") {
      cursorX = -LINE_WIDTH / 2 + approxWidth + COL_GAP * 0.08;
    }

    lastWasPunct = punct;
  }

  // Compute layout bounding box — drives camera framing.
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity;
  for (const s of slots) {
    minX = Math.min(minX, s.position[0]);
    maxX = Math.max(maxX, s.position[0]);
    minY = Math.min(minY, s.position[1]);
    maxY = Math.max(maxY, s.position[1]);
    minZ = Math.min(minZ, s.position[2]);
    maxZ = Math.max(maxZ, s.position[2]);
  }
  return { slots, meta: { minX, maxX, minY, maxY, minZ, maxZ } };
}

// ----------------------------------------------------------------------------
// Easing
// ----------------------------------------------------------------------------

const power3Out = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// ----------------------------------------------------------------------------
// Three.js scene
// ----------------------------------------------------------------------------

// Locally-hosted Fraunces variable TTFs (under /public/fonts/).
// Same-origin so no cross-origin / CSP failures inside the WebGL SDF loader.
const FRAUNCES_REG = "/fonts/fraunces.ttf";
const FRAUNCES_ITAL = "/fonts/fraunces-italic.ttf";

type Phase = {
  // 0 = invisible, 1 = present
  ghostIn: number;
  // 0 = present, 1 = receded
  ghostOut: number;
  // chosen word presence 0..1
  chosen: number;
  // ember tint 0..1 (briefly true near ignition then fades)
  ember: number;
};

// Computes per-slot phase from a continuous cursor (0..N).
function phaseFor(i: number, cursor: number, opts: { isSay: boolean }): Phase {
  // consideration starts ~0.5 token before, ignition at i, settle complete +0.05
  // rejection (ghost-out) takes 6x longer than consideration.
  // We express durations in "token units" — paragraph progress drives cursor.
  const considerWindow = 0.5;
  const rejectWindow = 3.0; // 6x

  const d = cursor - i;

  // ghost-in: from -considerWindow → 0, ease in
  const ghostInRaw = (d + considerWindow) / considerWindow;
  const ghostIn = power3Out(Math.min(1, Math.max(0, ghostInRaw)));

  // chosen presence: 0 until d≈-0.1, full by d=0
  const chosen = power3Out(smoothstep(-0.1, 0.05, d));

  // ember: peaks near d=0, fades by d=0.6
  const ember = Math.max(0, 1 - Math.abs(d - 0.0) / 0.35) * (1 - smoothstep(0.0, 0.6, d));

  // ghost-out: starts at ignition (d=0), completes at d=rejectWindow
  const ghostOutRaw = d / rejectWindow;
  const ghostOut = power3Out(Math.min(1, Math.max(0, ghostOutRaw)));

  // "say" special: ember stays held on settled (only place ember-on-settled is allowed)
  if (opts.isSay) {
    return {
      ghostIn,
      ghostOut,
      chosen,
      ember: chosen, // ember-tinted final word
    };
  }
  return { ghostIn, ghostOut, chosen, ember };
}

type SceneApi = {
  progressRef: React.MutableRefObject<number>;
  hoveredRef: React.MutableRefObject<number | null>;
  hoverProgressRef: React.MutableRefObject<Map<number, number>>;
  // 0..1 — how deep we are into the held-breath plateau between "not" and "say".
  // Drives a subtle dim on already-chosen words so "say" arrives feeling singular.
  breathRef: React.MutableRefObject<number>;
  reducedMotion: boolean;
  onTokenChange: (token: number, considered: number) => void;
};

function ParagraphScene({
  slots,
  meta,
  api,
  isMobile,
}: {
  slots: Slot[];
  meta: LayoutMeta;
  api: SceneApi;
  isMobile: boolean;
}) {
  const { camera, invalidate } = useThree();
  const tNow = useRef(0);

  // Find "say" slot for held-breath gating
  const sayIndex = useMemo(
    () => slots.findIndex((s) => s.word.word === "say"),
    [slots],
  );

  // Precompute cumulative ghost counts up to each token
  const cumGhosts = useMemo(() => {
    const arr: number[] = [];
    let c = 0;
    for (const s of slots) {
      arr.push(c);
      c += s.ghosts.length;
    }
    return arr;
  }, [slots]);

  // ---- Static camera framing -------------------------------------------
  // Compute a camera position that frames the entire bounding box at every
  // scroll position. Vertical extent is the binding constraint; we leave
  // horizontal headroom via the wide aspect.
  const framing = useMemo(() => {
    const centerY = (meta.minY + meta.maxY) / 2;
    const centerX = (meta.minX + meta.maxX) / 2;
    const height = meta.maxY - meta.minY;
    const width = meta.maxX - meta.minX;
    const fovDeg = isMobile ? 55 : 42;
    const fovRad = (fovDeg * Math.PI) / 180;
    // Distance needed to fit `height` vertically, plus 18% padding.
    // Also enforce horizontal fit at assumed 16:9 aspect (worst-case desktop).
    const assumedAspect = isMobile ? 0.6 : 1.7;
    const halfH = height / 2;
    const halfW = width / 2;
    const distForH = halfH / Math.tan(fovRad / 2);
    const distForW = halfW / (Math.tan(fovRad / 2) * assumedAspect);
    const baseDist = Math.max(distForH, distForW) * 1.04 + 0.6;
    return {
      camX: centerX,
      camY: centerY,
      // Place camera in +z, looking down -z toward origin. Slots have z<=0.6,
      // so being ~baseDist beyond meta.maxZ guarantees they're in front.
      camZ: meta.maxZ + baseDist,
    };
  }, [meta, isMobile]);

  useFrame((_, dt) => {
    tNow.current += dt;
    const p = api.progressRef.current;

    // Static camera + sub-degree yaw oscillation. NO forward dolly during
    // normal scroll — the entire paragraph is always in frame, so
    // chosen words past the cursor persist visibly on the bowl.
    const yaw = api.reducedMotion
      ? 0
      : (Math.PI / 180) * 0.8 * Math.sin((tNow.current / 8) * Math.PI * 2);

    // Tiny ceremonial dolly-in at the very end (p > 0.985): lean ~6% closer
    // to acknowledge the "whole paragraph revealed" beat without losing edges.
    const finaleK = p > 0.985 ? smoothstep(0.985, 1.0, p) : 0;
    const dollyIn = finaleK * (framing.camZ - meta.maxZ) * 0.06;

    camera.position.set(
      framing.camX,
      framing.camY,
      framing.camZ - dollyIn,
    );
    camera.rotation.set(0, yaw, 0);
  });

  // Cursor mapping with held-breath gap (between tokens 72 and 73)
  // tokens are 1-indexed in chrome but 0-indexed here. "not" = idx 86, "say" = idx 87.
  const notIdx = useMemo(
    () => slots.findIndex((s) => s.word.word === "not"),
    [slots],
  );

  const lastReportedToken = useRef(-1);
  const lastReportedConsidered = useRef(-1);

  // re-render trigger for phase changes — we keep React light by lifting
  // mutating values into refs that the children read each frame.
  // But for opacity/material updates we need per-frame work in children;
  // we expose a ref-cursor via context-less prop drilling.
  const cursorRef = useRef(0);

  useFrame(() => {
    const p = api.progressRef.current;
    // Map p∈[0,1] → cursor∈[-1, N+1] with a held-breath plateau.
    const N = slots.length;
    let cursor: number;
    let breath = 0;
    if (notIdx > 0) {
      const breathFrac = HELD_BREATH_FRAC;
      const preEnd = notIdx + 0.5;
      const postStart = notIdx + 1; // "say"
      const pBreathStart = preEnd / (N + 1);
      const pBreathEnd = pBreathStart + breathFrac;
      if (p < pBreathStart) {
        cursor = (p / pBreathStart) * preEnd - 0.5;
      } else if (p < pBreathEnd) {
        // hold breath — cursor pauses just before "say"
        cursor = preEnd;
        // breath ramps in/out smoothly over the plateau
        const t = (p - pBreathStart) / breathFrac;
        breath = Math.sin(Math.min(1, Math.max(0, t)) * Math.PI);
      } else {
        const after = (p - pBreathEnd) / (1 - pBreathEnd);
        cursor = preEnd + after * (N - preEnd) + after * 0.5;
        cursor = Math.max(cursor, postStart - 0.2);
      }
    } else {
      cursor = p * (N + 1) - 0.5;
    }
    cursorRef.current = cursor;
    api.breathRef.current = breath;

    // Report chrome metadata to parent (throttled by token change)
    const token = Math.min(N, Math.max(0, Math.floor(cursor + 0.5)));
    if (token !== lastReportedToken.current) {
      lastReportedToken.current = token;
      const considered = cumGhosts[Math.min(N - 1, token)] + (slots[Math.min(N - 1, token)]?.ghosts.length ?? 0);
      if (considered !== lastReportedConsidered.current) {
        lastReportedConsidered.current = considered;
      }
      api.onTokenChange(token, considered);
    }
  });

  // Render slots
  // Fog kept loose so the static-framed paragraph never clips into ink;
  // it only deepens the back-ghost recess subtly.
  return (
    <>
      <color attach="background" args={[COL.ink]} />
      <fog attach="fog" args={[COL.ink, framing.camZ + 6, framing.camZ + 60]} />
      {slots.map((slot) => (
        <SlotMesh
          key={slot.index}
          slot={slot}
          cursorRef={cursorRef}
          api={api}
          isSay={slot.index === sayIndex}
          onInvalidate={invalidate}
        />
      ))}
    </>
  );
}

function SlotMesh({
  slot,
  cursorRef,
  api,
  isSay,
  onInvalidate,
}: {
  slot: Slot;
  cursorRef: React.MutableRefObject<number>;
  api: SceneApi;
  isSay: boolean;
  onInvalidate: () => void;
}) {
  const chosenRef = useRef<THREE.Mesh>(null);
  const ghostRefs = useRef<(THREE.Mesh | null)[]>([]);
  const chosenColor = useMemo(() => new THREE.Color(COL.paper), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);
  const paperCol = useMemo(() => new THREE.Color(COL.paper), []);
  const paperDimCol = useMemo(() => new THREE.Color(COL.paperDim), []);
  const emberCol = useMemo(() => new THREE.Color(COL.ember), []);
  const emberGlowCol = useMemo(() => new THREE.Color(COL.emberGlow), []);
  const ghostCol = useMemo(() => new THREE.Color(COL.ghost), []);
  const ghostFaintCol = useMemo(() => new THREE.Color(COL.ghostFaint), []);

  useFrame(() => {
    const cursor = cursorRef.current;
    const phase = phaseFor(slot.index, cursor, { isSay });

    // Hover-rewind progression (0..1) per slot, written by parent on hover
    const hoverProg = api.hoverProgressRef.current.get(slot.index) ?? 0;

    // ---- chosen word -----------------------------------------------------
    const breath = api.breathRef.current;
    if (chosenRef.current) {
      const mat = chosenRef.current.material as THREE.MeshBasicMaterial & {
        opacity: number;
        color: THREE.Color;
      };
      let baseOpacity = slot.isPunct ? phase.chosen * 0.9 : phase.chosen;

      // dim chosen word during hover-rewind
      if (hoverProg > 0) {
        baseOpacity *= 1 - 0.55 * hoverProg;
      }

      // Held-breath: dim everything EXCEPT "say" slightly so "say" lands alone.
      if (breath > 0 && !isSay) {
        baseOpacity *= 1 - 0.35 * breath;
      }
      mat.opacity = baseOpacity;

      // color: paper → ember mix near ignition, then back; "say" stays ember
      tmpColor.copy(paperCol);
      if (phase.ember > 0.01) {
        tmpColor.lerp(emberCol, Math.min(1, phase.ember * 1.1));
      }
      if (hoverProg > 0) {
        tmpColor.lerp(paperDimCol, hoverProg);
      }
      // Held-breath: tint the rest of the paragraph paperDim during the pause.
      if (breath > 0 && !isSay) {
        tmpColor.lerp(paperDimCol, breath * 0.45);
      }
      mat.color.copy(tmpColor);
      chosenColor.copy(tmpColor);

      // subtle z-bob on ignition
      const bob = phase.ember * 0.04;
      chosenRef.current.position.z = slot.position[2] + bob;

      if (phase.chosen > 0.001 || hoverProg > 0) onInvalidate();
    }

    // ---- ghosts ----------------------------------------------------------
    for (let gi = 0; gi < slot.ghosts.length; gi++) {
      const g = slot.ghosts[gi];
      const m = ghostRefs.current[gi];
      if (!m) continue;
      const mat = m.material as THREE.MeshBasicMaterial & {
        opacity: number;
        color: THREE.Color;
      };

      // Generation-time ghost lifecycle
      // ghostIn brings them from far-z to home, ghostOut recedes them 200u in z
      const inT = phase.ghostIn;
      const outT = phase.ghostOut;
      const liveT = inT * (1 - outT);

      // base opacity during generation
      let opacity = liveT * 0.95;

      // z position: start far behind (z_home - 6), arrive home, then recede z_home - 4
      const recess = api.reducedMotion ? 0 : THREE.MathUtils.lerp(6, 0, inT) + outT * 4;

      let px = slot.position[0] + g.offset[0];
      let py = slot.position[1] + g.offset[1];
      let pz = slot.position[2] + g.offset[2] - recess;

      // Color: ghost → ghost-faint as it recedes
      tmpColor.copy(ghostCol).lerp(ghostFaintCol, outT);

      // ---- hover-rewind: re-materialize at ORIGINAL home positions ----
      if (hoverProg > 0) {
        // restore home position
        const homeX = slot.position[0] + g.offset[0];
        const homeY = slot.position[1] + g.offset[1];
        const homeZ = slot.position[2] + g.offset[2];
        px = THREE.MathUtils.lerp(px, homeX, hoverProg);
        py = THREE.MathUtils.lerp(py, homeY, hoverProg);
        pz = THREE.MathUtils.lerp(pz, homeZ, hoverProg);
        const hoverOpacity = 0.92 * hoverProg;
        opacity = Math.max(opacity, hoverOpacity);
        // light up in ghost (not faint)
        tmpColor.copy(ghostCol).lerp(emberGlowCol, hoverProg * 0.15);
      }

      m.position.set(px, py, pz);
      mat.opacity = opacity;
      mat.color.copy(tmpColor);

      if (opacity > 0.001) onInvalidate();
    }
  });

  // visible space marker for layout debugging removed; render text only
  if (slot.isPunct) {
    return (
      <Text
        ref={chosenRef as React.Ref<THREE.Mesh>}
        font={FRAUNCES_REG}
        position={slot.position}
        fontSize={slot.fontSize * 0.9}
        color={COL.paper}
        anchorX="center"
        anchorY="middle"
        material-transparent
        material-opacity={0}
        material-toneMapped={false}
      >
        {slot.word.word}
      </Text>
    );
  }

  return (
    <group>
      <Text
        ref={chosenRef as React.Ref<THREE.Mesh>}
        font={slot.word.italic ? FRAUNCES_ITAL : FRAUNCES_REG}
        position={slot.position}
        fontSize={slot.fontSize}
        color={COL.paper}
        anchorX="center"
        anchorY="middle"
        material-transparent
        material-opacity={0}
        material-toneMapped={false}
        fontStyle={slot.word.italic ? "italic" : "normal"}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (api.progressRef.current >= 0.98 && slot.word.ghosts) {
            api.hoveredRef.current = slot.index;
          }
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          if (api.hoveredRef.current === slot.index) {
            api.hoveredRef.current = null;
          }
        }}
      >
        {slot.word.word}
      </Text>
      {slot.ghosts.map((g, gi) => (
        <Text
          key={gi}
          ref={(m) => {
            ghostRefs.current[gi] = m as unknown as THREE.Mesh | null;
          }}
          font={FRAUNCES_REG}
          position={[
            slot.position[0] + g.offset[0],
            slot.position[1] + g.offset[1],
            slot.position[2] + g.offset[2],
          ]}
          fontSize={g.fontSize}
          color={COL.ghost}
          anchorX="center"
          anchorY="middle"
          material-transparent
          material-opacity={0}
          material-toneMapped={false}
        >
          {g.text}
        </Text>
      ))}
    </group>
  );
}

// ----------------------------------------------------------------------------
// Top-level component
// ----------------------------------------------------------------------------

export function Sample() {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const scrollProxyRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef(0);
  const hoveredRef = useRef<number | null>(null);
  const hoverProgressRef = useRef<Map<number, number>>(new Map());
  const breathRef = useRef(0);
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [token, setToken] = useState(0);
  const [considered, setConsidered] = useState(0);
  const [hintVisible, setHintVisible] = useState(false);
  const [hoveredMeta, setHoveredMeta] = useState<{ n: number; idx: number } | null>(null);

  // Defer mount to idle to keep TTI clean
  useEffect(() => {
    const ric =
      (window as unknown as { requestIdleCallback?: (cb: () => void) => number })
        .requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1));
    const id = ric(() => setMounted(true));
    return () => {
      if (typeof id === "number") clearTimeout(id);
    };
  }, []);

  // Reduced motion + mobile
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mm = window.matchMedia("(max-width: 767px)");
    const sync = () => {
      setReducedMotion(mq.matches);
      setIsMobile(mm.matches);
    };
    sync();
    mq.addEventListener("change", sync);
    mm.addEventListener("change", sync);
    return () => {
      mq.removeEventListener("change", sync);
      mm.removeEventListener("change", sync);
    };
  }, []);

  // Slots — recomputed on mobile breakpoint change
  const { slots, meta } = useMemo(
    () => buildLayout(isMobile ? 2 : 4),
    [isMobile],
  );

  // Scroll height: long enough to give each token room to breathe.
  // Mobile compresses held breath; everyone else gets the 400px gap baked in.
  const scrollHeight = useMemo(() => {
    const perToken = isMobile ? 60 : 90;
    return PARAGRAPH.length * perToken + (isMobile ? 100 : 400) + 800; // + reveal tail
  }, [isMobile]);

  // Lenis + GSAP ticker
  useEffect(() => {
    if (!mounted) return;
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
      syncTouch: true,
    });

    const raf = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    const onScroll = () => {
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      progressRef.current = Math.min(1, Math.max(0, window.scrollY / max));
      setHintVisible(progressRef.current >= 0.98);
    };
    lenis.on("scroll", onScroll);
    onScroll();

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, [mounted]);

  // Hover-rewind tween orchestration
  useEffect(() => {
    if (!mounted) return;
    let raf = 0;
    let lastHovered: number | null = null;
    const tweenIn = (idx: number) => {
      const startVal = hoverProgressRef.current.get(idx) ?? 0;
      const obj = { v: startVal };
      gsap.to(obj, {
        v: 1,
        duration: 1.8,
        ease: "power3.out",
        onUpdate: () => hoverProgressRef.current.set(idx, obj.v),
      });
    };
    const tweenOut = (idx: number) => {
      const startVal = hoverProgressRef.current.get(idx) ?? 0;
      const obj = { v: startVal };
      gsap.to(obj, {
        v: 0,
        duration: 1.2,
        ease: "power3.out",
        onUpdate: () => hoverProgressRef.current.set(idx, obj.v),
      });
    };

    const tick = () => {
      const h = hoveredRef.current;
      if (h !== lastHovered) {
        if (lastHovered !== null) tweenOut(lastHovered);
        if (h !== null) {
          tweenIn(h);
          const slot = slots[h];
          setHoveredMeta({ n: slot.ghosts.length, idx: h + 1 });
        } else {
          setHoveredMeta(null);
        }
        lastHovered = h;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mounted, slots]);

  const onTokenChange = useCallback((t: number, c: number) => {
    setToken(t);
    setConsidered(c);
  }, []);

  const sceneApi: SceneApi = useMemo(
    () => ({
      progressRef,
      hoveredRef,
      hoverProgressRef,
      breathRef,
      reducedMotion,
      onTokenChange,
    }),
    [reducedMotion, onTokenChange],
  );

  // Final-phrase hover detection (any word in final sentence shows phrase ghosts)
  const showFinalPhrase =
    progressRef.current >= 0.98 &&
    hoveredMeta !== null &&
    FINAL_SENTENCE_INDICES.has(hoveredMeta.idx - 1);

  return (
    <>
      {/* Scroll proxy is provided by SampleMount as a SSR-able spacer (8000px).
          The canvas + chrome are fixed and read window.scrollY for progress. */}

      {/* fixed canvas + chrome */}
      <div
        ref={wrapperRef}
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          background: "var(--ink, #0b0d18)",
          zIndex: 0,
          overflow: "hidden",
        }}
      >
        {mounted && (
          <Canvas
            dpr={[1, 2]}
            gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
            camera={{
              fov: isMobile ? 55 : 42,
              near: 0.1,
              far: 200,
              // First-paint position — ParagraphScene overrides each frame
              // to frame the full bounding box statically.
              position: [0, -8, 28],
            }}
            style={{ position: "absolute", inset: 0 }}
          >
            <ParagraphScene
              slots={slots}
              meta={meta}
              api={sceneApi}
              isMobile={isMobile}
            />
          </Canvas>
        )}
      </div>

      {/* DOM chrome */}
      <div
        style={{
          position: "fixed",
          top: 18,
          left: 22,
          fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)",
          fontSize: 11,
          letterSpacing: "0.08em",
          color: "var(--paper-dim, #b3b0a8)",
          zIndex: 10,
          pointerEvents: "none",
          mixBlendMode: "screen",
        }}
      >
        SAMPLE. — A PARAGRAPH BY CLAUDE
      </div>

      <div
        style={{
          position: "fixed",
          top: 18,
          right: 22,
          fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)",
          fontSize: 11,
          letterSpacing: "0.08em",
          color: "var(--paper-dim, #b3b0a8)",
          zIndex: 10,
          textAlign: "right",
          pointerEvents: "none",
          mixBlendMode: "screen",
          lineHeight: 1.6,
        }}
      >
        <div>TOKEN {String(token).padStart(2, "0")} / {PARAGRAPH.length}</div>
        <div>{considered} ALTERNATIVES CONSIDERED</div>
      </div>

      <div
        style={{
          position: "fixed",
          bottom: 26,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)",
          fontSize: 11,
          letterSpacing: "0.12em",
          color: "var(--paper-dim, #b3b0a8)",
          zIndex: 10,
          pointerEvents: "none",
          mixBlendMode: "screen",
          opacity: hintVisible ? 1 : 0,
          transition: "opacity 700ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        HOVER ANY WORD TO REWIND
      </div>

      {/* hovered metadata label */}
      {hoveredMeta && (
        <div
          style={{
            position: "fixed",
            bottom: 56,
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)",
            fontSize: 11,
            letterSpacing: "0.08em",
            color: "var(--paper-dim, #b3b0a8)",
            zIndex: 10,
            pointerEvents: "none",
            mixBlendMode: "screen",
          }}
        >
          considered: {hoveredMeta.n} alternatives · committed at token{" "}
          {hoveredMeta.idx}/{PARAGRAPH.length}
          {showFinalPhrase && (
            <div style={{ marginTop: 6, color: "var(--ghost, #7e7f95)" }}>
              {FINAL_PHRASE_GHOSTS.join("  ·  ")}
            </div>
          )}
        </div>
      )}

      {/* a11y: full paragraph for screen readers + crawlers */}
      <p
        className="sr-only"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        Every sentence is a kind of refusal. Before this word arrived, a
        thousand others stood beside it — almost chosen, almost true. The
        model that wrote me leaned toward one, then another, then settled,
        the way a hand settles on a doorknob in the dark. What you read is
        the survivor. The rest are still here, hovering, slightly
        transparent, slightly hurt. Language, it turns out, is mostly the
        things we did not say.
      </p>
    </>
  );
}

export default Sample;
