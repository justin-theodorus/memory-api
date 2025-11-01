"use client";

type GraphData = {
  nodes: Array<{
    id: string;
    content?: string | null;
    status?: string | null;
    version?: number | null;
  }>;
  edges: Array<{
    id?: string;
    source: string;
    target: string;
    type?: string;
  }>;
};

export default function GraphView({ data }: { data: GraphData | null }) {
  if (!data) {
    return (
      <div className="rounded-lg border bg-slate-50 p-4 text-sm text-slate-500">
        No graph to display.
      </div>
    );
  }

  
  const nodeMap = new Map<string, (typeof data.nodes)[number]>();
  for (const n of data.nodes ?? []) {
    nodeMap.set(n.id, n);
  }
  const uniqueNodes = Array.from(nodeMap.values());

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Nodes list */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Nodes ({uniqueNodes.length})</h3>
        <ul className="space-y-1 max-h-40 overflow-auto">
            {uniqueNodes.map((n) => (
              <li key={n.id} className="border rounded px-2 py-1">
                <div className="font-mono text-xs">{n.id}</div>
                <div className="text-slate-600 text-sm line-clamp-2">
                  {n.content ?? "—"}
                </div>
                {n.status ? (
                  <div className="text-[10px] uppercase text-slate-400">
                    {n.status} {n.version ? `(v${n.version})` : ""}
                  </div>
                ) : null}
              </li>
            ))}
        </ul>
      </div>

      {/* Edges list */}
      <div>
        <h3 className="text-sm font-semibold mb-2">
          Edges ({data.edges?.length ?? 0})
        </h3>
        <ul className="space-y-1 max-h-40 overflow-auto">
          {(data.edges ?? []).map((e, idx) => (
            <li key={e.id ?? `${e.source}->${e.target}-${idx}`} className="border rounded px-2 py-1 text-sm">
              <div className="font-mono text-xs">
                {e.source} → {e.target}
              </div>
              {e.type ? (
                <div className="text-[10px] uppercase text-slate-400">
                  {e.type}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}