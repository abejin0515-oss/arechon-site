"use client";

import type { ReactNode } from "react";

export type TechniqueFamily = "Scroll" | "WebGL" | "Sound" | "DataViz";

type TechniqueSectionProps = {
  /** "01" … "12" */
  index: string;
  family: TechniqueFamily;
  /** Display title, e.g. "Kinetic Headline" */
  title: string;
  /** One-line description of what the move is */
  description: string;
  /** Tag(s) from the teardown 飛び道具 catalog, e.g. "kinetic-headlines" */
  tag?: string;
  /** Break out of the editorial container to 100vw (pinned / cover demos) */
  fullBleed?: boolean;
  /**
   * Suppress the visible label/title/description header (still emitted for AT as
   * an sr-only heading so the section stays labelled). Used for "幕間" interludes
   * where the demo IS the statement and a catalog header would break the spell.
   */
  hideHead?: boolean;
  children: ReactNode;
};

/**
 * Catalog wrapper that frames each technique consistently:
 * mono index + family tag, title, one-line description, then the live demo.
 * The header carries data-sound="hover" so hovering a section title also
 * demonstrates the sound wiring in one place.
 */
export function TechniqueSection({
  index,
  family,
  title,
  description,
  tag,
  fullBleed = false,
  hideHead = false,
  children,
}: TechniqueSectionProps) {
  const id = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return (
    <section
      id={id}
      className={`showcase-section${hideHead ? " showcase-section--bare" : ""}`}
      aria-labelledby={`${id}-title`}
    >
      {hideHead ? (
        // Keep the section labelled for assistive tech without painting the
        // catalog header (the demo carries the meaning visually).
        <h2 id={`${id}-title`} className="sr-only">
          {title}
        </h2>
      ) : (
        <header className="showcase-section__head" data-sound="hover">
          <div className="showcase-section__meta font-mono-accent">
            <span className="showcase-section__index">{index}</span>
            <span className="showcase-section__tag">{family}</span>
            {tag ? <span aria-hidden>{tag}</span> : null}
          </div>
          <h2 id={`${id}-title`} className="type-h2 font-display">
            {title}
          </h2>
          <p className="showcase-section__desc type-body">{description}</p>
        </header>
      )}

      {fullBleed ? <div className="showcase-bleed">{children}</div> : children}
    </section>
  );
}
