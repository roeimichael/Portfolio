export type FeaturedProject = {
  owner: string;
  repo: string;
  displayName?: string;
  tagline: string;
  description: string;
  image: string;
  tags: string[];
  language: string;
  stars: number;
  forks: number;
  link: string;
  liveUrl?: string;
};

export const featuredProjects: FeaturedProject[] = [
  {
    owner: "roeimichael",
    repo: "Israele",
    tagline: "Wordle-style geo game (Israel edition)",
    description:
      "Five-round map game over ~3.3k Israeli places — cities, kibbutzim, mountains, archaeological sites — with English + Hebrew prompts, satellite map clicks, and a quadratic distance score modified by category multipliers.",
    image: "/projects/israelle.jpg",
    tags: ["Python", "FastAPI", "MapLibre"],
    language: "JavaScript",
    stars: 0,
    forks: 0,
    link: "https://github.com/roeimichael/Israele",
    liveUrl: "https://www.israel-e.com/",
  },
  {
    owner: "roeimichael",
    repo: "AppScanner",
    tagline: "Real-time apartment listing aggregator",
    description:
      "Scans Yad2 and Onmap every 15 minutes for the Israeli rental market, ranks listings against your preferences, and pushes Telegram alerts with WhatsApp deep-links to the agent.",
    image: "/projects/appscanner.jpg",
    tags: ["Next.js", "Telegram", "Scraping"],
    language: "TypeScript",
    stars: 0,
    forks: 0,
    link: "https://github.com/roeimichael/AppScanner",
    liveUrl: "https://appscanner-liart.vercel.app/",
  },
  {
    owner: "roeimichael",
    repo: "cartographer",
    displayName: "Cartographer",
    tagline: "Codebase auditor for Claude Code",
    description:
      "Claude Code plugin that builds a dependency and call graph for a repo, segments it by domain, runs ~17 specialist reviewers in parallel waves, and produces a prioritized P0–P3 refactor backlog with optional gated fixes.",
    image: "/projects/cartographer.jpg",
    tags: ["Python", "Claude Code", "Plugin"],
    language: "Python",
    stars: 0,
    forks: 0,
    link: "https://github.com/roeimichael/cartographer",
  },
  {
    owner: "roeimichael",
    repo: "ContextAnalyzerTerminal",
    displayName: "CAT — Context Analyzer Terminal",
    tagline: "Per-tool-call context profiler for Claude Code",
    description:
      "Hooks into Claude Code sessions to attribute token spend to each individual tool call, learns a rolling baseline, and alerts in real time when a single call blows up the context window.",
    image: "/projects/cat.jpg",
    tags: ["Python", "Claude Code", "LLM Tooling"],
    language: "Python",
    stars: 14,
    forks: 4,
    link: "https://github.com/roeimichael/ContextAnalyzerTerminal",
  },
  {
    owner: "roeimichael",
    repo: "claude-code-statusline",
    displayName: "Claude Code Statusline",
    tagline: "Drop-in informative status bar",
    description:
      "One Python file that replaces Claude Code's minimal status line with a richer bar: model, context usage, session cost, rate-limit windows, git state, virtualenv, and live dev ports — auto-detected, zero per-repo config.",
    image: "/projects/claude-bar.jpg",
    tags: ["Python", "Claude Code", "DX"],
    language: "Python",
    stars: 2,
    forks: 0,
    link: "https://github.com/roeimichael/claude-code-statusline",
  },
  {
    owner: "roeimichael",
    repo: "PokerOCR",
    tagline: "Omaha poker vision tool",
    description:
      "Reads cards from live online-poker screenshots across preflop, flop, turn and river, with calibration tools, color-based suit detection, and full Omaha game-state tracking.",
    image: "/projects/pokerOCR.png",
    tags: ["Python", "OCR", "Tesseract"],
    language: "Python",
    stars: 0,
    forks: 0,
    link: "https://github.com/roeimichael/PokerOCR",
  },
];

