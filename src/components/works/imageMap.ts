/**
 * Slug → image URL map for the WebGL Works gallery.
 *
 * Picsum `/id/{n}` URLs are deterministic — each ID maps to a specific photo
 * in the curated catalog, so we get visually-strong, predictable images
 * without sourcing rights friction. Real photography slots in by replacing
 * values when the owner ships them.
 *
 * Sizes target ~1600×1200 — sized for full-bleed retina rendering inside
 * a ~600×450 card after the cover-fit + parallax-window crop.
 */
export const workImages: Record<string, string> = {
  // ID 1018 — dramatic mountain landscape, fits 庄内/agricultural mood
  "abe-beikoku": "https://picsum.photos/id/1018/1600/1200",
  // ID 1015 — moody valley, abstract-tech feel for AI ops
  "arechon-ops": "https://picsum.photos/id/1015/1600/1200",
};

/** Returns a stable image URL for a work slug. Falls back to a neutral seed. */
export function getWorkImage(slug: string): string {
  return (
    workImages[slug] ??
    `https://picsum.photos/seed/arechon-${encodeURIComponent(slug)}/1600/1200`
  );
}
