"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/components/DashboardLayout"
import Neo4jGraphView, { type MemoryNode } from "@/components/Neo4jGraphView"
import NodeInspector from "@/components/NodeInspector"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Network, 
  Search, 
  RefreshCw, 
  Filter,
  Maximize2,
  Eye,
  EyeOff
} from "lucide-react"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE

interface GraphData {
  nodes: MemoryNode[]
  edges: Array<{
    id?: string
    from: string
    to: string
    type?: string
  }>
}

export default function GraphPage() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] })
  const [selectedNode, setSelectedNode] = useState<MemoryNode | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showInspector, setShowInspector] = useState(true)
  const [statusFilter, setStatusFilter] = useState("all")

  const fetchGraphData = async (query?: string) => {
    setLoading(true)
    try {
      if (query && query.trim()) {
        // Search-based graph
        const response = await fetch(`${API_BASE}/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: query.trim(),
            k: 20,
            with_graph: true,
          }),
        })
        
        if (response.ok) {
          const data = await response.json()
          setGraphData({
            nodes: data.graph?.nodes || [],
            edges: data.graph?.edges || []
          })
        }
      } else {
        // Get recent memories for general graph view
        const response = await fetch(`${API_BASE}/timeline?limit=100`)
        if (response.ok) {
          const timelineData = await response.json()
          
          // Convert timeline to graph format
          const nodes = timelineData.map((event: any) => ({
            id: event.id,
            content: event.content,
            status: event.status,
            version: event.version
          }))
          
          // For now, we'll show nodes without edges from timeline
          // In a real implementation, you might want a dedicated graph endpoint
          setGraphData({ nodes, edges: [] })
        }
      }
    } catch (error) {
      console.error("Failed to fetch graph data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGraphData()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchGraphData(searchQuery)
  }

  const filteredNodes = graphData.nodes.filter(node => {
    if (statusFilter === "all") return true
    return node.status?.toLowerCase() === statusFilter.toLowerCase()
  })

  const filteredGraphData = {
    nodes: filteredNodes,
    edges: graphData.edges.filter(edge => 
      filteredNodes.some(n => n.id === edge.from) && 
      filteredNodes.some(n => n.id === edge.to)
    )
  }

  return (
    <DashboardLayout>
      <div className="flex h-full">
        {/* Main Graph Area */}
        <div className="flex-1 flex flex-col">
          {/* Controls Header */}
          <div className="border-b bg-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                <h1 className="text-xl font-semibold">Graph Explorer</h1>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInspector(!showInspector)}
                >
                  {showInspector ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showInspector ? "Hide" : "Show"} Inspector
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchGraphData(searchQuery)}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex gap-4">
              <form onSubmit={handleSearch} className="flex gap-2 flex-1">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search to explore related subgraph..."
                  className="flex-1"
                />
                <Button type="submit" disabled={loading}>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </form>
              
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="outdated">Outdated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Badge variant="secondary">{filteredGraphData.nodes.length}</Badge>
                nodes
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="secondary">{filteredGraphData.edges.length}</Badge>
                edges
              </div>
              {searchQuery && (
                <div className="flex items-center gap-1">
                  Query: <code className="bg-muted px-1 py-0.5 rounded text-xs">{searchQuery}</code>
                </div>
              )}
            </div>
          </div>

          {/* Graph Visualization */}
          <div className="flex-1 relative">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                <div className="text-muted-foreground">Loading graph...</div>
              </div>
            ) : filteredGraphData.nodes.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <Network className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Graph Data</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery 
                    ? "No results found for your search query" 
                    : "Search for memories to explore their relationships"
                  }
                </p>
                {!searchQuery && (
                  <Button onClick={() => fetchGraphData()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Load Recent Memories
                  </Button>
                )}
              </div>
            ) : (
              <div className="h-full">
                <Neo4jGraphView
                  nodes={filteredGraphData.nodes}
                  edges={filteredGraphData.edges}
                  onNodeClick={(node) => {
                    console.log("Node clicked:", node)
                    setSelectedNode(node)
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Node Inspector */}
        {showInspector && (
          <div className="w-80 border-l bg-card/50 p-4">
            <NodeInspector node={selectedNode} />
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
