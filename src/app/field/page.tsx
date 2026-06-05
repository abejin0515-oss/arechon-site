import FieldHero from '@/components/field/FieldHero';

/**
 * /field — Server Component entry.
 *
 * FieldHero is a Client Component ('use client') that owns the WebGL capability
 * gate, the error boundary, and the static poster. It internally dynamic-imports
 * the heavy three / R3F / postprocessing scene with `ssr:false`, so that bundle
 * is code-split out of the initial JS and never runs on the server.
 *
 * NOTE: in Next 16, `next/dynamic` with `ssr:false` is NOT allowed inside a
 * Server Component — it must live inside a Client Component. That is exactly why
 * the ssr:false import is done inside FieldHero, not here. We import FieldHero
 * normally; the route layout has already painted the dark ground for the first
 * frame, so there is no blank flash while FieldHero hydrates.
 */
export default function FieldPage() {
  return (
    <main>
      <FieldHero />
    </main>
  );
}
