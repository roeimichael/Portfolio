import { useEffect, useState } from "react";

export type GhRepo = {
  owner: string;
  repo: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  link: string;
};

type State = {
  data: GhRepo[] | null;
  loading: boolean;
  error: string | null;
};

type RawRepo = {
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  html_url: string;
};

async function fetchOne(owner: string, repo: string): Promise<GhRepo> {
  const r = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
  if (!r.ok) throw new Error(`${repo}: HTTP ${r.status}`);
  const j = (await r.json()) as RawRepo;
  return {
    owner,
    repo: j.name,
    description: j.description ?? "",
    language: j.language ?? "",
    stars: j.stargazers_count,
    forks: j.forks_count,
    link: j.html_url,
  };
}

export function useGithubRepos(owner: string, repos: string[]): State {
  const [state, setState] = useState<State>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState({ data: null, loading: true, error: null });

    Promise.all(repos.map((r) => fetchOne(owner, r)))
      .then((data) => {
        if (cancelled) return;
        setState({ data, loading: false, error: null });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Failed to load repos";
        setState({ data: null, loading: false, error: msg });
      });

    return () => {
      cancelled = true;
    };
  }, [owner, repos.join(",")]);

  return state;
}
