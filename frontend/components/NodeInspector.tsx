"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

export default function NodeInspector({ node }: { node: any | null }) {
  const [fullNode, setFullNode] = useState<any | null>(null);

  useEffect(() => {
    if (!node) {
      setFullNode(null);
      return;
    }
    fetch(`${API_BASE}/memories/${node.id}`)
      .then((r) => r.json())
      .then((data) => setFullNode(data))
      .catch((e) => console.error(e));
  }, [node]);

  if (!node) {
    return (
      <div className="border rounded p-3 text-sm text-slate-400">
        Select a node to inspect
      </div>
    );
  }

  const mem = fullNode?.memory ?? node;
  const subgraph = fullNode?.graph ?? { nodes: [], edges: [] };

  return (
    <div className="border rounded p-3 space-y-3">
      <div>
        <div className="text-xs text-slate-400 mb-1">{mem.id}</div>
        <div className="font-medium">{mem.content}</div>
        {mem.status ? (
          <div className="text-[10px] uppercase text-slate-400">
            {mem.status} {mem.version ? `(v${mem.version})` : ""}
          </div>
        ) : null}
      </div>

      <div>
        <h4 className="text-xs font-semibold mb-1">Connected memories</h4>
        <ul className="space-y-1 max-h-32 overflow-auto text-sm">
          {subgraph.nodes
            ?.filter((n: any) => n.id !== mem.id)
            .map((n: any) => (
              <li key={n.id} className="flex items-center gap-2">
                <span className="text-xs text-slate-400">{n.id}</span>
                <span className="truncate">{n.content}</span>
              </li>
            ))}
        </ul>
      </div>

      {/* Placeholder for action buttons */}
      <div className="flex gap-2">
        <button className="text-xs bg-slate-900 text-white px-2 py-1 rounded">
          Extend
        </button>
        <button className="text-xs bg-slate-100 px-2 py-1 rounded">
          Update
        </button>
      </div>
    </div>
  );
}