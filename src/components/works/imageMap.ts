/**
 * Slug → image URL map for the WebGL Works gallery.
 *
 * These are real screenshots of the pages in this repository, served from
 * /public. They used to be remote picsum.photos URLs, which meant two
 * problems: the gallery showed stock photography that had nothing to do
 * with the work, and a blocked or slow picsum made useTexture throw —
 * taking the whole homepage down with it (see WorksMount's boundary).
 *
 * Captured at 1600×1200 with Playwright against a production build.
 */
export const workImages: Record<string, string> = {
  "arechon-site": "/works/arechon-site.jpg",
  showcase: "/works/showcase.jpg",
  motion: "/works/motion.jpg",
  grain: "/works/grain.jpg",
  field: "/works/field.jpg",
};

/** Returns a stable image URL for a work slug. */
export function getWorkImage(slug: string): string {
  return workImages[slug] ?? "/works/arechon-site.jpg";
}
