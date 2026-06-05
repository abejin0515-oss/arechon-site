import type { Metadata } from "next";
import "@/components/showcase/showcase.css";
import "@/components/techniques/loading-sequence/loading-sequence.css";
import { IntroCurtain } from "@/components/techniques/loading-sequence";

export const metadata: Metadata = {
  title: "Technique Showcase",
  description:
    "Awwwards級のサイトから抽出した13の世界レベル技術を、実際に動くコンポーネントとして並べたショーケース。",
  robots: { index: false, follow: false },
};

/**
 * Showcase route layout — its own self-contained identity.
 * Imports the page-scoped dark token overrides (showcase.css) and sets metadata.
 * No homepage Nav/Footer: /showcase reads as its own microsite.
 *
 * Opening curtain: <IntroCurtain /> is a server component that emits static SSR
 * DOM (#intro-curtain) before {children}, so it covers the page from frame 0 (no
 * JS, no React) — killing the "blank first frame" flash. The matching client
 * controller (LoadingSequence, inside Showcase) grabs that node, plays the
 * reveal-out, and removes it. The whole technique lives in
 * @/components/techniques/loading-sequence — this layout just imports its CSS and
 * drops the curtain in.
 */
export default function ShowcaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <IntroCurtain />
      {children}
    </>
  );
}
