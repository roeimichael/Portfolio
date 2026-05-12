import { ArrowUpRight, Github } from "lucide-react";
import { profile, featuredRepos } from "../data";
import { useGithubRepos } from "../hooks/useGithubRepos";
import ProjectCard from "./ProjectCard";

export default function Projects() {
  const { data, loading, error } = useGithubRepos(
    profile.githubUser,
    featuredRepos
  );

  return (
    <section id="projects" className="border-t border-line">
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="mb-10">
          <h2 className="text-sm font-mono text-mute uppercase tracking-widest mb-3">
            Featured Projects
          </h2>
          <p className="text-2xl sm:text-3xl font-semibold tracking-tight max-w-2xl">
            A selection from{" "}
            <a
              href={profile.github}
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              @{profile.githubUser}
            </a>
            .
          </p>
        </div>

        {loading && <ProjectsSkeleton />}

        {error && !loading && (
          <div className="rounded-xl border border-line bg-panel/40 p-6 text-sm text-mute">
            Could not load pinned repos: {error}
          </div>
        )}

        {!loading && !error && data && data.length === 0 && (
          <div className="rounded-xl border border-line bg-panel/40 p-8 text-center">
            <Github className="mx-auto h-8 w-8 text-mute mb-3" />
            <p className="text-ink/85 font-medium mb-1">No pinned repos yet.</p>
            <p className="text-sm text-mute">
              Pin repos on your GitHub profile and they'll show here
              automatically.
            </p>
          </div>
        )}

        {!loading && !error && data && data.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-4">
            {data.map((repo) => (
              <ProjectCard key={repo.repo} repo={repo} />
            ))}
          </div>
        )}

        <div className="mt-10 text-center">
          <a
            href={profile.github}
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

function ProjectsSkeleton() {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-line bg-panel/40 p-6 animate-pulse"
        >
          <div className="h-4 w-32 bg-line rounded mb-4" />
          <div className="h-3 w-full bg-line rounded mb-2" />
          <div className="h-3 w-3/4 bg-line rounded mb-6" />
          <div className="flex gap-3">
            <div className="h-3 w-16 bg-line rounded" />
            <div className="h-3 w-10 bg-line rounded" />
            <div className="h-3 w-10 bg-line rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
