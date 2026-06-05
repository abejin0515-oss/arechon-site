import type { Metadata } from 'next';
import '@/components/motion/motion.css';

export const metadata: Metadata = {
  title: 'Motion — Fluid Distortion',
  description:
    '同じ流体ゆがみ（distortion）を、編集的に高品質な3枚の写真（墨 / サテン / ダークフローラル）に適用して比較する、Cinematic Dark の検証ページ。',
  robots: { index: false, follow: false },
};

/**
 * /motion route layout — self-contained, forced-dark identity (motion.css).
 * No homepage Nav/Footer: this is a focused comparison surface.
 */
export default function MotionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
