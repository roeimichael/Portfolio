import { useEffect, useState } from "react";

const links = [
  { href: "#about", label: "About" },
  { href: "#projects", label: "Projects" },
  { href: "#contact", label: "Contact" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 transition-all border-b ${
        scrolled
          ? "backdrop-blur bg-bg/80 border-line"
          : "bg-transparent border-white/5"
      }`}
    >
      <nav className="w-full px-6 sm:px-10 h-16 flex items-center justify-between">
        <a
          href="#top"
          className="font-mono text-sm tracking-tight text-ink hover:text-accent transition-colors"
        >
          roei<span className="text-accent">.</span>michael
        </a>
        <ul className="hidden sm:flex items-center gap-8 text-sm font-medium text-ink/85">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="relative py-1 hover:text-accent transition-colors after:absolute after:left-0 after:-bottom-0.5 after:h-px after:w-0 after:bg-accent after:transition-all hover:after:w-full"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
