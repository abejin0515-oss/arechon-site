import { HeroAtmosphereMount } from "./HeroAtmosphereMount";
import { MaskReveal } from "./Reveal";

export function Hero() {
  return (
    <section
      id="top"
      className="relative isolate min-h-svh overflow-hidden bg-[var(--fg)] text-[var(--bg)]"
    >
      {/* WebGL ambient field — sits behind everything else in the section.
          Capped at 28% opacity inside the component so the typography wins.
          Client-only, lazy-imported via HeroAtmosphereMount. */}
      <div className="absolute inset-0 z-0">
        <HeroAtmosphereMount />
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.04]"
        style={{
          background:
            "radial-gradient(60vw 60vw at 30% 70%, var(--accent), transparent 70%)",
        }}
      />

      <div className="container-editorial relative z-10 flex min-h-svh flex-col justify-between pt-32 pb-12">
        <div className="grid grid-cols-12 gap-x-[var(--space-6)] sm:gap-x-[var(--space-8)]">
          <div className="col-span-12 lg:col-span-8">
            <MaskReveal
              className="font-mono-accent text-[var(--bg)]/70 mb-8"
              lines={["PORTFOLIO — BUILT WITH CLAUDE CODE"]}
              stagger={0}
              as="p"
            />
            <MaskReveal
              as="h1"
              ariaLabel="Arechon — 作ったのは、指示の設計。"
              lines={["作ったのは、", "指示の設計。"]}
              className="font-display type-display"
              delay={0.2}
            />
            <span className="sr-only" lang="en">
              Arechon — a solo portfolio built by directing Claude Code.
            </span>
          </div>
          <div className="col-span-12 lg:col-span-4 lg:pt-32 mt-16 lg:mt-0">
            <p className="type-body max-w-[40ch] text-[var(--bg)]/80">
              このサイトは、AI コーディングツール（Claude Code）に
              指示を出して個人で作ったポートフォリオです。
              何をどう指示し、どう確かめたかを、サイト自体で公開しています。
            </p>
            <div className="mt-8 flex items-center gap-4">
              <a
                href="#operations"
                data-magnetic
                className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-3 font-mono-accent text-[var(--on-accent)] transition-transform duration-[var(--dur-micro)] hover:scale-[1.02]"
              >
                作り方を見る
                <span aria-hidden>→</span>
              </a>
              <a href="#works" className="font-mono-accent link-underline">
                制作物を見る
              </a>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-x-[var(--space-6)] sm:gap-x-[var(--space-8)] mt-16">
          <div className="col-span-12 sm:col-span-4">
            <h2 className="font-mono-accent text-[var(--bg)]/80 mb-2">
              <span lang="en">01 / Direct</span>
            </h2>
            <p className="type-small text-[var(--bg)]/85 max-w-[28ch]">
              作るものを言葉で固定してから、指示を出す。
            </p>
          </div>
          <div className="col-span-12 sm:col-span-4">
            <h2 className="font-mono-accent text-[var(--bg)]/80 mb-2">
              <span lang="en">02 / Verify</span>
            </h2>
            <p className="type-small text-[var(--bg)]/85 max-w-[28ch]">
              返ってきた出力を疑い、基準で落とす。
            </p>
          </div>
          <div className="col-span-12 sm:col-span-4">
            <h2 className="font-mono-accent text-[var(--bg)]/80 mb-2">
              <span lang="en">03 / Ship</span>
            </h2>
            <p className="type-small text-[var(--bg)]/85 max-w-[28ch]">
              動く状態で公開するまで、一人で回す。
            </p>
          </div>
        </div>
      </div>

      {/* The WebGL "wow" lives in <Works /> now. Hero stays typography-only
          to honor "ONE wow per page" — the radial accent above is the only
          ambient effect. */}
    </section>
  );
}
