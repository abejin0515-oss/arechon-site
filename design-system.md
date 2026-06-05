# Arechon Portfolio — Design System (Art Director Spec, 2026-06-03)

このドキュメントは art-director エージェントが定義したビジュアル方向性の単一ソース。
実装はこれを唯一の真として参照する。

## Tone
**静かな自信** — 余白で語り、タイポグラフィで証明し、一色のアクセントで仕掛ける。技術は見せびらかさず、結果で示す。

## References
- Locomotive (locomotive.ca) — editorial swiss restraint
- Robin Noguier (robin-noguier.com) — solo SOTD via typography hero
- Resn / Active Theory — bento case-study with monochrome + accent
- Studio Möbius / Phantom — technical credibility + warmth
- Hassan Bahaa (hassanbahaa.com, 2025 SOTD) — solo portfolio proof

## Typography
| Role | Font | Source | Weights |
|---|---|---|---|
| Display (Latin) | Fraunces (variable, opsz 144) | Google | 400/500/700 |
| Body (Latin) | Inter (variable) | Google | 400/500/600 |
| Display (JP) | Shippori Mincho B1 | Google | 500/700 |
| Body (JP) | Noto Sans JP (variable) | Google | 400/500/700 |
| Mono accent | JetBrains Mono | Google | 500 |

Pairing: JP headlines = Shippori Mincho B1 700 + Fraunces 700 fallback. Body = Noto Sans JP 400 / Inter 400.

Sizes (clamp, mobile-first):
- `--font-display`: clamp(3.5rem, 10vw, 9rem) / lh 0.92 / tracking -0.04em
- `--font-h1`: clamp(2.5rem, 6vw, 5rem) / lh 1.0 / tracking -0.03em
- `--font-h2`: clamp(1.75rem, 3.5vw, 2.75rem) / lh 1.1 / tracking -0.02em
- `--font-h3`: clamp(1.25rem, 2vw, 1.5rem) / lh 1.25 / tracking -0.01em
- `--font-body`: clamp(1rem, 1.1vw, 1.125rem) / lh 1.6
- `--font-small`: 0.8125rem / lh 1.5 / tracking 0.02em
- `--font-mono`: 0.75rem / lh 1.4 / tracking 0.04em / uppercase

JP-specific: `word-break: auto-phrase`, `line-break: strict`, `text-spacing-trim: trim-start`, `font-feature-settings: "palt" 1`.

## Color (OKLCH)

Light:
- bg: oklch(0.985 0.002 95)
- fg: oklch(0.18 0.01 260)
- muted: oklch(0.55 0.008 260)
- border: oklch(0.92 0.004 260)
- surface: oklch(0.96 0.003 95)
- accent: oklch(0.62 0.22 28)  ← burnt orange
- accent-fg: oklch(0.98 0.005 95)

Dark:
- bg: oklch(0.14 0.008 260)
- fg: oklch(0.96 0.003 95)
- muted: oklch(0.62 0.01 260)
- border: oklch(0.24 0.008 260)
- surface: oklch(0.18 0.008 260)
- accent: oklch(0.72 0.19 32)
- accent-fg: oklch(0.14 0.008 260)

Rule: ONE accent. No gradients except a single subtle radial behind hero (accent @ 0.04 opacity, 80vw blur).

## Spacing (4px base, ×1.5 geometric)
1/2/3/4/6/8/12/16/24/32/48/64 → 4/8/12/16/24/32/48/64/96/128/192/256 px

Section rhythm: mobile `--space-24`, desktop `--space-48`.

## Motion
- ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1) — primary
- ease-in-out-quart: cubic-bezier(0.76, 0, 0.24, 1) — page transitions
- ease-out-quad: cubic-bezier(0.25, 0.46, 0.45, 0.94) — micro hover

Durations: micro 180ms / standard 600ms / hero reveal 1200ms / page transition 800ms.

What moves:
- Hero display type: per-line mask reveal, stagger 80ms
- Lenis lerp 0.1, smoothTouch off
- Case study thumbnails: scale 1.02 + image parallax translateY -8%
- Link underlines: scaleX 0→1, 400ms
- Native cursor only
- Three.js: ONE moment — subtle WebGL distortion on hero name (hover desktop / scroll-progress mobile). No persistent canvas.

`prefers-reduced-motion: reduce` → opacity-only 200ms, Lenis disabled.

## Layout
- Grid: 12-col, gutters --space-6 mobile / --space-8 desktop
- Asymmetric: 7/5 or 8/4 hero+case splits, never 6/6
- Breakpoints: sm 640, md 768, lg 1024, xl 1280, 2xl 1536
- Containers: editorial max 1440px, reading max 680px, full-bleed allowed for case hero
- Horizontal padding: clamp(1.25rem, 4vw, 4rem)

Mobile-first ATF (iPhone 13 mini 375×812): hero text + 1 CTA + 1 proof case visible.
