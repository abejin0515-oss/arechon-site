import Link from "next/link";

const items = [
  { label: "Process", href: "#operations" },
  { label: "Works", href: "#works" },
  { label: "About", href: "#about" },
];

export function Nav() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 mix-blend-difference">
      <div className="container-editorial flex items-center justify-between py-6">
        <Link
          href="/"
          className="font-mono-accent text-white"
          aria-label="Arechon home"
        >
          ARECHON
          <span className="ml-2 opacity-60">/ SDI</span>
        </Link>
        <nav>
          <ul className="flex gap-6 sm:gap-10">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="font-mono-accent text-white link-underline"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
