"use client";

import { SmoothScroll } from "@/components/SmoothScroll";
import { Grain } from "@/components/Grain";
import { ScrollTrigger } from "@/lib/gsap";

// The 13 acquired techniques
import { KineticHeadline } from "@/components/techniques/KineticHeadline";
import { ParallaxImage } from "@/components/techniques/ParallaxImage";
import { ScrollWorldTransition } from "@/components/techniques/ScrollWorldTransition";
import { MagneticButton } from "@/components/techniques/MagneticButton";
import {
  LoadingSequence,
  INTRO_KEY,
} from "@/components/techniques/loading-sequence";
import {
  AtmosphereBackground,
  DistortionImageHero,
} from "@/components/techniques/webgl";
import PhysicsPlayground from "@/components/techniques/webgl/PhysicsPlayground";
import {
  SoundProvider,
  SoundDelegation,
  SoundToggle,
} from "@/components/techniques/sound";
import {
  CountUp,
  AnimatedBars,
  AnimatedLine,
  StatBlock,
} from "@/components/techniques/dataviz";

import { TechniqueSection } from "./TechniqueSection";

function replayIntro() {
  try {
    sessionStorage.removeItem(INTRO_KEY);
  } catch {
    /* ignore */
  }
  window.location.reload();
}

/* -------------------------------------------------------------------------- */
/*  Chapter heading — the four-act spine of the page. A large index + title    */
/*  that breaks the flat catalog rhythm into SCROLL / WEBGL / DATAVIZ / SOUND. */
/* -------------------------------------------------------------------------- */

function ChapterHeading({
  index,
  title,
  lede,
}: {
  index: string;
  title: string;
  lede: string;
}) {
  return (
    <header className="showcase-chapter" aria-label={`Chapter ${index} — ${title}`}>
      <span className="showcase-chapter__index font-mono-accent" aria-hidden>
        {index}
      </span>
      <h2 className="showcase-chapter__title type-h1 font-display">{title}</h2>
      <p className="showcase-chapter__lede type-body">{lede}</p>
    </header>
  );
}

// Three plain scenes for ScrollWorldTransition (it wraps each in [data-scene] itself).
const worldScenes = [
  <div key="s1" className="showcase-scene" style={{ background: "oklch(0.16 0.02 250)" }}>
    <div>
      <p className="font-mono-accent showcase-section__index">SCENE 01 / 03</p>
      <h3 className="type-h1 font-display" style={{ marginTop: "0.5rem" }}>静寂</h3>
    </div>
  </div>,
  <div key="s2" className="showcase-scene" style={{ background: "oklch(0.2 0.05 30)" }}>
    <div>
      <p className="font-mono-accent showcase-section__index">SCENE 02 / 03</p>
      <h3 className="type-h1 font-display" style={{ marginTop: "0.5rem" }}>転換</h3>
    </div>
  </div>,
  <div key="s3" className="showcase-scene" style={{ background: "oklch(0.24 0.06 250)" }}>
    <div>
      <p className="font-mono-accent showcase-section__index">SCENE 03 / 03</p>
      <h3 className="type-h1 font-display" style={{ marginTop: "0.5rem" }}>到達</h3>
    </div>
  </div>,
];