export const profile = {
  name: "Roei Michael",
  role: "Data Engineer & Machine Learning Developer",
  tagline:
    "Building high-performance backend architectures, automated data pipelines, and agentic AI systems — specialized in LLM technologies, RAG, and financial/portfolio optimization.",
  location: "Petah Tikva, Israel",
  education: "M.Sc. in Data Engineering",
  email: "roeym111@gmail.com",
  phone: "+972-54-7304570",
  githubUser: "roeimichael",
  github: "https://github.com/roeimichael",
  linkedin: "https://www.linkedin.com/in/roei-michael",
  resume: "/docs/Roei_Michael_Resume.pdf",
  transcript: "/docs/Roei_Michael_Transcript.pdf",
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
  "Data Engineer and Machine Learning Developer with a proven record of building high-performance backend architectures, automated data pipelines, and personal agent systems. Specialized in LLM technologies, RAG pipelines, and financial/portfolio optimization.",
  "Currently leading AI development at Expose Global — shipping multimodal agents, ingestion pipelines, and a custom RAG engine — while completing my M.Sc. in Data Engineering at Bar-Ilan, with core research in deep learning optimization under multi-constraint learning on stock market data.",
  "Strong Python foundation with end-to-end ownership of ML and data pipelines, backed by a quant and military-systems background: from market-data ingestion and back-testing frameworks to DNN-driven strategy execution and operational mapping systems serving hundreds of users.",
];

export type Experience = {
  role: string;
  org: string;
  period: string;
  bullets: string[];
};

export const experience: Experience[] = [
  {
    role: "Lead AI Developer",
    org: "Expose Global",
    period: "2026 — Present",
    bullets: [
      "Exi AI Agent: deployed a multimodal agent system orchestrating automated user assistance, target-audience analysis, and social analytics pipelines.",
      "Data Pipelines: built automated scraping and ingestion pipelines for daily trend harvesting and weekly analytics syncing across multiple platforms.",
      "RAG Engine: implemented a vector pipeline using Google embeddings, dual-stage chunking with tagging, and a custom relevance-based caching mechanism to minimize database overhead.",
    ],
  },
  {
    role: "Software Developer",
    org: "Israeli Navy (IDF)",
    period: "2023 — 2026",
    bullets: [
      "Developed backend architecture for operational mapping systems serving hundreds of Navy users.",
      "Reduced data retrieval time by 20% through architecture optimization.",
    ],
  },
  {
    role: "Quant Developer",
    org: "Odysseus Hedge Fund",
    period: "2021 — 2023",
    bullets: [
      "Developed an automated trading engine driving a large portion of the fund's portfolio position allocation.",
      "Wrote high-performance correlation and cointegration algorithms across stock pairs for hedging strategies.",
    ],
  },
];

export type Education = {
  degree: string;
  school: string;
  period: string;
  gpa: string;
  notes: string[];
};

export const education: Education[] = [
  {
    degree: "M.Sc. in Data Engineering",
    school: "Bar-Ilan University",
    period: "2024 — Present",
    gpa: "96 / 100",
    notes: [
      "Thesis: Neural network optimization with multi-constraint learning on stock market data.",
      "Focus: Deep Learning, Optimization Theory, Multimodal Neural Networks.",
    ],
  },
  {
    degree: "B.Sc. in Computer Engineering",
    school: "Bar-Ilan University",
    period: "2019 — 2023",
    gpa: "91 / 100",
    notes: [
      "Graduated with Honors.",
      "\"100's Club\" Scholarship awarded twice for academic excellence.",
    ],
  },
];

export type SkillGroup = { label: string; items: string[] };

export const skillGroups: SkillGroup[] = [
  {
    label: "AI / LLM",
    items: [
      "Multi-Agent Systems",
      "Agentic Workflows",
      "RAG Pipelines",
      "Vector Embeddings",
      "LLM Orchestration",
      "Prompt Engineering",
      "Semantic Chunking & Tagging",
      "Google Embeddings",
    ],
  },
  {
    label: "ML / Deep Learning",
    items: [
      "PyTorch",
      "Deep Learning",
      "Scikit-learn",
      "CUDA",
      "Computer Vision Pipelines",
      "Multimodal NNs",
    ],
  },
  {
    label: "Data",
    items: [
      "Pandas",
      "NumPy",
      "SciPy",
      "Data Ingestion Pipelines",
      "Time Series Analysis",
      "Matplotlib / Seaborn",
    ],
  },
  {
    label: "Quant",
    items: [
      "Back-testing Frameworks",
      "Portfolio Optimization",
      "Correlation & Cointegration",
    ],
  },
  {
    label: "Core / Infra",
    items: [
      "Python (Expert)",
      "Git",
      "Linux",
      "Docker",
      "Jenkins",
      "Multiprocessing & Multithreading",
      "Supabase",
      "Railway",
      "Vercel",
    ],
  },
];

export type Volunteer = { role: string; description: string };

export const volunteering: Volunteer[] = [
  {
    role: "Math Tutor",
    description: "Tutored high-school students in Israel's periphery.",
  },
  {
    role: "Student Mentor",
    description:
      "Mentored freshmen through the university's “Soft Landing” integration program.",
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
