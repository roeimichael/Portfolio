export type RepoOverride = {
  displayName?: string;
  tagline?: string;
  description?: string;
  image?: string;
  tags?: string[];
  liveUrl?: string;
};

export const featuredRepos: string[] = [
  "Israele",
  "AppScanner",
  "cartographer",
  "ContextAnalyzerTerminal",
  "claude-code-statusline",
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
    liveUrl: "https://www.israel-e.com/",
  },
  AppScanner: {
    tagline: "Real-time apartment listing aggregator",
    description:
      "Scans Yad2 and Onmap every 15 minutes for the Israeli rental market, ranks listings against your preferences, and pushes Telegram alerts with WhatsApp deep-links to the agent.",
    image: "/projects/appscanner.jpg",
    tags: ["Next.js", "Telegram", "Scraping"],
    liveUrl: "https://appscanner-liart.vercel.app/",
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

export const aboutBio = [
  "Data Scientist and Data Engineer with deep experience in machine learning and algorithmic trading research. Currently completing my M.Sc. in Data Engineering at Bar-Ilan, with a thesis on neural network optimization under multi-constraint learning applied to stock market data.",
  "Tech-Lead background with a strong Python foundation and end-to-end ownership of ML pipelines — from market data ingestion and back-testing frameworks to DNN-driven strategy execution and portfolio construction with risk constraints.",
];

export type Experience = {
  role: string;
  org: string;
  period: string;
  bullets: string[];
};

export const experience: Experience[] = [
  {
    role: "Software Developer",
    org: "Israeli Navy (IDF)",
    period: "2023 — 2026",
    bullets: [
      "Built backend architecture for operational mapping systems serving hundreds of Navy users.",
      "Reduced data retrieval time by 20% through architecture optimization.",
    ],
  },
  {
    role: "Quant Developer",
    org: "Odysseus Hedge Fund",
    period: "2021 — 2023",
    bullets: [
      "Developed an automated trading engine driving a large portion of the fund's portfolio allocation.",
      "Wrote high-performance correlation and cointegration algorithms across stock pairs for hedging strategies.",
    ],
  },
  {
    role: "Independent Quantitative Research",
    org: "Self-directed",
    period: "2023 — Present",
    bullets: [
      "Building an algorithmic trading system and back-testing framework over 10+ years of S&P 500 data.",
      "Designing DNNs for market prediction and portfolio algorithms with risk constraints.",
    ],
  },
];

export type Education = {
  degree: string;
  school: string;
  period: string;
  notes: string[];
};

export const education: Education[] = [
  {
    degree: "M.Sc. in Data Engineering",
    school: "Bar-Ilan University",
    period: "2024 — Present",
    notes: [
      "Thesis: Neural network optimization with multi-constraint learning on stock market data.",
      "Focus: Deep Learning, Optimization Theory, Multimodal Neural Networks.",
      "GPA: 96",
    ],
  },
  {
    degree: "B.Sc. in Computer Engineering",
    school: "Bar-Ilan University",
    period: "2019 — 2023",
    notes: [
      "Graduated with Honors. GPA: 91.",
      "\"100's Club\" Scholarship awarded twice for academic excellence.",
    ],
  },
];

export type SkillGroup = { label: string; items: string[] };

export const skillGroups: SkillGroup[] = [
  {
    label: "Core",
    items: ["Python (Expert)", "Git", "Linux"],
  },
  {
    label: "ML / Deep Learning",
    items: ["PyTorch", "Scikit-learn", "CUDA", "Multimodal NNs"],
  },
  {
    label: "Data",
    items: ["Pandas", "NumPy", "SciPy", "Matplotlib / Seaborn"],
  },
  {
    label: "Quant",
    items: [
      "Back-testing Frameworks",
      "Time Series Analysis",
      "Portfolio Optimization",
    ],
  },
  {
    label: "Infra",
    items: [
      "Docker",
      "Jenkins",
      "Multiprocessing & Multithreading",
    ],
  },
];

export type DevProject = {
  name: string;
  tagline: string;
  description: string;
  url: string;
  image: string;
  tags: string[];
};

export const inDevelopment: DevProject[] = [
  {
    name: "Huginn Trading",
    tagline: "Algorithmic trading platform — backtest & monitor strategies",
    description:
      "End-to-end platform for designing, back-testing, and monitoring algorithmic trading strategies on equities. Private repo (proprietary trading logic), live at huginntrading.com.",
    url: "https://huginntrading.com",
    image: "https://huginntrading.com/og-image.png",
    tags: ["React", "TypeScript", "Python", "Quant"],
  },
];
