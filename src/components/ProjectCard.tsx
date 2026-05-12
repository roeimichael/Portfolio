import { ArrowUpRight, Star, GitFork } from "lucide-react";
import { useReadme } from "../hooks/useReadme";
import { repoOverrides } from "../data";
import type { GhRepo } from "../hooks/useGithubRepos";

export default function ProjectCard({ repo }: { repo: GhRepo }) {
  const override = repoOverrides[repo.repo] ?? {};
  const { excerpt, loading } = useReadme(repo.owner, repo.repo);

  const displayName = override.displayName ?? repo.repo;
  const description = override.description ?? excerpt ?? repo.description;
  const tagline = override.tagline ?? repo.description;
  const tags = override.tags;

  return (
    <a
      href={repo.link}
      target="_blank"
      rel="noreferrer"
      className="group relative flex flex-col rounded-2xl border border-line bg-panel/50 overflow-hidden hover:border-accent/60 hover:bg-panel/80 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_40px_-12px_rgba(124,92,255,0.35)]"
    >
      {override.image && (
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-black/60">
          <img
            src={override.image}
            alt={displayName}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-panel via-panel/20 to-transparent pointer-events-none" />
          <div className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-bg/70 backdrop-blur border border-line/80 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowUpRight className="h-4 w-4 text-ink" />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold tracking-tight leading-tight">
              {displayName}
            </h3>
            {tagline && (
              <p className="text-sm text-accent/90 mt-1 font-mono">
                {tagline}
              </p>
            )}
          </div>
          {!override.image && (
            <ArrowUpRight className="h-5 w-5 shrink-0 text-mute transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
          )}
        </div>

        <p className="text-sm leading-relaxed text-ink/80 min-h-[5rem]">
          {loading && !override.description ? (
            <span className="inline-block space-y-2">
              <span className="block h-3 w-full bg-line/60 rounded animate-pulse" />
              <span className="block h-3 w-5/6 bg-line/60 rounded animate-pulse" />
              <span className="block h-3 w-4/6 bg-line/60 rounded animate-pulse" />
            </span>
          ) : (
            description || "—"
          )}
        </p>

        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
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
            {repo.owner}/<span className="text-ink/70">{repo.repo}</span>
          </span>
          <div className="ml-auto flex items-center gap-4">
            {repo.language && (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-accent" />
                {repo.language}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Star className="h-3 w-3" />
              {repo.stars}
            </span>
            <span className="inline-flex items-center gap-1">
              <GitFork className="h-3 w-3" />
              {repo.forks}
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}
