"use client";

import { useState } from "react";
import { createMemory } from "@/lib/api";

export default function MemoryForm() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await createMemory(content);
      setResp(data);
      setContent("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 border rounded-xl bg-white/80 backdrop-blur">
      <h2 className="text-lg font-semibold mb-2">Create memory</h2>
      <form onSubmit={onSubmit} className="space-y-2">
        <textarea
          className="w-full border rounded p-2 text-sm"
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="e.g. The 2024 tariff update replaced the 2022 schedule"
          required
        />
        <button
          disabled={loading}
          className="px-3 py-1 rounded bg-black text-white text-sm disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save memory"}
        </button>
      </form>
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
      {resp && (
        <pre className="mt-3 text-xs bg-slate-100 p-2 rounded max-h-40 overflow-auto">
          {JSON.stringify(resp, null, 2)}
        </pre>
      )}
    </div>
  );
}
