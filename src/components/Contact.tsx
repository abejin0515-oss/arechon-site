import { Reveal } from "./Reveal";

export function Contact() {
  return (
    <section
      id="contact"
      className="container-editorial py-[var(--space-24)] sm:py-[var(--space-48)]"
    >
      <div className="grid grid-cols-12 gap-x-[var(--space-6)] sm:gap-x-[var(--space-8)]">
        <div className="col-span-12 sm:col-span-3">
          <p className="font-mono-accent text-[var(--muted)]">— Contact</p>
        </div>
        <div className="col-span-12 sm:col-span-9">
          <Reveal as="h2" className="font-display type-display max-w-[14ch]">
            まずは、
            <br />
            一行から。
          </Reveal>
          <Reveal>
            <p className="type-body max-w-[var(--container-reading)] mt-8 mb-12 text-[var(--fg)]/90">
              新規制作・既存サイトのリニューアル・薄保守のご相談、
              いずれもメール一通から始められます。
              通常 1 営業日以内に返信します。
            </p>
            <a
              href="mailto:hello@arechon.dev"
              className="inline-flex items-center gap-3 type-h2 font-display link-underline text-[var(--accent)]"
            >
              hello@arechon.dev
              <span aria-hidden>↗</span>
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
