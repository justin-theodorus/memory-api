import MemoryForm from "@/components/MemoryForm";
import SearchForm from "@/components/SearchForm";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-100">
      <div className="max-w-5xl mx-auto py-10 space-y-6">
        <h1 className="text-2xl font-bold">Memory Graph Dashboard</h1>
        <p className="text-slate-600 text-sm">
          Create a memory → it goes to FastAPI → Supabase + Neo4j. Then search and see the graph.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MemoryForm />
          <SearchForm />
        </div>
      </div>
    </main>
  );
}