export function Showcase() {
  return (
    <div className="showcase-root">
      {/* 幕開け — one-shot curtain, session-gated. Drives the static
          #intro-curtain (SSR'd in showcase/layout.tsx) out on real load.
          On lift, recompute ScrollTriggers: the page has just reached its final
          font-loaded, fully-scrollable layout, so any triggers measured behind
          the curtain need their start/end refreshed or their reveals won't fire. */}
      <LoadingSequence
        sessionKey={INTRO_KEY}
        onComplete={() => requestAnimationFrame(() => ScrollTrigger.refresh())}
      />

      {/* WebGL atmosphere — the page's living dark background (fixed, z-index:-1) */}
      <AtmosphereBackground
        colors={["#0a0c10", "#14202e", "#1d2b3a"]}
        grain={0.03}
        speed={0.8}
      />

      <SoundProvider defaultMuted>
        <SoundDelegation />
        <SoundToggle className="showcase-soundtoggle" />
        <SmoothScroll />

        <main
          id="main"
          className="container-editorial"
          style={{ position: "relative", zIndex: 1, paddingBottom: "10rem" }}
        >
          {/* ====================================================================
              PAGE HERO — kinetic headline, char-by-char. The "。" flares accent
              once. (PHASE B ① ②)
          ==================================================================== */}
          <header className="showcase-hero">
            <p className="font-mono-accent showcase-hero__eyebrow">
              ARECHON · TECHNIQUE SHOWCASE
            </p>
            <KineticHeadline
              as="h1"
              by="char"
              stagger={0.045}
              start="top 92%"
              className="type-display font-display showcase-hero__title"
            >
              世界レベルを、ひとつずつ。
            </KineticHeadline>
            <p className="showcase-hero__lede type-body">
              Awwwards級のサイトから抽出した13の技術を、実際に動くコンポーネントとして実装。
              スクロールして、ひとつずつ体感してください。
            </p>
          </header>

          {/* ====================================================================
              HERO FEATURE — DistortionImageHero promoted to full-bleed 看板
              directly under the hero. No tag/title/desc; the visual is the
              statement. First scroll always meets it. (PHASE B ③)
          ==================================================================== */}
          <section
            id="distortion-image-hero"
            className="showcase-bleed showcase-hero-feature"
            aria-label="Distortion Image Hero — WebGL シェーダーの看板"
          >
            <DistortionImageHero
              src="/showcase/hero.svg"
              alt="WebGL シェーダーで歪むヒーロービジュアル"
              intensity={1.1}
              priority
              className="showcase-hero-feature__canvas"
              sizes="100vw"
            />
            <p className="showcase-hero-feature__cap font-mono-accent" aria-hidden>
              WEBGL · DISTORTION SHADER — ポインタ／スクロール速度で歪む
            </p>
          </section>

          {/* ====================================================================
              CHAPTER 01 — SCROLL
          ==================================================================== */}
          <ChapterHeading
            index="01"
            title="SCROLL"
            lede="スクロールを、運動と物語の駆動力にする。見出し・視差・吸着 —— 動きで意志を伝える4つの技術。"
          />

          {/* ---------- 01 · Kinetic Headline ---------- */}
          <TechniqueSection
            index="01"
            family="Scroll"
            title="Kinetic Headline"
            tag="kinetic-headlines"
            description="見出しを単語・文字に分割し、スクロールで段階的にせり上がる。Truck'N Roll の躍動。"
          >
            <KineticHeadline as="h2" by="word" className="type-h1 font-display">
              文字が、意志を持って動く。
            </KineticHeadline>
            <KineticHeadline
              as="h2"
              by="char"
              stagger={0.03}
              className="type-h2 font-display"
            >
              CHARACTER BY CHARACTER
            </KineticHeadline>
          </TechniqueSection>

          {/* ---------- 02 · Parallax Image ---------- */}
          <TechniqueSection
            index="02"
            family="Scroll"
            title="Parallax Image"
            tag="cinematic-photography"
            description="クリップマスクで開き、スクロールに対して視差で動く。シネマ的なステージング。"
            fullBleed
          >
            <ParallaxImage
              src="/showcase/parallax.svg"
              alt="グラデーションのプレースホルダー風景"
              speed={0.4}
              className="showcase-media-stage"
              sizes="100vw"
            />
          </TechniqueSection>

          {/* ---------- 04 · Magnetic Button ---------- */}
          <TechniqueSection
            index="03"
            family="Scroll"
            title="Magnetic Button"
            tag="magnetic-cursor / hover-physics"
            description="要素がカーソルに吸い付き、離れると戻る。Cuberto の微細な物理。"
          >
            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
              <MagneticButton strength={0.5} radius={60}>
                <span className="showcase-magnet" data-sound-click="click">
                  吸い付くボタン
                </span>
              </MagneticButton>
              <MagneticButton strength={0.35} radius={50}>
                <span className="showcase-magnet showcase-magnet--ghost" data-sound-click="click">
                  Ghost variant
                </span>
              </MagneticButton>
            </div>
          </TechniqueSection>

          {/* ---------- 05 · Loading Sequence ---------- */}
          <TechniqueSection
            index="04"
            family="Scroll"
            title="Loading Sequence"
            tag="loading-sequence"
            description="フォントと初回フレームの実ロード完了で幕が割れるオープニング（偽カウンターなし・上限900ms）。セッション中は一度だけ。AIR の幕開け。"
          >
            <p className="showcase-section__desc type-body" style={{ marginBottom: "1.25rem" }}>
              フレーム0から被さる静的カーテンが、実ロード完了（フォント＋初回描画、最大900ms）で
              0.7秒かけて割れます。チラ見えゼロ。セッション内は再表示されません。
              下のボタンで再生し直せます。
            </p>
            <button
              type="button"
              className="showcase-magnet showcase-magnet--ghost"
              onClick={replayIntro}
              data-sound-click="click"
            >
              ↻ もう一度再生する
            </button>
          </TechniqueSection>

          {/* ====================================================================
              INTERLUDE — Scroll World Transition as the curtain between SCROLL
              and WEBGL. A pinned, full-bleed 幕間. (PHASE B ④)
          ==================================================================== */}
          <TechniqueSection
            index="05"
            family="Scroll"
            title="Scroll World Transition"
            tag="scroll-world-transition"
            description="幕間 —— セクションをピン留めし、スクロールで場面が転換する。移動ではなく転換。Cartier の手法。"
            fullBleed
            hideHead
          >
            <ScrollWorldTransition scenes={worldScenes} />
          </TechniqueSection>

          {/* ====================================================================
              CHAPTER 02 — WEBGL
          ==================================================================== */}
          <ChapterHeading
            index="02"
            title="WEBGL"
            lede="GPU を、空気と手触りに変える。歪むヒーロー・掴める物理・漂う背景 —— ブラウザの中のリアルタイム3D。"
          />

          {/* ---------- 06 · Distortion Image Hero (detail label) ---------- */}
          <TechniqueSection
            index="06"
            family="WebGL"
            title="Distortion Image Hero Detail"
            tag="webgl-hero-onepoint"
            description="ページ先頭の看板が、まさにこれ。画像をシェーダーで歪ませ、ポインタ/スクロール速度で RGB ずれと波紋が増幅する。Lando Norris ティア。"
          >
            <p className="showcase-section__desc type-body">
              ↑ このページの冒頭、全幅で広がっていたビジュアルが Distortion Image Hero です。
              カーソルを重ねると波紋と RGB ずれが立ち上がり、止めると静止画に戻ります。
              WebGL 非対応・reduced-motion では元画像をそのまま表示します。
            </p>
          </TechniqueSection>

          {/* ---------- 07 · Physics Playground ---------- */}
          <TechniqueSection
            index="07"
            family="WebGL"
            title="Physics Playground"
            tag="physics-interaction"
            description="重力・衝突・掴んで投げる。Rapier の物理。ドラッグして遊んでください。Bruno Simon ティア。"
            fullBleed
          >
            <PhysicsPlayground
              count={18}
              shape="rounded-box"
              colors={["#c9c4ba", "#a7a092", "#8d8576", "#cf9f6f"]}
              ariaLabel="物理演算で落下・衝突する立体のインタラクティブな箱"
              className="showcase-stage showcase-physics-stage"
              style={{ height: "min(78vh, 640px)" }}
            />
          </TechniqueSection>

          {/* ---------- 08 · Atmosphere Background (label only) ---------- */}
          <TechniqueSection
            index="08"
            family="WebGL"
            title="Atmosphere Background"
            tag="minimal-webgl-atmosphere"
            description="このページ全体の背景が、まさにそれ。WebGL でゆっくり漂う質感を、見せびらかさず空気として。AIR の静かな高級。"
          >
            <div className="showcase-stage" style={{ padding: "2.5rem" }}>
              <p className="type-body" style={{ color: "var(--muted)" }}>
                ↑ 背後でゆっくり動いているグラデーションが Atmosphere Background です。
                オフスクリーン/タブ非表示で GPU は 0ms に停止し、WebGL 非対応・reduced-motion では
                静的な CSS グラデーションにフォールバックします。
              </p>
            </div>
          </TechniqueSection>

          {/* ====================================================================
              CHAPTER 03 — DATAVIZ
          ==================================================================== */}
          <ChapterHeading
            index="03"
            title="DATAVIZ"
            lede="冷たい数字を、温度のある一節に変える。カウントアップ・バー・ライン —— チャートライブラリ不使用。"
          />

          {/* ---------- 10 · CountUp + StatBlock ---------- */}
          <TechniqueSection
            index="09"
            family="DataViz"
            title="CountUp · StatBlock"
            tag="humanized-data-viz"
            description="冷たい数字を、スクロールで温かく立ち上げる。数字が物語の一節になる。Cleo の手法。"
          >
            <div className="showcase-stats">
              <StatBlock
                label="累計制作"
                narrative="世界レベルを目指した案件。"
                number={{ value: 128, suffix: "件" }}
              />
              {/* The one accent number — リピート率94%. The single most important
                  figure, lit in accent. (PHASE B ⑤) */}
              <StatBlock
                className="showcase-stat--accent"
                label="リピート率"
                narrative="一度依頼した顧客が戻る割合。"
                number={{ value: 94, suffix: "%" }}
              />
              <div>
                <p className="font-mono-accent" style={{ color: "var(--muted)" }}>
                  PROJECT VALUE
                </p>
                <p className="type-display font-display">
                  <CountUp value={1240000} prefix="¥" duration={2.4} />
                </p>
              </div>
            </div>
          </TechniqueSection>

          {/* ---------- 11 · Animated Bars ---------- */}
          <TechniqueSection
            index="10"
            family="DataViz"
            title="Animated Bars"
            tag="humanized-data-viz"
            description="バーがゼロから順に伸び上がる。SVG + Framer のみ、チャートライブラリ不使用。"
          >
            <div className="showcase-stage" style={{ padding: "2.5rem" }}>
              <AnimatedBars
                data={[
                  { label: "Design", value: 92 },
                  { label: "Motion", value: 88 },
                  { label: "Perf", value: 96 },
                  { label: "A11y", value: 90 },
                ]}
                accentVar="--accent"
                valueSuffix="%"
              />
            </div>
          </TechniqueSection>

          {/* ---------- 12 · Animated Line ---------- */}
          <TechniqueSection
            index="11"
            family="DataViz"
            title="Animated Line"
            tag="humanized-data-viz"
            description="パスが描かれ、ドットが線上を旅する。stroke-dashoffset の描画アニメ。"
          >
            <div className="showcase-stage" style={{ padding: "2.5rem" }}>
              <AnimatedLine
                points={[
                  { x: 0, y: 12, label: "1月" },
                  { x: 1, y: 30, label: "2月" },
                  { x: 2, y: 24, label: "3月" },
                  { x: 3, y: 52, label: "4月" },
                  { x: 4, y: 46, label: "5月" },
                  { x: 5, y: 78, label: "6月" },
                ]}
                color="var(--accent)"
                area
                travelDot
                style={{ height: 260 }}
              />
            </div>
          </TechniqueSection>

          {/* ====================================================================
              CHAPTER 04 — SOUND
          ==================================================================== */}
          <ChapterHeading
            index="04"
            title="SOUND"
            lede="体験に、聴覚の余白を足す。ホバー音・クリック音を最初の操作で解錠する、控えめな差別化。"
          />

          {/* ---------- 09 · Sound Design ---------- */}
          <TechniqueSection
            index="12"
            family="Sound"
            title="Sound Design"
            tag="sound-design"
            description="ホバー音・クリック音を体験に組み込む。Cartier の差別化。右上のトグルでオン/オフ（設定は記憶されます）。"
          >
            <p className="showcase-section__desc type-body" style={{ marginBottom: "1.25rem" }}>
              自動再生はせず、最初の操作で解錠。reduced-motion では既定でミュート。
              下の要素は <code>data-sound</code> 配線済みです（実際の音源ファイルは未配置のため現状は無音 ＝ 次のコンテンツ作業）。
            </p>
            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "center" }}>
              <span
                className="showcase-magnet showcase-magnet--ghost"
                data-sound="hover"
                data-sound-click="click"
              >
                ホバー＆クリックで鳴る要素
              </span>
              <SoundToggle />
            </div>
          </TechniqueSection>

          {/* ---------- Footer note ---------- */}
          <footer style={{ marginTop: "6rem", color: "var(--muted)" }}>
            <p className="font-mono-accent">
              13 / 13 ACQUIRED · webgl-game-world のみ概念止まり（eye-training）
            </p>
            <p className="type-small" style={{ marginTop: "0.75rem" }}>
              全コンポーネントは prefers-reduced-motion フォールバック・モバイル劣化・dispose 済み。
            </p>
          </footer>
        </main>
      </SoundProvider>

      {/* Film grain, above everything, pointer-events none */}
      <Grain />
    </div>
  );
}
