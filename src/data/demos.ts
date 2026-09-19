export type Demo = {
  category: string;
  title: string;
  summary: string;
  stack: string[];
  href: string;
};

/**
 * Self-initiated demos, built to cover a range of industries and stacks.
 * None of them are client work: the shops, clinics and brands in them are
 * invented. That framing is not decoration — it is the difference between
 * a portfolio and a false claim, so the section header states it too.
 *
 * They deploy separately and their source is not in this repo, so each
 * entry is a link. No thumbnails: the deployments sit behind Vercel
 * Authentication, so a screenshot could not be taken honestly.
 */
export const demos: Demo[] = [
  {
    category: "3D / Interactive",
    title: "REVEAL — 時計機構の分解ツアー",
    summary:
      "機械式時計のムーブメントをコードで生成し、縦スクロールを映写機のハンドルに見立てた三幕構成のツアー。部品が放射状にはけて主役にカメラが寄る。",
    stack: ["Next.js", "React Three Fiber", "Three.js"],
    href: "https://archeon-lab.vercel.app/reveal",
  },
  {
    category: "3D / Interactive",
    title: "OBJET — 自前物理の3D",
    summary:
      "ガラス・金属・粘土のオブジェを掴んで放れるプレイグラウンド。物理エンジンを使わず、速度積分・反発・相互衝突・投擲を自分で実装した。",
    stack: ["React Three Fiber", "Three.js", "TypeScript"],
    href: "https://archeon-lab.vercel.app/objet",
  },
  {
    category: "ブランドサイト",
    title: "高級ジュエリーブランド",
    summary:
      "「光を、纏う。」をコンセプトにしたダーク・シネマティックな1ページ。大型セリフのキネティックタイポ、金の光スイープ、慣性スクロール。",
    stack: ["Next.js", "GSAP", "Lenis"],
    href: "https://aurum-demo-liart.vercel.app",
  },
  {
    category: "ブランドサイト",
    title: "高級スキンケアブランド",
    summary:
      "月光をテーマに、明朝の縦組みと余白で上質感を作る。JS 無効でも本文が読め、薬機法の効能効果の範囲に配慮した表現にしてある。",
    stack: ["Next.js", "React", "TypeScript"],
    href: "https://cosmetics-demo-gamma.vercel.app",
  },
  {
    category: "ブランドサイト",
    title: "高級日本茶ブランド",
    summary:
      "和の高級感を、明朝タイポ・縦組み見出し・余白で表現。全セクションに写真を置き、スクロール演出と完全レスポンシブまで。",
    stack: ["Next.js", "React", "Tailwind CSS"],
    href: "https://premium-brand-demo.vercel.app",
  },
  {
    category: "比較メディア",
    title: "ネット回線の比較メディア",
    summary:
      "Bento UI のダークなメディア。カード型グリッドでランキング・料金比較表・セルフ診断まで。写真を使わず CSS と SVG だけで作図した。",
    stack: ["HTML5", "CSS", "SVG"],
    href: "https://giga-navi-demo.vercel.app",
  },
  {
    category: "比較メディア",
    title: "投資・証券の比較メディア",
    summary:
      "ネット証券を横断比較するランキングメディア。トップ・ランキング・記事・3問の口座診断ツールの複数ページ構成。金融の表現は中立に寄せた。",
    stack: ["HTML5", "CSS", "SVG"],
    href: "https://money-compass-demo.vercel.app",
  },
  {
    category: "クリニックサイト",
    title: "歯科クリニック",
    summary:
      "診療案内・院内設備・FAQ・アクセスの構成。医療広告ガイドラインに配慮した言い回しにしてある。",
    stack: ["Next.js", "React", "Tailwind CSS"],
    href: "https://clinic-demo-beta.vercel.app",
  },
  {
    category: "店舗サイト",
    title: "カフェ（木漏れ日）",
    summary:
      "写真を主役にした1ページ。Canvas で木漏れ日の光を動かしつつ、JS が無効でも本文が読める構造にしてある。",
    stack: ["HTML5", "CSS", "Canvas"],
    href: "https://cafe-demo.vercel.app",
  },
  {
    category: "コーポレートサイト",
    title: "コーポレート（WordPress）",
    summary:
      "WordPress のオリジナルテーマを5ページ構成でフルスクラッチ。固定ページテンプレート・メニュー・問い合わせフォームまで。",
    stack: ["WordPress", "PHP", "CSS"],
    href: "https://wp-corporate-demo.vercel.app",
  },
  {
    category: "ランディングページ",
    title: "パーソナルジム LP",
    summary:
      "PHP でフォームのサーバー側バリデーション・CSRF 対策・メール送信まで実装。FAQ アコーディオンとスクロール演出つき。",
    stack: ["HTML5", "Sass", "PHP"],
    href: "https://php-lp-demo.vercel.app",
  },
  {
    category: "Web アプリ",
    title: "ToiNavi — トイレ検索",
    summary:
      "位置情報から近いトイレを距離順に出す。地図表示・設備や評価の確認・キーワード検索を一画面で完結させた。",
    stack: ["Next.js", "TypeScript", "地図API"],
    href: "https://toilet-finder-lovat.vercel.app",
  },
];
