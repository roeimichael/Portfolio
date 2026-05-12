import { ArrowRight, Github, Linkedin, Mail, MapPin } from "lucide-react";
import { profile } from "../data";

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-50 pointer-events-none" />
      <div className="absolute inset-0 glow pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-28 sm:pt-28 sm:pb-32">
        <div className="animate-fade-up">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-mute mb-6 border border-line rounded-full px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Open to opportunities
          </div>
          <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.05]">
            {profile.name}
          </h1>
          <p className="mt-3 text-xl sm:text-2xl text-mute font-light">
            {profile.role}
          </p>
          <p className="mt-8 max-w-2xl text-base sm:text-lg text-ink/80 leading-relaxed">
            {profile.tagline}
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <a
              href="#projects"
              className="group inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
            >
              View Projects
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="#contact"
              className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm font-medium hover:border-mute transition-colors"
            >
              Get in touch
            </a>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-mute">
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {profile.location}
            </span>
            <a
              href={`mailto:${profile.email}`}
              className="inline-flex items-center gap-2 hover:text-ink transition-colors"
            >
              <Mail className="h-4 w-4" />
              {profile.email}
            </a>
            <a
              href={profile.github}
              className="inline-flex items-center gap-2 hover:text-ink transition-colors"
              target="_blank"
              rel="noreferrer"
            >
              <Github className="h-4 w-4" />
              GitHub
            </a>
            <a
              href={profile.linkedin}
              className="inline-flex items-center gap-2 hover:text-ink transition-colors"
              target="_blank"
              rel="noreferrer"
            >
              <Linkedin className="h-4 w-4" />
              LinkedIn
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
