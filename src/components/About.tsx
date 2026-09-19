import { Reveal } from "./Reveal";

const facts = [
  { k: "Base", v: "仙台 / Sendai, JP" },
  { k: "Role", v: "企画・指示設計・検証・公開" },
  { k: "Tools", v: "Claude Code / Next.js / Vercel" },
  { k: "Background", v: "エンジニア経験なし" },
];

export function About() {
  return (
    <section
      id="about"
      className="bg-[var(--surface)] py-[var(--space-24)] sm:py-[var(--space-48)]"
    >
      <div className="container-editorial grid grid-cols-12 gap-x-[var(--space-6)] sm:gap-x-[var(--space-8)]">
        <div className="col-span-12 sm:col-span-3">
          <p className="font-mono-accent text-[var(--muted)]">— About</p>
        </div>
        <div className="col-span-12 sm:col-span-9">
          <Reveal as="h2" className="font-display type-h1 max-w-[20ch] mb-12">
            エンジニア経験なしで、ここまで。
          </Reveal>
          <Reveal>
            <p className="type-body max-w-[var(--container-reading)] text-[var(--fg)]/90 mb-6">
              Arechon は仙台で一人でやっている制作プロジェクトです。
              企画・構成・文章・公開の判断は自分で決め、
              実装は AI コーディングツール（Claude Code）に任せています。
            </p>
            <p className="type-body max-w-[var(--container-reading)] text-[var(--fg)]/90 mb-6">
              AI に任せているのは、リサーチ、実装、リファクタ、品質監査。
              自分が握っているのは、何を作るか、どこで妥協しないか、いつ公開するか。
              この線引きを毎回文章にしてから、作業に入っています。
            </p>
            <p className="type-body max-w-[var(--container-reading)] text-[var(--fg)]/90 mb-12">
              このサイト自体が、その進め方で作った成果物です。
              使ったエージェント定義と設計ドキュメントはリポジトリに残してあり、
              同じ手順を別のサイトでもそのまま回せる状態にしています。
            </p>
          </Reveal>

          <Reveal>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-[var(--space-8)] gap-y-4 border-t border-[var(--border)] pt-8">
              {facts.map((f) => (
                <div
                  key={f.k}
                  className="flex items-baseline justify-between gap-4 border-b border-[var(--border)] py-3"
                >
                  <dt className="font-mono-accent text-[var(--muted)]">
                    {f.k}
                  </dt>
                  <dd className="type-small text-right">{f.v}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
