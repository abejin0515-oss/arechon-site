import type { Metadata, Viewport } from "next";
import {
  Fraunces,
  Inter,
  Noto_Sans_JP,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";
import { StructuredData } from "@/components/StructuredData";
import { SITE_URL } from "@/lib/site";

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
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Arechon — Claude Code で作ったポートフォリオ / 仙台",
    template: "%s · Arechon",
  },
  description:
    "エンジニア経験なしで、AI コーディングツール（Claude Code）に指示を出して個人で作った Web ポートフォリオ。指示の設計から検証、公開までの進め方をサイト自体で公開しています。",
  keywords: ["ポートフォリオ", "Claude Code", "AI", "個人開発", "Next.js", "仙台"],
  authors: [{ name: "Arechon" }],
  creator: "Arechon",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    alternateLocale: "en_US",
    url: SITE_URL,
    siteName: "Arechon",
    title: "Arechon — Claude Code で作ったポートフォリオ / 仙台",
    description:
      "Claude Code に指示を出して個人で作った Web ポートフォリオ。",
  },
  twitter: {
    card: "summary_large_image",
    title: "Arechon — Claude Code で作ったポートフォリオ / 仙台",
    description:
      "Claude Code に指示を出して個人で作った Web ポートフォリオ。",
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
