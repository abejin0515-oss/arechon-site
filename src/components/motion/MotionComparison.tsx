'use client';

import { useEffect, useRef, useState } from 'react';
import { DistortionTreatment, type MotionPhoto } from './treatments';

/**
 * MotionComparison — the /motion client shell.
 *
 * ONE treatment (fluid distortion), THREE editorial photos, stacked so the owner
 * can judge in one scroll which subject makes the warp read as world-class.
 * Cinematic Dark; the photo is the only color. No homepage nav/footer — this is a
 * focused comparison surface.
 *
 * Scroll velocity: a tiny Lenis instance (or native-scroll fallback) feeds a
 * 0..1 velocity into the distortion so it reacts to scrolling, not only the
 * cursor. Respects prefers-reduced-motion (no Lenis, and each scene's own
 * reduced-motion gate keeps it static via useWebGLSupport).
 */

type Section = {
  index: string;
  label: string;
  desc: string;
  photo: MotionPhoto;
};

const SECTIONS: Section[] = [
  {
    index: '01',
    label: 'INK / WATER',
    desc: '水中に拡散する墨。流体ノイズの歪みが、もともと流れている被写体と二重化して像が溶ける。',
    photo: {
      id: 'ink',
      src: '/motion/flow-ink.jpg',
      alt: '水中で拡散する黒と紫の墨。淡い緑の光を背景にした抽象的なマクロ写真。',
      // bright, abstract subject — full cinematic falloff
      vignette: 1,
    },
  },
  {
    index: '02',
    label: 'SILK / SATIN',
    desc: '一灯で起伏を彫ったサテンの襞。歪みが布の谷を滑り、生地が呼吸しているように動く。',
    photo: {
      id: 'silk',
      src: '/motion/flow-silk.jpg',
      alt: '一灯のドラマチックな光で陰影を彫られた、金褐色に光るサテン生地の襞。',
      vignette: 0.8,
    },
  },
  {
    index: '03',
    label: 'DARK FLORAL',
    desc: '黒背景に一輪のアイリス。被写体は静かなまま、周囲の闇だけが流体で揺らぎ余白が生きる。',
    photo: {
      id: 'iris',
      src: '/motion/flow-iris.jpg',
      alt: '深い黒の背景に浮かぶ一輪のアイリス。強い陰影と浅い被写界深度の編集的な写真。',
      // very dark subject on black — gentle vignette so the bloom isn't crushed
      vignette: 0.25,
    },
  },
];

export function MotionComparison() {
  const velocityRef = useRef(0);
  const [reduced, setReduced] = useState(false);

  // Lenis scroll velocity → 0..1 ref for the velocity-reactive distortion.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    if (mq.matches) return;

    let lenis: import('lenis').default | null = null;
    let tickerCb: ((t: number) => void) | null = null;
    let cancelled = false;

    // Decay velocity to rest each frame even without scroll events.
    let decayRaf = 0;
    const decay = () => {
      velocityRef.current *= 0.92;
      decayRaf = requestAnimationFrame(decay);
    };
    decayRaf = requestAnimationFrame(decay);

    (async () => {
      const [{ default: Lenis }, { gsap }] = await Promise.all([
        import('lenis'),
        import('@/lib/gsap'),
      ]);
      if (cancelled) return;
      lenis = new Lenis({ lerp: 0.1, smoothWheel: true, syncTouch: false });
      lenis.on('scroll', ({ velocity }: { velocity: number }) => {
        velocityRef.current = Math.min(1, Math.abs(velocity) / 35);
      });
      tickerCb = (t: number) => lenis?.raf(t * 1000);
      gsap.ticker.add(tickerCb);
      gsap.ticker.lagSmoothing(0);
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(decayRaf);
      if (tickerCb) {
        import('@/lib/gsap').then(({ gsap }) => {
          if (tickerCb) gsap.ticker.remove(tickerCb);
        });
      }
      lenis?.destroy();
    };
  }, []);

  return (
    <main className="motion-root">
      <header className="motion-hero">
        <p className="motion-hero__eyebrow">ONE TREATMENT · THREE PHOTOS · FLUID DISTORTION</p>
        <h1 className="motion-hero__title">
          流体で、<br />写真を歪ませる。
        </h1>
        <p className="motion-hero__lede">
          同じ流体ゆがみを、最初から高級な3枚の写真に適用する ——
          墨・サテン・一輪の花。どの被写体で、この歪みが世界基準に見えるか。
          カーソルとスクロール速度で像が溶け、止まれば元に戻る。
          {reduced && ' （動きを減らす設定が有効です。写真は静止表示されます。）'}
        </p>
      </header>

      {SECTIONS.map((s) => (
        <section
          key={s.photo.id}
          id={s.photo.id}
          className="motion-section"
          aria-labelledby={`${s.photo.id}-label`}
        >
          <div className="motion-section__head">
            <span className="motion-section__index">{s.index}</span>
            <span id={`${s.photo.id}-label`} className="motion-section__label">
              {s.label}
            </span>
            <span className="motion-section__desc">{s.desc}</span>
          </div>
          <div className="motion-section__stage">
            <DistortionTreatment photo={s.photo} velocityRef={velocityRef} />
          </div>
        </section>
      ))}

      <footer className="motion-foot">
        <span className="motion-foot__mono">
          PHOTOS — UNSPLASH LICENSE · INK: ENGIN AKYURT · SILK: SUSAN WILKINSON · FLORAL: MARCIN KRAWCZYŃSKI
        </span>
      </footer>
    </main>
  );
}
