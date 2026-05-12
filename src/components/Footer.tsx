import { profile } from "../data";

export default function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-mute font-mono">
        <span>
          © {new Date().getFullYear()} {profile.name}
        </span>
        <span>Built with React + Tailwind</span>
      </div>
    </footer>
  );
}
