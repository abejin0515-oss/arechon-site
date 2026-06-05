/**
 * Film grain / noise overlay.
 * Uses an inline SVG turbulence filter — no image asset, no runtime cost beyond compositing.
 * Sits above all content via z-index but pointer-events: none so it never blocks interaction.
 * mix-blend-mode: overlay tints subtly with the underlying hue.
 */
const noiseSvg =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>";

export function Grain() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[55] opacity-[0.08] mix-blend-overlay"
      style={{
        backgroundImage: `url("${noiseSvg}")`,
        backgroundSize: "200px 200px",
        backgroundRepeat: "repeat",
      }}
    />
  );
}
