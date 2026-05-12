export type RepoOverride = {
  displayName?: string;
  tagline?: string;
  description?: string;
  image?: string;
  tags?: string[];
};

export const featuredRepos: string[] = [
  "ContextAnalyzerTerminal",
  "cartographer",
  "claude-code-statusline",
  "AppScanner",
  "Israele",
  "PokerOCR",
];

export const repoOverrides: Record<string, RepoOverride> = {
  PokerOCR: {
    tagline: "Omaha poker vision tool",
    description:
      "Reads cards from live online-poker screenshots across preflop, flop, turn and river, with calibration tools, color-based suit detection, and full Omaha game-state tracking.",
    image: "/projects/pokerOCR.png",
    tags: ["Python", "OCR", "Tesseract"],
  },
  ContextAnalyzerTerminal: {
    displayName: "CAT — Context Analyzer Terminal",
    tagline: "Per-tool-call context profiler for Claude Code",
    description:
      "Hooks into Claude Code sessions to attribute token spend to each individual tool call, learns a rolling baseline, and alerts in real time when a single call blows up the context window.",
    image: "/projects/cat.jpg",
    tags: ["Python", "Claude Code", "LLM Tooling"],
  },
  "claude-code-statusline": {
    displayName: "Claude Code Statusline",
    tagline: "Drop-in informative status bar",
    description:
      "One Python file that replaces Claude Code's minimal status line with a richer bar: model, context usage, session cost, rate-limit windows, git state, virtualenv, and live dev ports — auto-detected, zero per-repo config.",
    image: "/projects/claude-bar.jpg",
    tags: ["Python", "Claude Code", "DX"],
  },
  cartographer: {
    displayName: "Cartographer",
    tagline: "Codebase auditor for Claude Code",
    description:
      "Claude Code plugin that builds a dependency and call graph for a repo, segments it by domain, runs ~17 specialist reviewers in parallel waves, and produces a prioritized P0–P3 refactor backlog with optional gated fixes.",
    image: "/projects/cartographer.jpg",
    tags: ["Python", "Claude Code", "Plugin"],
  },
  Israele: {
    tagline: "Wordle-style geo game (Israel edition)",
    description:
      "Five-round map game over ~3.3k Israeli places — cities, kibbutzim, mountains, archaeological sites — with English + Hebrew prompts, satellite map clicks, and a quadratic distance score modified by category multipliers.",
    image: "/projects/israelle.jpg",
    tags: ["Python", "FastAPI", "MapLibre"],
  },
  AppScanner: {
    tagline: "Real-time apartment listing aggregator",
    description:
      "Scans Yad2 and Onmap every 15 minutes for the Israeli rental market, ranks listings against your preferences, and pushes Telegram alerts with WhatsApp deep-links to the agent.",
    image: "/projects/appscanner.jpg",
    tags: ["Next.js", "Telegram", "Scraping"],
  },
};

export const profile = {
  name: "Roei Michael",
  role: "Data Scientist & Backend Engineer",
  tagline:
    "Building high-performance systems at the intersection of data science, algorithmic trading, and scalable backend architecture.",
  location: "Petah Tikva, Israel",
  education: "M.Sc. in Data Engineering",
  email: "roeym111@gmail.com",
  githubUser: "roeimichael",
  github: "https://github.com/roeimichael",
  linkedin: "https://www.linkedin.com/",
  resume: "/Roei_Michael_Resume.pdf",
};

export const expertise: string[] = [
  "Data Science",
  "Backend Development",
  "Data Engineering",
  "Algorithmic Trading",
  "Machine Learning",
  "Software Engineering",
  "Bioinformatics",
  "Risk Management",
];
