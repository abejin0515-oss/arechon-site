export type Agent = {
  slug: string;
  label: string;
  role: string;
  roleEn: string;
  description: string;
  deliverables: string[];
  /** OKLCH hue value 0-360 — drives the node halo color. */
  hue: number;
};

export const agents: Agent[] = [
  {
    slug: "art-director",
    label: "Art Director",
    role: "視覚方向性、参考リサーチ、タイポ・カラー・レイアウト判断",
    roleEn: "Visual direction & reference research",
    description:
      "Awwwards SOTD クラスの参照サイトを分析し、タイポグラフィシステム、カラートークン、レイアウト原則を OKLCH と clamp() で具体的な仕様まで落とす。曖昧な提案ではなく、実装可能な決定を返す。",
    deliverables: [
      "References — 3-5 sites",
      "Typography (clamp values)",
      "Color tokens (OKLCH)",
      "Motion principles",
      "Layout grid",
    ],
    hue: 28,
  },
  {
    slug: "interaction-engineer",
    label: "Interaction Engineer",
    role: "WebGL (Three.js/R3F) + GSAP / Lenis + Framer Motion 統合実装",
    roleEn: "WebGL + GSAP + Framer Motion implementation",
    description:
      "シェーダー、スクロール連動アニメーション、マイクロインタラクションを production code で書く。dispose、reduced-motion、モバイル劣化シナリオを自己強制する。プロトタイプは作らない、ship する。",
    deliverables: [
      "WebGL scenes (R3F)",
      "GSAP ScrollTrigger timelines",
      "Magnetic / cursor logic",
      "prefers-reduced-motion fallbacks",
      "Mobile degradation paths",
    ],
    hue: 195,
  },
  {
    slug: "quality-auditor",
    label: "Quality Auditor",
    role: "Lighthouse + a11y (WCAG 2.2 AA) + SEO 統合監査",
    roleEn: "Performance + a11y + SEO audit",
    description:
      "P0 / P1 / P2 の優先度付きで finding を返す。Core Web Vitals、WCAG 2.2 AA、構造化データを横断的にチェックし、ship / hold / blocked の判定を下す。発見の質が世界水準のゲートになる。",
    deliverables: [
      "Findings table (P0/P1/P2)",
      "VERDICT: ship / hold / blocked",
      "WCAG 2.2 AA pass",
      "Lighthouse delta",
      "SEO + structured data",
    ],
    hue: 145,
  },
];
