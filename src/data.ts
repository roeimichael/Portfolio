import {
  LineChart,
  TrendingUp,
  GitBranch,
  Layers,
  Dna,
  Gamepad2,
  type LucideIcon,
} from "lucide-react";

export type Project = {
  title: string;
  tagline: string;
  summary: string;
  bullets: string[];
  tags: string[];
  href: string;
  icon: LucideIcon;
};

export const profile = {
  name: "Roei Michael",
  role: "Data Scientist & Backend Engineer",
  tagline:
    "Building high-performance systems at the intersection of data science, algorithmic trading, and scalable backend architecture.",
  location: "Petah Tikva, Israel",
  education: "M.Sc. in Data Engineering",
  email: "roeym111@gmail.com",
  github: "https://github.com/",
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

export const projects: Project[] = [
  {
    title: "GeminiTrader",
    tagline: "Crypto Trading Bot",
    summary:
      "Automated cryptocurrency trading bot for the Gemini exchange with live execution and risk management.",
    bullets: [
      "Real-time market data and order execution via Gemini API",
      "ML model integration for price prediction",
      "Built-in position sizing and risk controls",
    ],
    tags: ["Python", "ML", "Trading", "API"],
    href: "https://github.com/",
    icon: TrendingUp,
  },
  {
    title: "StocksProject",
    tagline: "Quantitative Stock Analysis",
    summary:
      "Comprehensive stock analysis pipeline with technical indicators and ML features.",
    bullets: [
      "Technical analysis and feature engineering for stocks",
      "Interactive visualization and backtesting",
      "Model evaluation and visualization pipeline",
    ],
    tags: ["Python", "Pandas", "ML"],
    href: "https://github.com/",
    icon: LineChart,
  },
  {
    title: "Stocks Correlation Engine",
    tagline: "Pairs Trading & Hedging",
    summary:
      "High-performance correlation analysis across stock universes for pairs trading and hedging.",
    bullets: [
      "Computes correlation matrices across large stock universes",
      "Optimized for millions of pair calculations",
      "Supports statistical arbitrage strategy development",
    ],
    tags: ["Numpy", "Performance", "Quant"],
    href: "https://github.com/",
    icon: GitBranch,
  },
  {
    title: "StrategyBuilder",
    tagline: "Trading Strategy Framework",
    summary:
      "Framework for building, testing, and deploying algorithmic trading strategies.",
    bullets: [
      "Modular strategy development and backtesting",
      "Customizable algorithmic trading strategies",
      "Production-ready strategy execution pipeline",
    ],
    tags: ["Python", "Backtesting", "Framework"],
    href: "https://github.com/",
    icon: Layers,
  },
  {
    title: "DNA Sequence Classification",
    tagline: "Bioinformatics + Deep Learning",
    summary:
      "Machine learning models for DNA sequence classification and analysis.",
    bullets: [
      "Deep learning models for sequence classification",
      "Feature extraction from biological sequences",
    ],
    tags: ["PyTorch", "Bioinformatics", "DL"],
    href: "https://github.com/",
    icon: Dna,
  },
  {
    title: "ScrabbleGame",
    tagline: "Algorithmic Word Game",
    summary:
      "Full-stack implementation of Scrabble with AI opponent and optimal word finding.",
    bullets: [
      "Dictionary-based optimal word finding algorithm",
      "Interactive gameplay with AI opponent",
      "Complete game logic and scoring system",
    ],
    tags: ["Algorithms", "Full-stack", "AI"],
    href: "https://github.com/",
    icon: Gamepad2,
  },
];
