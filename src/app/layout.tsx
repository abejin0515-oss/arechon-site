import type { Metadata, Viewport } from "next";
import {
  Fraunces,
  Inter,
  Noto_Sans_JP,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";
import { StructuredData } from "@/components/StructuredData";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
  axes: ["opsz"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
});

const notoSansJp = Noto_Sans_JP({
  variable: "--font-noto-jp",
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
  preload: false,
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["500"],
  display: "swap",
  preload: false,
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF8F2" },
    { media: "(prefers-color-scheme: dark)", color: "#1F2433" },
  ],
  colorScheme: "light dark",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://arechon.dev"),
  title: {
    default: "Arechon — Web制作・AI活用 / 仙台",
    template: "%s · Arechon",
  },
  description:
    "仙台拠点の個人事業。Claude Code を活用した高速・高品質な Web 制作と、AI 組織による裏側運用で、地方中小企業のオンライン基盤を作ります。",
  keywords: ["Web制作", "仙台", "Claude Code", "Next.js", "AI", "ポートフォリオ"],
  authors: [{ name: "Arechon" }],
  creator: "Arechon",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    alternateLocale: "en_US",
    url: "https://arechon.dev",
    siteName: "Arechon",
    title: "Arechon — Web制作・AI活用 / 仙台",
    description:
      "仙台拠点の個人事業。Claude Code 活用の Web 制作スタジオ。",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Arechon",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Arechon — Web制作・AI活用 / 仙台",
    description:
      "仙台拠点の個人事業。Claude Code 活用の Web 制作スタジオ。",
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

const fontVariables = [
  fraunces.variable,
  inter.variable,
  notoSansJp.variable,
  jetbrains.variable,
].join(" ");

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" className={fontVariables} suppressHydrationWarning>
      <head>
        <style>{`
          :root {
            --font-display-stack: var(--font-fraunces), ui-serif, "Hiragino Mincho ProN", "Yu Mincho", serif;
            --font-sans-stack: var(--font-inter), var(--font-noto-jp), ui-sans-serif, system-ui, "Hiragino Sans", "Yu Gothic", sans-serif;
            --font-mono-stack: var(--font-jetbrains), ui-monospace, "SF Mono", Menlo, monospace;
          }
        `}</style>
      </head>
      <body className="min-h-svh bg-[var(--bg)] text-[var(--fg)]">
        <StructuredData />
        {children}
      </body>
    </html>
  );
}
