import { demos } from "@/data/demos";
import { Reveal } from "./Reveal";

/**
 * DemoIndex — the long tail of self-initiated work, as a list.
 *
 * These deploy elsewhere and cannot be screenshotted honestly from here,
 * so they get type instead of images: category, name, one line, stack.
 * The disclaimer in the header is load-bearing — none of this is client
 * work, and the list must not be readable as if it were.
 */
export function DemoIndex() {
  return (
    <section
      id="demos"
      className="bg-[var(--surface)] py-[var(--space-24)] sm:py-[var(--space-32)]"
    >
      <div className="container-editorial">
        <div className="grid grid-cols-12 gap-x-[var(--space-6)] sm:gap-x-[var(--space-8)] mb-16">
          <div className="col-span-12 sm:col-span-3">
            <p className="font-mono-accent text-[var(--muted)]">
              — Index / {demos.length}
            </p>
          </div>
          <div className="col-span-12 sm:col-span-9">
            <Reveal as="h2" className="font-display type-h1 max-w-[22ch]">
              業種を変えて、{demos.length}本。
            </Reveal>
            <Reveal>
              <p className="type-body max-w-[var(--container-reading)] mt-8 text-[var(--fg)]/85">
                いずれも受注案件ではなく、業種と技術を変えて自分で作ったデモです。
                登場する店舗名・ブランド名・医院名はすべて架空。
                同じ進め方が業種を越えて通るかを確かめるために作りました。
              </p>
            </Reveal>
          </div>
        </div>

        <ul className="border-t border-[var(--border)]">
          {demos.map((d, i) => (
            <li key={d.href + d.title}>
              <a
                href={d.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group block border-b border-[var(--border)] py-6 sm:py-8 grid grid-cols-12 gap-x-[var(--space-6)] sm:gap-x-[var(--space-8)] items-baseline"
              >
                <span className="col-span-2 sm:col-span-1 font-mono-accent text-[var(--muted)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="col-span-10 sm:col-span-2 font-mono-accent text-[var(--muted)]">
                  {d.category}
                </span>
                <span className="col-span-12 sm:col-span-5 mt-3 sm:mt-0">
                  <span className="block font-display type-h3 transition-transform duration-[var(--dur-standard)] group-hover:translate-x-2">
                    {d.title}
                    <span
                      aria-hidden
                      className="ml-2 text-[var(--accent)] opacity-0 transition-opacity duration-[var(--dur-micro)] group-hover:opacity-100"
                    >
                      ↗
                    </span>
                  </span>
                  <span className="block type-small text-[var(--muted)] mt-2 max-w-[46ch]">
                    {d.summary}
                  </span>
                </span>
                <span className="col-span-12 sm:col-span-4 mt-3 sm:mt-0 sm:text-right font-mono-accent text-[var(--muted)]">
                  {d.stack.join(" · ")}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
