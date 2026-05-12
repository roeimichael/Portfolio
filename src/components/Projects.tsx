import { ArrowUpRight } from "lucide-react";
import { projects } from "../data";

export default function Projects() {
  return (
    <section id="projects" className="border-t border-line">
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="flex items-end justify-between gap-6 mb-10">
          <div>
            <h2 className="text-sm font-mono text-mute uppercase tracking-widest mb-3">
              Featured Projects
            </h2>
            <p className="text-2xl sm:text-3xl font-semibold tracking-tight max-w-2xl">
              Selected work in algorithmic trading, data engineering, and ML
              systems.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {projects.map((p) => {
            const Icon = p.icon;
            return (
              <a
                key={p.title}
                href={p.href}
                target="_blank"
                rel="noreferrer"
                className="group relative rounded-xl border border-line bg-panel/40 p-6 hover:border-mute transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Icon className="h-5 w-5" />
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-mute transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
                </div>
                <h3 className="text-lg font-semibold tracking-tight">
                  {p.title}
                </h3>
                <p className="text-sm text-mute mb-3">{p.tagline}</p>
                <p className="text-sm leading-relaxed text-ink/85">
                  {p.summary}
                </p>
                <ul className="mt-4 space-y-1.5 text-sm text-ink/75">
                  {p.bullets.map((b) => (
                    <li key={b} className="flex gap-2">
                      <span className="text-accent mt-1.5 h-1 w-1 rounded-full bg-accent shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {p.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-md border border-line px-2 py-0.5 text-[11px] font-mono text-mute"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </a>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <a
            href="https://github.com/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm text-mute hover:text-ink transition-colors"
          >
            View all projects on GitHub
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
