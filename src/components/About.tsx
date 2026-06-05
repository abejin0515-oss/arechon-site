import { Reveal } from "./Reveal";

const facts = [
  { k: "Founded", v: "2025, Sendai" },
  { k: "Model", v: "個人事業 / Solo operator" },
  { k: "Stack", v: "Next.js / Tailwind / Claude Code" },
  { k: "Languages", v: "Japanese (native), English (working)" },
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
            個人で、深く、長く付き合う。
          </Reveal>
          <Reveal>
            <p className="type-body max-w-[var(--container-reading)] text-[var(--fg)]/90 mb-6">
              Arechon は仙台拠点の個人事業です。
              制作の意思決定から実装、運用までを一人で握り、
              判断のスピードと、約束した期日への責任を両立しています。
            </p>
            <p className="type-body max-w-[var(--container-reading)] text-[var(--fg)]/90 mb-6">
              裏側では Claude Code を本気で運用しています。
              リサーチ・コピー下書き・コードレビュー・品質監査を
              専門の AI エージェントに任せ、人間の判断にだけ集中する設計です。
              何を AI に任せ、何を自分で握るかの線引きは、いつも明確にしています。
            </p>
            <p className="type-body max-w-[var(--container-reading)] text-[var(--fg)]/90 mb-12">
              得意なのは、地方の中小企業の Web。
              テンプレで済ますのではなく、事業の文脈を聞き出し、
              検索される構造・問い合わせが来る導線・更新できる仕組みまで含めて作ります。
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
