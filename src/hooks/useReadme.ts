import { useEffect, useState } from "react";

type State = { excerpt: string | null; loading: boolean };

const CACHE = new Map<string, string>();

function stripMarkdown(md: string): string {
  return md
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/^\s*#.*$/gm, "")
    .replace(/^\s*>.*$/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/[*_`~]/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function firstSentences(text: string, max = 240): string {
  const clean = text.trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "));
  return (lastStop > 80 ? cut.slice(0, lastStop + 1) : cut.trim()) + "…";
}

async function fetchReadme(owner: string, repo: string): Promise<string | null> {
  const branches = ["main", "master"];
  for (const branch of branches) {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.md`;
    const res = await fetch(url);
    if (res.ok) return res.text();
  }
  return null;
}

export function useReadme(
  owner: string,
  repo: string,
  skip = false
): State {
  const [state, setState] = useState<State>({
    excerpt: null,
    loading: !skip,
  });

  useEffect(() => {
    if (skip) {
      setState({ excerpt: null, loading: false });
      return;
    }

    const key = `${owner}/${repo}`;
    if (CACHE.has(key)) {
      setState({ excerpt: CACHE.get(key)!, loading: false });
      return;
    }

    let cancelled = false;
    setState({ excerpt: null, loading: true });

    fetchReadme(owner, repo)
      .then((md) => {
        if (cancelled) return;
        const excerpt = md ? firstSentences(stripMarkdown(md)) : "";
        CACHE.set(key, excerpt);
        setState({ excerpt, loading: false });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ excerpt: "", loading: false });
      });

    return () => {
      cancelled = true;
    };
  }, [owner, repo, skip]);

  return state;
}
