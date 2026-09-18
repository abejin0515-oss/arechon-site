export type Work = {
  slug: string;
  client: string;
  category: string;
  title: string;
  titleEn: string;
  year: number;
  role: string[];
  stack: string[];
  href?: string;
  accent?: string;
  summary: string;
};

/**
 * Every entry is self-initiated work in this repository — no client
 * projects. The demo routes are linked so the reader can open the actual
 * running page instead of taking a screenshot's word for it.
 */
export const works: Work[] = [
  {
    slug: "arechon-site",
    client: "Portfolio",
    category: "Self-initiated",
    title: "このサイト自体",
    titleEn: "This very website",
    year: 2026,
    role: ["Direction", "Prompting", "Review"],
    stack: ["Next.js 16", "R3F", "GSAP / Lenis"],
    summary:
      "設計ドキュメントを先に書き切り、役割を分けた3つのエージェントに実装させて公開したポートフォリオ本体。指示と監査の手順そのものが制作物。",
  },
  {
    slug: "showcase",
    client: "Portfolio",
    category: "Technique study",
    title: "技術ショーケース",
    titleEn: "Technique showcase",
    year: 2026,
    role: ["Direction", "Prompting"],
    stack: ["GSAP", "Framer Motion", "CSS"],
    href: "/showcase",
    summary:
      "参照サイトから抽出した13の演出を、実際に動くコンポーネントとして1ページに並べた検証ページ。動くものだけを残した。",
  },
  {
    slug: "motion",
    client: "Portfolio",
    category: "WebGL study",
    title: "流体ゆがみの比較",
    titleEn: "Fluid distortion comparison",
    year: 2026,
    role: ["Direction", "Prompting"],
    stack: ["Three.js", "GLSL", "R3F"],
    href: "/motion",
    summary:
      "同じシェーダーを質感の違う3枚の写真に当て、どの素材で成立するかを並べて比較した検証ページ。",
  },
  {
    slug: "grain",
    client: "Portfolio",
    category: "Concept site",
    title: "一粒 — 米屋のコンセプトサイト",
    titleEn: "One grain",
    year: 2026,
    role: ["Direction", "Copy", "Prompting"],
    stack: ["R3F", "Postprocessing", "GSAP"],
    href: "/grain",
    summary:
      "米屋を題材にした1ページ完結のコンセプトサイト。新米から古米へ、同じ一粒の質感が変わる過程をスクロールで見せる。",
  },
  {
    slug: "field",
    client: "Portfolio",
    category: "Generative",
    title: "生成される流体",
    titleEn: "Generative fluid field",
    year: 2026,
    role: ["Direction", "Prompting"],
    stack: ["R3F", "GLSL", "Postprocessing"],
    href: "/field",
    summary:
      "写真も3Dモデルも使わず、カーソルで揺れる流体をリアルタイム生成したヒーロー表現。素材ゼロで画を作る検証。",
  },
];
