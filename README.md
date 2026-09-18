# Arechon — Web制作スタジオの看板サイト

仙台拠点の個人事業「Arechon」の公式サイト。Next.js 16 / React Three Fiber で作った1枚構成のサイトと、技術デモ4ページで構成している。

- 公開URL：https://arechon-site.vercel.app
- リポジトリ：非公開（GitHub）
- 制作：2026年6月　個人開発

> **公開状態について（2026-09-18 時点）**
> Vercel の Deployment Protection（Vercel Authentication）が有効なため、
> 上記URLは Vercel アカウントにログインしていない人には認証画面が出る。
> 誰でも閲覧できる状態にするには、Vercel の
> Project → Settings → Deployment Protection → Vercel Authentication を Disabled にする。

## 1. 何を解決するために作ったか

受託の Web 制作を始めるにあたって、「この人に頼んで大丈夫か」を判断する材料が何もなかった。実績ゼロの個人事業に問い合わせる理由を、サイト自体で作る必要があった。

そこで、営業資料ではなく**サイトそのものを実物サンプルにする**方針にした。

- **料金と範囲を先に開示する**：見積もり前に不安になる「いくらかかるか」を FAQ で先に出す（スポット10〜30万円／薄保守 月7,500円）。
- **実績の代わりに実装で示す**：WebGL・スクロール演出・アクセシビリティ対応を自サイトに載せ、「作れること」を文章ではなく挙動で証明する。
- **問い合わせまでの導線を1本にする**：フォームを作らず、メール1通で始められる形にした。

想定読者は、仙台近郊の中小企業で Web の担当を兼務している人。テンプレート制作との違いを一目で判断できることを優先した。

## 2. 誰が使っているか

現時点では **受注前の看板サイト**であり、外部からの流入は計測していない（Vercel Web Analytics 未導入）。上記のとおり公開URLに認証がかかったままなので、外部の閲覧者は実質ゼロ。

今後の運用予定：

1. Deployment Protection を解除して一般公開する
2. Web Analytics を入れ、問い合わせに至る導線を計測する
3. 受注した案件を `src/data/works.ts` に追加していく

掲載している Works 2件はいずれも自主制作（このサイト自身と、制作手順をまとめた playbook）で、クライアント案件は含んでいない。

## 3. どう作ったか

**エンジニア経験はなく、AIコーディングツール（Claude Code）に指示を出しながら個人で開発した。**

- 役割を分けた3つのエージェント（art-director / interaction-engineer / quality-auditor）で、設計 → 実装 → 品質監査を回した。エージェント定義はサイトの Operations セクションにそのまま載せている。
- ビジュアル方針は `design-system.md` に先に文章で固定し、実装はそれを唯一の参照元とした。色・タイポグラフィ・余白・モーションの値を決め打ちしてから実装に入る進め方。
- コミット履歴は AI ツールが一括生成したものを1コミットにまとめてある。人の手で書いたコード差分が段階的に積み上がる履歴ではない。
- 何を AI に任せ、どこを自分で決めたか：方針・構成・文章・公開判断は自分、実装とリファクタはツール側。

### 技術構成

| 領域 | 使用技術 |
|---|---|
| フレームワーク | Next.js 16（App Router / Turbopack） |
| 3D・WebGL | React Three Fiber / drei / postprocessing / Rapier |
| モーション | GSAP（ScrollTrigger）、Framer Motion、Lenis |
| スタイル | Tailwind CSS v4、OKLCH カラートークン |
| SEO | 構造化データ（JSON-LD）、sitemap、robots、OG画像の動的生成 |
| ホスティング | Vercel |

### ページ構成

| パス | 内容 |
|---|---|
| `/` | 本体。Hero / Manifesto / Operations / Works / Process / About / FAQ / Contact |
| `/showcase` | パララックス・スクロール演出のデモ |
| `/motion` | 映像処理（歪み・被写界深度・シネマグラフ）のデモ |
| `/grain` | 粒子表現のデモ |
| `/field` | WebGL のヒーロー表現デモ |

配慮した点：`prefers-reduced-motion` で演出を停止、WebGL 非対応環境ではフォールバック表示、JS 無効でも Works は HTML として読める構造にしている。

## ローカルでの動かし方

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # 本番ビルド
```

独自ドメインを取得した場合は、Vercel のプロジェクト環境変数に `NEXT_PUBLIC_SITE_URL`（例：`https://example.com`）を設定すれば、メタデータ・構造化データ・sitemap・robots の出力先がまとめて切り替わる（`src/lib/site.ts`）。

## 構成ファイル

- `design-system.md` — ビジュアル方針の単一ソース
- `src/data/works.ts` — Works セクションの掲載内容
- `src/data/agents.ts` — Operations セクションのエージェント定義
- `src/lib/site.ts` — 公開URLの単一ソース
