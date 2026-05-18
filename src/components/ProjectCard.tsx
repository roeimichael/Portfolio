import { ArrowUpRight, Star, GitFork, ExternalLink } from "lucide-react";
import type { FeaturedProject } from "../data";

export default function ProjectCard({ project }: { project: FeaturedProject }) {
  const displayName = project.displayName ?? project.repo;

  return (
    <a
      href={project.link}
      target="_blank"
      rel="noreferrer"
      className="group relative flex flex-col rounded-2xl border border-line bg-panel/50 overflow-hidden hover:border-accent/60 hover:bg-panel/80 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_40px_-12px_rgba(59,130,246,0.35)]"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-black/60">
        <img
          src={project.image}
          alt={displayName}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-panel via-panel/20 to-transparent pointer-events-none" />
        {project.liveUrl && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.open(project.liveUrl, "_blank", "noopener,noreferrer");
            }}
            className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-accent/40 hover:bg-accent-soft transition-colors"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            Live Site
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        )}
        {!project.liveUrl && (
          <div className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-bg/70 backdrop-blur border border-line/80 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowUpRight className="h-4 w-4 text-ink" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-6">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold tracking-tight leading-tight">
            {displayName}
          </h3>
          <p className="text-sm text-accent/90 mt-1 font-mono">
            {project.tagline}
          </p>
        </div>

        <p className="text-sm leading-relaxed text-ink/80">
          {project.description}
        </p>

        {project.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {project.tags.map((t) => (
              <span
                key={t}
                className="rounded-md bg-accent/10 border border-accent/20 px-2 py-0.5 text-[11px] font-mono text-accent/90"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center gap-4 text-xs text-mute font-mono pt-3 border-t border-line/50">
          <span className="truncate">
            {project.owner}/<span className="text-ink/70">{project.repo}</span>
          </span>
          <div className="ml-auto flex items-center gap-4">
            {project.language && (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-accent" />
                {project.language}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Star className="h-3 w-3" />
              {project.stars}
            </span>
            <span className="inline-flex items-center gap-1">
              <GitFork className="h-3 w-3" />
              {project.forks}
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}
