"use client";

import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

export type MemorySearchResult = {
  id: string;
  content: string;
  metadata: any;
  similarity: number;
};

export type MemoryGraph = {
  nodes?: Array<{
    id: string;
    content?: string;
    status?: string;
    version?: number;
  }>;
  edges?: Array<{
    id?: string;
    from: string;
    to: string;
    type?: string;
  }>;
};

export type SearchResponse = {
  query: string;
  results: MemorySearchResult[];
  graph?: MemoryGraph;
};

type SearchFormProps = {
  onSearchComplete?: (payload: SearchResponse) => void;
};

export default function SearchForm({ onSearchComplete }: SearchFormProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          k: 5,
          with_graph: true,
        }),
      });

      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }

      const data: SearchResponse = await res.json();
      onSearchComplete?.(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search memories…"
        className="flex-1 border rounded px-3 py-2"
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-slate-900 text-white px-4 py-2 rounded"
      >
        {loading ? "Searching..." : "Search"}
      </button>
      {error ? <p className="text-red-500 text-sm">{error}</p> : null}
    </form>
  );
}
