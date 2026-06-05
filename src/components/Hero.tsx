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
              lines={["INDEPENDENT WEB STUDIO — SENDAI, JP"]}
              stagger={0}
              as="p"
            />
            <MaskReveal
              as="h1"
              ariaLabel="Arechon — 静かに、速く、確実に届ける。"
              lines={["静かに、", "速く、", "確実に届ける。"]}
              className="font-display type-display"
              delay={0.2}
            />
            <span className="sr-only" lang="en">
              Arechon, an independent web studio in Sendai, Japan.
            </span>
          </div>
          <div className="col-span-12 lg:col-span-4 lg:pt-32 mt-16 lg:mt-0">
            <p className="type-body max-w-[40ch] text-[var(--bg)]/80">
              Arechon は仙台拠点の個人事業です。
              Claude Code を本気で運用しながら、
              地方の中小企業の Web を一段引き上げる仕事をしています。
            </p>
            <div className="mt-8 flex items-center gap-4">
              <a
                href="#contact"
                data-magnetic
                className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-3 font-mono-accent text-[var(--on-accent)] transition-transform duration-[var(--dur-micro)] hover:scale-[1.02]"
              >
                相談する
                <span aria-hidden>→</span>
              </a>
              <a href="#works" className="font-mono-accent link-underline">
                実績を見る
              </a>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-x-[var(--space-6)] sm:gap-x-[var(--space-8)] mt-16">
          <div className="col-span-12 sm:col-span-4">
            <h2 className="font-mono-accent text-[var(--bg)]/80 mb-2">
              <span lang="en">01 / Strategy</span>
            </h2>
            <p className="type-small text-[var(--bg)]/85 max-w-[28ch]">
              事業の文脈から逆算する。テンプレ提案はしない。
            </p>
          </div>
          <div className="col-span-12 sm:col-span-4">
            <h2 className="font-mono-accent text-[var(--bg)]/80 mb-2">
              <span lang="en">02 / Build</span>
            </h2>
            <p className="type-small text-[var(--bg)]/85 max-w-[28ch]">
              Next.js + Tailwind v4 を素早く、正しく組む。
            </p>
          </div>
          <div className="col-span-12 sm:col-span-4">
            <h2 className="font-mono-accent text-[var(--bg)]/80 mb-2">
              <span lang="en">03 / Operate</span>
            </h2>
            <p className="type-small text-[var(--bg)]/85 max-w-[28ch]">
              月7,500円の薄保守で、ドメインから障害対応まで一括。
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
