"use client";

import { useState } from "react";
import SearchForm, { SearchResponse } from "@/components/SearchForm";
import GraphView from "@/components/GraphView";
import Neo4jGraphView, { type MemoryNode } from "@/components/Neo4jGraphView";
import NodeInspector from "@/components/NodeInspector";

export default function HomePage() {
  const [data, setData] = useState<SearchResponse | null>(null);
  const [selectedNode, setSelectedNode] = useState<MemoryNode | null>(null);

  return (
    <main className="max-w-5xl mx-auto py-8 space-y-6">
      <h1 className="text-2xl font-semibold">Memory Graph Explorer</h1>

      <SearchForm
        onSearchComplete={(payload: SearchResponse) => {
          setData(payload);
        }}
      />

      {/* Results */}
      <section>
        <h2 className="font-semibold mb-2">Results</h2>
        <ul className="space-y-2">
          {data?.results?.map((r) => (
            <li key={r.id} className="border rounded px-3 py-2">
              <div className="font-mono text-sm">{r.id}</div>
              <div>{r.content}</div>
              <div className="text-xs text-slate-500">
                similarity: {r.similarity.toFixed(3)}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Graph Visualization - Neo4j Style */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <h2 className="font-semibold mb-2">Graph Visualization</h2>
          <Neo4jGraphView
            nodes={data?.graph?.nodes ?? []}
            edges={data?.graph?.edges ?? []}
            onNodeClick={(n) => {
              console.log("Node clicked:", n)
              setSelectedNode(n)
            }}
          />
        </div>
        <div>
          <h2 className="font-semibold mb-2">Node Inspector</h2>
          <NodeInspector node={selectedNode} />
        </div>
      </section>

      {/* Graph Details (list view) */}
      <section>
        <h2 className="font-semibold mb-2">Graph (list)</h2>
        <GraphView
          data={{
            nodes: data?.graph?.nodes ?? [],
            edges: (data?.graph?.edges ?? [])
              .filter((e) => e.from && e.to)
              .map((e) => ({
                id: e.id,
                source: e.from!,
                target: e.to!,
                type: e.type,
              })),
          }}
        />
      </section>
    </main>
  );
}
