const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

export async function createMemory(content: string) {
  const res = await fetch(`${API_BASE}/memories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`createMemory failed: ${res.status} ${text}`);
  }
  return res.json();
}

export async function searchMemories(query: string, withGraph = true) {
  const res = await fetch(`${API_BASE}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      k: 5,
      with_graph: withGraph,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`searchMemories failed: ${res.status} ${text}`);
  }
  return res.json();
}