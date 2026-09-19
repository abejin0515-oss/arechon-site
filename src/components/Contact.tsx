import { Reveal } from "./Reveal";
import { REPO_URL } from "@/lib/site";

/**
 * Closing section. The proof of this portfolio is not a contact form —
 * it is the repository: the agent definitions, the design spec written
 * before implementation, and the code of this page itself.
 */
export function Contact() {
  return (
    <section
      id="source"
      className="container-editorial py-[var(--space-24)] sm:py-[var(--space-48)]"
    >
      <div className="grid grid-cols-12 gap-x-[var(--space-6)] sm:gap-x-[var(--space-8)]">
        <div className="col-span-12 sm:col-span-3">
          <p className="font-mono-accent text-[var(--muted)]">— Source</p>
        </div>
        <div className="col-span-12 sm:col-span-9">
          <Reveal as="h2" className="font-display type-display max-w-[14ch]">
            作り方は、
            <br />
            全部ここに。
          </Reveal>
          <Reveal>
            <p className="type-body max-w-[var(--container-reading)] mt-8 mb-12 text-[var(--fg)]/90">
              エージェントの定義、実装前に書いた設計ドキュメント、
              このページ自体のコード。すべて同じリポジトリに入っています。
              どう指示したかは、結果より手順のほうに残ります。
            </p>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 type-h2 font-display link-underline text-[var(--accent)]"
            >
              GitHub でソースを見る
              <span aria-hidden>↗</span>
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
