import type { Metadata } from "next";
import type { Viewport } from "next";
import "@/components/grain/grain.css";

export const metadata: Metadata = {
  title: "一粒 — 新米と古米のあいだ / 阿部米穀",
  description:
    "同じ田の同じ一粒が、年を越すごとに新米の艶から古米の落ち着きへ材質を変えながら、形は変わらず受け継がれる。阿部米穀の物語を、一粒の米で。",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0c0a08",
  colorScheme: "dark",
};

/**
 * /grain route layout — its own self-contained microsite.
 * No homepage Nav/Footer. Imports the page-scoped Cinematic-Dark tokens.
 * The granary is fixed full-viewport; this route is a single experience.
 */
export default function GrainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
