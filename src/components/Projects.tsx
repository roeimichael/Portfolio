import { ArrowUpRight } from "lucide-react";
import { profile, featuredProjects } from "../data";
import ProjectCard from "./ProjectCard";

export default function Projects() {
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

        <div className="grid sm:grid-cols-2 gap-4">
          {featuredProjects.map((p) => (
            <ProjectCard key={p.repo} project={p} />
          ))}
        </div>

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
