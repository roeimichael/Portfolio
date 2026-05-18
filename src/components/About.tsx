import { Briefcase, GraduationCap, Sparkles } from "lucide-react";
import { aboutBio, experience, education, skillGroups } from "../data";

export default function About() {
  return (
    <section id="about" className="border-t border-line">
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="grid sm:grid-cols-[180px_1fr] gap-8 sm:gap-12">
          <h2 className="text-sm font-mono text-mute uppercase tracking-widest">
            About
          </h2>

          <div className="space-y-12">
            <div className="space-y-4">
              {aboutBio.map((p, i) => (
                <p
                  key={i}
                  className="text-lg leading-relaxed text-ink/90"
                >
                  {p}
                </p>
              ))}
            </div>

            <div>
              <h3 className="flex items-center gap-2 text-xs font-mono text-mute uppercase tracking-widest mb-5">
                <Briefcase className="h-3.5 w-3.5" />
                Experience
              </h3>
              <ol className="space-y-6">
                {experience.map((e) => (
                  <li
                    key={`${e.org}-${e.period}`}
                    className="relative pl-5 border-l border-line/80"
                  >
                    <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-accent" />
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <p className="font-medium">
                        {e.role}{" "}
                        <span className="text-mute font-normal">
                          · {e.org}
                        </span>
                      </p>
                      <span className="text-xs font-mono text-mute">
                        {e.period}
                      </span>
                    </div>
                    <ul className="mt-2 space-y-1 text-sm text-ink/80 leading-relaxed">
                      {e.bullets.map((b, i) => (
                        <li key={i}>— {b}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <h3 className="flex items-center gap-2 text-xs font-mono text-mute uppercase tracking-widest mb-5">
                <GraduationCap className="h-3.5 w-3.5" />
                Education
              </h3>
              <ol className="space-y-6">
                {education.map((ed) => (
                  <li
                    key={ed.degree}
                    className="relative pl-5 border-l border-line/80"
                  >
                    <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-accent" />
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <p className="font-medium">
                        {ed.degree}{" "}
                        <span className="text-mute font-normal">
                          · {ed.school}
                        </span>
                      </p>
                      <span className="text-xs font-mono text-mute">
                        {ed.period}
                      </span>
                    </div>
                    <ul className="mt-2 space-y-1 text-sm text-ink/80 leading-relaxed">
                      {ed.notes.map((n, i) => (
                        <li key={i}>— {n}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <h3 className="flex items-center gap-2 text-xs font-mono text-mute uppercase tracking-widest mb-5">
                <Sparkles className="h-3.5 w-3.5" />
                Skills
              </h3>
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-5">
                {skillGroups.map((g) => (
                  <div key={g.label}>
                    <p className="text-xs font-mono text-accent/90 mb-2 uppercase tracking-wider">
                      {g.label}
                    </p>
                    <ul className="flex flex-wrap gap-1.5">
                      {g.items.map((s) => (
                        <li
                          key={s}
                          className="rounded-md border border-line bg-panel/60 px-2.5 py-1 text-xs font-mono text-ink/85"
                        >
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
