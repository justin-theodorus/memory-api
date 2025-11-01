"use client";

import { useState } from "react";
import { searchMemories } from "@/lib/api";
import GraphView from "./GraphView";

export default function SearchForm() {
  const [query, setQuery] = useState("tariff update 2024");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await searchMemories(query, true);
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 border rounded-xl bg-white/80 backdrop-blur space-y-3">
      <h2 className="text-lg font-semibold">Search memories</h2>
      <form onSubmit={onSearch} className="flex gap-2">
        <input
            className="flex-1 border rounded px-2 py-1 text-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search text..."
        />
        <button
          disabled={loading}
          className="px-3 py-1 rounded bg-slate-800 text-white text-sm disabled:opacity-50"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {result && (
        <div className="space-y-3">
          <div>
            <h3 className="font-medium text-sm mb-1">Results</h3>
            <ul className="space-y-1">
              {result.results?.map((r: any) => (
                <li key={r.id} className="text-sm border rounded p-2 bg-slate-50">
                  <div className="font-mono text-xs text-slate-500">{r.id}</div>
                  <div>{r.content}</div>
                  <div className="text-xs text-slate-500">
                    similarity: {r.similarity?.toFixed(3)}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* graph */}
          <div>
            <h3 className="font-medium text-sm mb-1">Graph</h3>
            <GraphView data={result.graph} />
          </div>

          {/* raw */}
          <details className="text-xs">
            <summary className="cursor-pointer">Raw JSON</summary>
            <pre className="bg-slate-100 p-2 rounded max-h-60 overflow-auto text-xs">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
