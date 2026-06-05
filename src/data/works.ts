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

export const works: Work[] = [
  {
    slug: "arechon-site",
    client: "Arechon",
    category: "Studio / Self-initiated",
    title: "このサイト自体",
    titleEn: "This very website",
    year: 2026,
    role: ["Strategy", "Design", "Build", "Operate"],
    stack: ["Next.js 16", "R3F", "GSAP / Lenis"],
    summary:
      "Awwwards SOTD 水準を狙って構築している看板サイト。Claude Code の3エージェント体制で設計→実装→監査を回した過程そのものが、Arechon の運用ショーケース。",
  },
  {
    slug: "claude-code-playbook",
    client: "Arechon",
    category: "Open methodology",
    title: "Claude Code 制作プレイブック",
    titleEn: "The Claude Code production playbook",
    year: 2026,
    role: ["Writing", "Methodology", "Skill"],
    stack: ["Skills", "Subagents", "Markdown"],
    summary:
      "Web 制作で実証した Claude Code の運用ルールを、再現可能な playbook として整備中。art-director / interaction-engineer / quality-auditor の3エージェントで Phase 0–5 を回す。",
  },
];
