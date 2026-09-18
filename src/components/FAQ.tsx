"use client";

import { useState } from "react";
import { Reveal } from "./Reveal";

const faqs = [
  {
    q: "どこまでを AI が作りましたか？",
    a: "実装はほぼすべて Claude Code です。コンポーネント、WebGL のシーン、スクロール制御、アクセシビリティ対応のコードは指示を出して書かせています。自分が決めたのは、何を作るか、どの表現を採用するか、掲載する文章、そして公開してよいかどうかの判断です。",
  },
  {
    q: "コミット履歴はどうなっていますか？",
    a: "AI ツールが一括生成したものを 1 コミットにまとめてあります。人の手で少しずつ積み上げた履歴ではありません。隠す気はないので先に書いておきます。",
  },
  {
    q: "制作期間はどれくらいですか？",
    a: "設計ドキュメント（design-system.md）の日付が 2026-06-03、Vercel への本番デプロイが 2026-06-05 です。方針を文章で固定する工程に時間を使い、実装そのものは短時間で終わっています。",
  },
  {
    q: "AI に任せて、品質はどう担保していますか？",
    a: "品質監査エージェントの判定を通さないと公開しない、というルールにしています。指摘は P0 / P1 / P2 で返ってきて、判定は ship / hold / blocked の 3 つ。WCAG 2.2 AA、prefers-reduced-motion での停止、WebGL 非対応環境でのフォールバックまで、最初から条件に入れてあります。",
  },
  {
    q: "同じやり方を他でも再現できますか？",
    a: "手順は design-system.md とエージェント定義に固定してあるので、別のサイトでも同じ流れで回せます。属人的な勘ではなく、読み返せる文章として残すことを優先しています。",
  },
  {
    q: "ソースコードは見られますか？",
    a: "GitHub で公開しています。フッターのリンクから、この文章もサイトの実装も同じリポジトリで確認できます。",
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
            先に聞かれることに、答えておく。
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
