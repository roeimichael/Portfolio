import { Mail, Phone, Linkedin } from "lucide-react";
import { profile } from "../data";

export default function Contact() {
  return (
    <section id="contact" className="border-t border-line">
      <div className="max-w-5xl mx-auto px-6 py-24">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-sm font-mono text-mute uppercase tracking-widest mb-4">
            Contact
          </h2>
          <p className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Looking for a Data Scientist, Backend Engineer, or Quant Researcher?
          </p>
          <p className="mt-5 text-mute">
            Interested in collaborating or discussing opportunities? Feel free
            to reach out.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href={`mailto:${profile.email}`}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
            >
              <Mail className="h-4 w-4" />
              {profile.email}
            </a>
            <a
              href={`tel:${profile.phone.replace(/[^+\d]/g, "")}`}
              className="group inline-flex items-center gap-2 rounded-full border border-line bg-panel/60 px-6 py-3 text-sm font-medium text-ink/90 hover:border-accent/70 hover:bg-accent/10 hover:text-white transition-colors"
            >
              <Phone className="h-4 w-4 text-accent-soft group-hover:text-white transition-colors" />
              {profile.phone}
            </a>
            <a
              href={profile.linkedin}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-2 rounded-full border border-line bg-panel/60 px-6 py-3 text-sm font-medium text-ink/90 hover:border-accent/70 hover:bg-accent/10 hover:text-white transition-colors"
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
