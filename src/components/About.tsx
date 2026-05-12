import { expertise, profile } from "../data";

export default function About() {
  return (
    <section id="about" className="border-t border-line">
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="grid sm:grid-cols-[180px_1fr] gap-8">
          <h2 className="text-sm font-mono text-mute uppercase tracking-widest">
            About
          </h2>
          <div>
            <p className="text-lg leading-relaxed">
              {profile.education}. Focused on building reliable, performant
              backends and quantitative systems — from market data ingestion to
              ML-driven strategy execution.
            </p>
            <ul className="mt-8 flex flex-wrap gap-2">
              {expertise.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full border border-line bg-panel/60 px-3 py-1 text-xs font-mono text-mute"
                >
                  {tag}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
