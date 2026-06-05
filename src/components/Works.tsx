import { works } from "@/data/works";
import { Reveal } from "./Reveal";
import { WorksMount } from "./works/WorksMount";

/**
 * Works — semantic, accessible, SEO-indexable case study sequence.
 *
 * Layout rhythm: odd items (1st, 3rd...) go full-bleed edge-to-edge with a
 * cinematic 21:9 aspect; even items (2nd, 4th...) sit inside the editorial
 * container with a 4:3 aspect. The alternation creates a breathing layout
 * that reads like a magazine spread, not a grid.
 *
 * The DOM is the source of truth: every image slot exposes a
 * `[data-work-image]` anchor with reserved aspect-ratio space, and the
 * WebGL canvas in <WorksMount /> reads those rects each frame to overlay
 * the textured plane. No card background — the image floats.
 *
 * Under prefers-reduced-motion or before JS, this list is the entire
 * experience — semantic, indexable, navigable.
 */
export function Works() {
  return (
    <section
      id="works"
      className="overflow-hidden py-[var(--space-24)] sm:py-[var(--space-48)]"
    >
      <WorksMount />

      <div className="container-editorial mb-24 sm:mb-32">
        <div className="grid grid-cols-12 gap-x-[var(--space-6)] sm:gap-x-[var(--space-8)]">
          <div className="col-span-12 sm:col-span-3">
            <p className="font-mono-accent text-[var(--muted)]">— Works</p>
          </div>
          <div className="col-span-12 sm:col-span-9">
            <Reveal as="h2" className="font-display type-h1 max-w-[18ch]">
              実績は、語るより並べる。
            </Reveal>
          </div>
        </div>
      </div>

      <ul className="space-y-[var(--space-32)] sm:space-y-[var(--space-48)]">
        {works.map((w, i) => {
          const big = i % 2 === 0;
          return (
            <li key={w.slug} className="group">
              <a
                href={w.href ?? "#works"}
                target={w.href ? "_blank" : undefined}
                rel={w.href ? "noopener noreferrer" : undefined}
                className="block"
              >
                {/* Meta row in the editorial grid (never full-bleed). */}
                <div className="container-editorial mb-4 sm:mb-6 flex items-baseline justify-between font-mono-accent text-[var(--muted)]">
                  <span>
                    {String(i + 1).padStart(2, "0")} — {w.client}
                  </span>
                  <span className="hidden sm:inline">
                    {w.stack.join(" · ")} · {w.year}
                  </span>
                </div>

                {/* Image slot — full-bleed for big items, container for small. */}
                <div
                  data-work-image
                  data-slug={w.slug}
                  aria-hidden="true"
                  className={
                    big
                      ? "block w-full aspect-[21/9] overflow-hidden"
                      : "container-editorial block aspect-[4/3] overflow-hidden"
                  }
                />

                {/* Title under image, container width. */}
                <div className="container-editorial mt-6 sm:mt-8 grid grid-cols-12 gap-x-[var(--space-6)] sm:gap-x-[var(--space-8)] items-baseline">
                  <div className="col-span-12 sm:col-span-8">
                    <h3 className="font-display type-h1 transition-transform duration-[var(--dur-standard)] group-hover:translate-x-2">
                      {w.title}
                    </h3>
                    <p className="type-small text-[var(--muted)] mt-2 italic">
                      {w.titleEn}
                    </p>
                  </div>
                  <div className="hidden sm:block col-span-4 text-right">
                    <p className="font-mono-accent text-[var(--muted)]">
                      {w.category}
                    </p>
                  </div>
                </div>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
