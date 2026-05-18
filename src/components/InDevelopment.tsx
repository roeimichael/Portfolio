import { ExternalLink, Lock } from "lucide-react";
import { inDevelopment } from "../data";

export default function InDevelopment() {
  return (
    <section id="in-development" className="border-t border-line">
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="mb-10">
          <h2 className="flex items-center gap-2 text-sm font-mono text-mute uppercase tracking-widest mb-3">
            <span className="h-2 w-2 rounded-full bg-accent-soft animate-pulse" />
            Currently in Development
          </h2>
          <p className="text-2xl sm:text-3xl font-semibold tracking-tight max-w-2xl">
            Active work that isn't open-source — yet.
          </p>
        </div>

        <div className="grid sm:grid-cols-1 gap-4">
          {inDevelopment.map((p) => (
            <a
              key={p.name}
              href={p.url}
              target="_blank"
              rel="noreferrer"
              className="group relative flex flex-col md:flex-row rounded-2xl border border-line bg-panel/50 overflow-hidden hover:border-accent/60 hover:bg-panel/80 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_40px_-12px_rgba(59,130,246,0.35)]"
            >
              <div className="relative md:w-2/5 aspect-[16/9] md:aspect-auto overflow-hidden bg-black/60">
                <img
                  src={p.image}
                  alt={p.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-panel/80 pointer-events-none" />
              </div>

              <div className="flex flex-1 flex-col gap-3 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-semibold tracking-tight leading-tight">
                        {p.name}
                      </h3>
                      <span className="inline-flex items-center gap-1 rounded-md border border-accent-soft/30 bg-accent-soft/10 px-2 py-0.5 text-[10px] font-mono text-accent-soft uppercase">
                        <Lock className="h-3 w-3" />
                        Private
                      </span>
                    </div>
                    <p className="text-sm text-accent/90 mt-1 font-mono">
                      {p.tagline}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.open(p.url, "_blank", "noopener,noreferrer");
                    }}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-accent/40 hover:bg-accent-soft transition-colors"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                    Live Site
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>

                <p className="text-sm leading-relaxed text-ink/80">
                  {p.description}
                </p>

                <div className="mt-auto flex flex-wrap gap-1.5 pt-3 border-t border-line/50">
                  {p.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-md bg-accent/10 border border-accent/20 px-2 py-0.5 text-[11px] font-mono text-accent/90"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
