import { ArrowRight, FileText, Github, Linkedin, Mail, MapPin } from "lucide-react";
import { profile } from "../data";
import VantaGlobe from "./VantaGlobe";

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden min-h-[100svh] flex items-center">
      <VantaGlobe />
      <div className="absolute inset-0 bg-bg/40 pointer-events-none z-[1]" />

      <div className="relative z-[2] w-full max-w-5xl mx-auto px-6 py-20">
        <div className="animate-fade-up">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-mute mb-6 border border-line rounded-full px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-soft animate-pulse" />
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
            <a
              href={profile.resume}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm font-medium hover:border-accent/70 hover:text-white transition-colors"
            >
              <FileText className="h-4 w-4 text-accent-soft group-hover:text-white transition-colors" />
              Résumé
            </a>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-2.5 text-sm">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel/70 backdrop-blur px-3.5 py-1.5 text-mute">
              <MapPin className="h-4 w-4 text-accent-soft" />
              {profile.location}
            </span>
            <a
              href={`mailto:${profile.email}`}
              className="group inline-flex items-center gap-2 rounded-full border border-line bg-panel/70 backdrop-blur px-3.5 py-1.5 text-ink/90 hover:border-accent/70 hover:bg-accent/10 hover:text-white transition-colors"
            >
              <Mail className="h-4 w-4 text-accent-soft group-hover:text-white transition-colors" />
              {profile.email}
            </a>
            <a
              href={profile.github}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-2 rounded-full border border-line bg-panel/70 backdrop-blur px-3.5 py-1.5 text-ink/90 hover:border-accent/70 hover:bg-accent/10 hover:text-white transition-colors"
            >
              <Github className="h-4 w-4 text-accent-soft group-hover:text-white transition-colors" />
              GitHub
            </a>
            <a
              href={profile.linkedin}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-2 rounded-full border border-line bg-panel/70 backdrop-blur px-3.5 py-1.5 text-ink/90 hover:border-accent/70 hover:bg-accent/10 hover:text-white transition-colors"
            >
              <Linkedin className="h-4 w-4 text-accent-soft group-hover:text-white transition-colors" />
              LinkedIn
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
