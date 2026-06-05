import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Field — Generative Fluid',
  description:
    'A material-free generative field — bioluminescent fluid in dark water, stirred in real time by the cursor. No photo, no model. Arechon.',
  robots: { index: false, follow: false },
};

/**
 * /field route layout.
 *
 * The inline `background` on this wrapper is the SSR-time guarantee against a
 * white first frame: the dark ink ground is painted by HTML/CSS before any JS
 * runs, so even on the very first server-rendered paint (and under no-JS) the
 * page is the correct near-black, never a flash of white.
 */
export default function FieldLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#04070b',
        minHeight: '100svh',
        color: '#eaf6fb',
      }}
    >
      {children}
    </div>
  );
}
