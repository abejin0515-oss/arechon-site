"use client";

import { useState } from "react";
import { Reveal } from "./Reveal";

const faqs = [
  {
    q: "予算はいくらから相談できますか？",
    a: "10万円から請けています。スポット制作で 10〜30 万円、薄保守は月 7,500 円が標準。事業規模や納期で前後しますが、最初の見積もりは無料、1 営業日以内に返します。",
  },
  {
    q: "Claude Code を使っていることは、顧客に開示しますか？",
    a: "基本的には開示しません。受託の本体は人間が握り、AI 組織は内部の生産性レバーとして使うのが Arechon の立場です。ただし「ブランドストーリーとして開示したい」という案件では、別途相談に応じます。",
  },
  {
    q: "対応エリアはどこまでですか？",
    a: "全国対応します。直接お会いするのは東北を中心に、それ以外は Zoom + メールで完結する設計にしてあります。海外案件は英語の運用負荷の都合で慎重に判断します。",
  },
  {
    q: "既存サイトのリニューアルもできますか？",
    a: "むしろ得意です。WordPress や Wix からの脱出、Next.js への移行、SEO・パフォーマンス改善まで一括で受けます。既存資産（記事・画像・問い合わせ履歴）を残したまま土台だけ入れ替える設計を提案します。",
  },
  {
    q: "制作後の運用はどうなりますか？",
    a: "月 7,500 円の薄保守でドメイン更新、軽微な文言修正、障害一次対応を一括で引き受けます。本格的な機能追加は別途見積もり。3 ヶ月毎にアクセス解析とコピー改善の提案を出します。",
  },
  {
    q: "個人事業に任せて、引き継ぎは大丈夫ですか？",
    a: "意思決定と実装は私が責任を持ちます。納品物は標準的な Next.js コードベースとして CLI と GitHub に残るので、他の制作者へいつでも引き継ぎ可能な状態を維持しています。デザイントークン、設計判断、運用手順まで、引き継ぎ可能性そのものを納品物の一部として設計します。",
  },
];

function Item({
  q,
  a,
  i,
  open,
  onToggle,
}: {
  q: string;
  a: string;
  i: number;
  open: boolean;
  onToggle: () => void;
}) {
  const id = `faq-${i}`;
  return (
    <li className="border-b border-[var(--border)]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={id}
        className="block w-full text-left py-6 sm:py-8 grid grid-cols-12 gap-x-[var(--space-6)] items-baseline group"
      >
        <span className="col-span-1 font-mono-accent text-[var(--muted)]">
          {String(i + 1).padStart(2, "0")}
        </span>
        <span className="col-span-10 font-display type-h3 transition-transform duration-[var(--dur-standard)] group-hover:translate-x-2">
          {q}
        </span>
        <span
          className="col-span-1 font-mono-accent text-[var(--accent)] text-right transition-transform duration-[var(--dur-standard)]"
          style={{ transform: open ? "rotate(45deg)" : "rotate(0deg)" }}
          aria-hidden
        >
          ＋
        </span>
      </button>
      <div
        id={id}
        role="region"
        hidden={!open}
        className="pb-8 pl-[calc((100%/12)+var(--space-6))] pr-[calc((100%/12)+var(--space-6))]"
      >
        <p className="type-body text-[var(--fg)]/85 max-w-[var(--container-reading)]">
          {a}
        </p>
      </div>
    </li>
  );
}

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section
      id="faq"
      className="container-editorial py-[var(--space-24)] sm:py-[var(--space-48)]"
    >
      <div className="grid grid-cols-12 gap-x-[var(--space-6)] sm:gap-x-[var(--space-8)] mb-16">
        <div className="col-span-12 sm:col-span-3">
          <p className="font-mono-accent text-[var(--muted)]">— FAQ</p>
        </div>
        <div className="col-span-12 sm:col-span-9">
          <Reveal as="h2" className="font-display type-h1 max-w-[22ch]">
            よくある質問に、先に答えておく。
          </Reveal>
        </div>
      </div>

      <ul className="border-t border-[var(--border)]">
        {faqs.map((f, i) => (
          <Item
            key={f.q}
            i={i}
            q={f.q}
            a={f.a}
            open={open === i}
            onToggle={() => setOpen(open === i ? null : i)}
          />
        ))}
      </ul>
    </section>
  );
}
