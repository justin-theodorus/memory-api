"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, Loader2, Settings } from "lucide-react"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE

export type MemorySearchResult = {
  id: string
  content: string
  metadata: any
  similarity: number
}

export type MemoryGraph = {
  nodes?: Array<{
    id: string
    content?: string
    status?: string
    version?: number
  }>
  edges?: Array<{
    id?: string
    from: string
    to: string
    type?: string
  }>
}

export type SearchResponse = {
  query: string
  results: MemorySearchResult[]
  graph?: MemoryGraph
}

type SearchFormProps = {
  onSearchComplete?: (payload: SearchResponse) => void
}

export default function SearchForm({ onSearchComplete }: SearchFormProps) {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [k, setK] = useState("5")
  const [withGraph, setWithGraph] = useState(true)
  const [showAdvanced, setShowAdvanced] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`${API_BASE}/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: query.trim(),
          k: parseInt(k),
          with_graph: withGraph,
        }),
      })

      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`)
      }

      const data: SearchResponse = await res.json()
      onSearchComplete?.(data)
    } catch (err: any) {
      console.error(err)
      setError(err.message ?? "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="search-query">Search Query</Label>
          <div className="flex gap-2">
            <Input
              id="search-query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search memories using natural language..."
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={loading || !query.trim()}
              className="min-w-[100px]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Advanced Options Toggle */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs"
          >
            <Settings className="mr-1 h-3 w-3" />
            Advanced Options
          </Button>
          {withGraph && (
            <Badge variant="secondary" className="text-xs">
              Graph enabled
            </Badge>
          )}
        </div>

        {/* Advanced Options */}
        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
            <div className="space-y-2">
              <Label htmlFor="result-count">Results Count</Label>
              <Select value={k} onValueChange={setK}>
                <SelectTrigger id="result-count">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 results</SelectItem>
                  <SelectItem value="5">5 results</SelectItem>
                  <SelectItem value="10">10 results</SelectItem>
                  <SelectItem value="20">20 results</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="graph-toggle">Graph Visualization</Label>
              <Select 
                value={withGraph ? "enabled" : "disabled"} 
                onValueChange={(value) => setWithGraph(value === "enabled")}
              >
                <SelectTrigger id="graph-toggle">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enabled">Enabled</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
            {error}
          </div>
        )}
      </form>
    </div>
  )
}
