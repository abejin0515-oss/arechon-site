import GrainExperience from "@/components/grain/GrainExperience";
import { GrainScroll } from "@/components/grain/GrainScroll";

/**
 * /grain — the one-wow, now with a second axis: TIME.
 *
 * 「同じ田の同じ一粒が、年を越すごとに新米の艶から古米の落ち着きへ
 *   材質を変えながら、形は変わらず受け継がれる」＝ 継承。
 *
 * The single magnified rice grain is the only subject and is PINNED to screen
 * centre (its Canvas is position:sticky, full-viewport) while a tall document
 * scrolls beneath it. Two time axes act on that one grain:
 *
 *   1. PROXIMITY (the signature, preserved): cursor near → 新米 (wet/glossy),
 *      far → 古米 (matte/settled). A continuous distance field, intimate, always
 *      able to override the macro clock — lean in and "that year" returns to new
 *      rice no matter how far the scroll has aged it.
 *   2. SCROLL = TIME: descending the granary advances the base aging AND moves
 *      the one lamp through a day (dawn → noon → dusk → night). Inheritance is
 *      spoken in four quiet Fraunces beats: 一粒 → 一年 → 一代 → 継承.
 *
 * Server component emits the static poster + the truth + the beats in SSR DOM,
 * so the page is correct from frame 0 with JS disabled or WebGL absent. The
 * client layers (GrainExperience canvas, GrainScroll driver) enhance on top.
 * No "操作してみて" prompt — the grain teaches by changing.
 */
export default function GrainPage() {
  return (
    <main id="grain-root" aria-label="一粒の米 — 新米と古米のあいだ">
      {/* Route-scoped Lenis smooth scroll + scroll-progress publisher (client). */}
      <GrainScroll />

      {/* The PINNED stage: poster + canvas + persistent typography. position:
          sticky keeps the single grain at screen centre for the whole scroll. */}
      <div id="grain-stage">
        {/* SSR static poster — always paints first; the graceful fallback. */}
        <div id="grain-poster" aria-hidden="true" />

        {/* Live WebGL grain (client, GPU-gated, boundary-wrapped). */}
        <GrainExperience />

        {/* Persistent typography — the truth, the house name, one mono label. */}
        <div id="grain-overlay">
          <div className="grain-toprow">
            <span className="grain-label">阿部米穀 — 一粒</span>
            <span className="grain-label">継承 / inheritance</span>
          </div>

          <div className="grain-statement">
            <h1 className="grain-truth">
              同じ田の同じ一粒が、年を越すごとに
              <em>新米の艶から古米の落ち着きへ</em>
              と材質を変えながら、形は変わらず受け継がれる。
            </h1>
            <p className="grain-sign">阿部米穀 — Abe Rice, Sendai</p>
          </div>
        </div>
      </div>

      {/* The SCROLL FLOW: four inheritance beats pass quietly over the pinned
          grain. Each is one line; scroll-trigger fades/rises them (JS-driven).
          No explanatory UI — only the inheritance, counted up by scale. */}
      <div id="grain-flow" aria-label="継承の物語">
        <section className="grain-beat" data-grain-beat>
          <p className="grain-beat-en">a single grain</p>
          <p className="grain-beat-ja">一粒。手のひらの、はじまり。</p>
        </section>

        <section className="grain-beat" data-grain-beat>
          <p className="grain-beat-en">a single year</p>
          <p className="grain-beat-ja">一年。艶が引き、落ち着きへ。</p>
        </section>

        <section className="grain-beat" data-grain-beat>
          <p className="grain-beat-en">a single lifetime</p>
          <p className="grain-beat-ja">一代。同じ田を、手が覚える。</p>
        </section>

        <section className="grain-beat grain-beat--last" data-grain-beat>
          <p className="grain-beat-en">inheritance</p>
          <p className="grain-beat-ja">継承。形は変わらず、受け継がれる。</p>
          <p className="grain-beat-sign">阿部米穀</p>
        </section>
      </div>
    </main>
  );
}
