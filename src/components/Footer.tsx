import { REPO_URL } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)]">
      <div className="container-editorial py-12 grid grid-cols-12 gap-x-[var(--space-6)] sm:gap-x-[var(--space-8)] items-end">
        <div className="col-span-12 sm:col-span-6">
          <p className="font-display type-h2">Arechon</p>
          <p className="font-mono-accent text-[var(--muted)] mt-2">
            <span lang="en">Portfolio · Built with Claude Code · Sendai, JP</span>
          </p>
        </div>
        <div className="col-span-12 sm:col-span-6 mt-8 sm:mt-0">
          <ul className="flex flex-wrap gap-6 sm:justify-end font-mono-accent text-[var(--muted)]">
            <li>
              <a
                className="link-underline"
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
            </li>
            <li>
              <a className="link-underline" href="#top">
                Top <span aria-hidden>↑</span>
              </a>
            </li>
          </ul>
          <p className="font-mono-accent text-[var(--muted)] mt-6 sm:text-right">
            © {new Date().getFullYear()} Arechon
          </p>
        </div>
      </div>
    </footer>
  );
}
