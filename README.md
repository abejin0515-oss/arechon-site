# Arechon — Claude Code で作ったポートフォリオ

AI コーディングツール（Claude Code）に指示を出して個人で作った Web サイト。
サイト本体1ページと、技術デモ4ページで構成している。

- 公開URL：https://arechon-site.vercel.app
- 制作：2026年6月

> **公開状態（2026-09-18 時点）**
> Vercel の Deployment Protection（Vercel Authentication）が有効なため、
> 上記URLは Vercel アカウントにログインしていない人には認証画面が出る。
> 誰でも閲覧できる状態にするには、Vercel の
> Project → Settings → Deployment Protection → Vercel Authentication を Disabled にする。

## 1. 何を証明するために作ったか

エンジニア経験はない。それでも、AI コーディングツールに何をどう指示すれば、
公開できる水準の Web サイトが出てくるのか——その進め方を示すために作った。

証明したいのは技術力ではなく、**AI に対する指示と検証の設計**のほう。
そのため、サイトには次の3つを載せている。

- **Operations** — このサイトを作った3つのエージェント（art-director / interaction-engineer / quality-auditor）の役割と、それぞれが返す成果物。
- **Process** — Direct（言葉で固定する）→ Generate（実装させる）→ Audit（監査で落とす）→ Ship（公開する）の4工程。
- **FAQ** — どこまでを AI が作ったか、コミット履歴がどうなっているか、品質をどう担保しているかを、聞かれる前に書いた。

見栄えのする演出を並べただけのサイトにはしない。何をどう判断したかが読み取れることを優先している。

## 2. 誰が使っているか

**まだ誰も使っていない。** 上記のとおり公開URLに認証がかかったままで、外部からの閲覧者は実質ゼロ。
Vercel Web Analytics も未導入なので、流入は計測していない。

想定している読み手は、採用や依頼の判断のためにこのサイトを開く人。
数字で語れる段階ではないので、現物と手順を置いてある。

## 3. どう作ったか

- 役割を分けた3つのエージェントで、設計 → 実装 → 品質監査を回した。エージェント定義は `src/data/agents.ts`、サイトの Operations セクションにそのまま表示している。
- ビジュアル方針は `design-system.md` に先に文章で固定し、実装はそれを唯一の参照元とした。色・タイポグラフィ・余白・モーションの値を決め打ちしてから実装に入る進め方。
- **コミット履歴は AI ツールが一括生成したものを1コミットにまとめてある。** 人の手で段階的に積み上げた履歴ではない。
- 自分が決めたのは、何を作るか／どの表現を採用するか／掲載する文章／公開してよいかの判断。実装とリファクタはツール側。

### 掲載している制作物

| パス | 内容 |
|---|---|
| `/` | サイト本体。Hero / Manifesto / Operations / Works / Process / About / FAQ / Source |
| [archeon-proofs.vercel.app](https://archeon-proofs.vercel.app) | 画像を一枚も使わずコードだけで作った表現の実験集（別デプロイ、8点） |
| `/showcase` | 参照サイトから抽出した13の演出を、動くコンポーネントとして並べた検証ページ |
| `/motion` | 同じ流体ゆがみシェーダーを質感の違う3枚の写真に当てて比較する検証ページ |
| `/grain` | 米屋を題材にした1ページ完結のコンセプトサイト |
| `/field` | 写真も3Dモデルも使わず、カーソルで揺れる流体を生成するヒーロー表現 |

Works セクションのサムネイルは Playwright で撮った実際のレンダリング結果（`public/works/`）。
モックアップや素材画像は使っていない。

### 業種を変えて作ったデモ（12本）

受注案件ではなく、業種と技術を変えて自分で作ったデモ。店舗名・ブランド名・医院名はすべて架空。
サイトの Index セクションに一覧で載せている（別デプロイのため、サムネイルではなく外部リンク）。

3D/インタラクティブ（REVEAL・OBJET）、ブランドサイト3本（ジュエリー／スキンケア／日本茶）、
比較メディア2本（ネット回線／投資・証券）、歯科クリニック、カフェ、コーポレート（WordPress）、
パーソナルジム LP、Web アプリ（トイレ検索）。

### 技術構成

| 領域 | 使用技術 |
|---|---|
| フレームワーク | Next.js 16（App Router / Turbopack） |
| 3D・WebGL | React Three Fiber / drei / postprocessing / Rapier |
| モーション | GSAP（ScrollTrigger）、Framer Motion、Lenis |
| スタイル | Tailwind CSS v4、OKLCH カラートークン |
| SEO | 構造化データ（JSON-LD）、sitemap、robots、OG画像の動的生成 |
| ホスティング | Vercel |

配慮した点：`prefers-reduced-motion` で演出を停止、WebGL 非対応環境ではフォールバック表示、
JS が動かない状態でも Works と Process の内容が HTML として読める構造にしている。

## ローカルでの動かし方

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # 本番ビルド
```

独自ドメインを取得した場合は、Vercel のプロジェクト環境変数に
`NEXT_PUBLIC_SITE_URL`（例：`https://example.com`）を設定すれば、
メタデータ・構造化データ・sitemap・robots の出力先がまとめて切り替わる（`src/lib/site.ts`）。

## 構成ファイル

- `design-system.md` — ビジュアル方針の単一ソース
- `src/data/works.ts` — Works セクションの掲載内容
- `src/data/agents.ts` — Operations セクションのエージェント定義
- `src/lib/site.ts` — 公開URL・リポジトリURLの単一ソース
