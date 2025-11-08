"use client"

import { useState } from "react"
import DashboardLayout from "@/components/DashboardLayout"
import SearchForm, { SearchResponse } from "@/components/SearchForm"
import Neo4jGraphView, { type MemoryNode } from "@/components/Neo4jGraphView"
import NodeInspector from "@/components/NodeInspector"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

export default function HomePage() {
  const [data, setData] = useState<SearchResponse | null>(null)
  const [selectedNode, setSelectedNode] = useState<MemoryNode | null>(null)

  return (
    <DashboardLayout>
      <div className="flex h-full">
        {/* Main Content Area */}
        <div className="flex-1 p-6 space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Search & Explore</h1>
            <p className="text-muted-foreground">
              Discover memories and their relationships through semantic search
            </p>
          </div>

          {/* Search Section */}
          <Card>
            <CardHeader>
              <CardTitle>Semantic Search</CardTitle>
            </CardHeader>
            <CardContent>
              <SearchForm
                onSearchComplete={(payload: SearchResponse) => {
                  setData(payload)
                  setSelectedNode(null) // Reset selection on new search
                }}
              />
            </CardContent>
          </Card>

          {/* Results Section */}
          {data?.results && data.results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Search Results
                  <Badge variant="secondary">{data.results.length} found</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.results.map((result) => (
                    <div
                      key={result.id}
                      className="border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => {
                        const node = data.graph?.nodes?.find(n => n.id === result.id)
                        if (node) setSelectedNode(node)
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-relaxed">
                            {result.content}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {result.id.slice(0, 8)}...
                            </code>
                            <Badge variant="outline" className="text-xs">
                              {(result.similarity * 100).toFixed(1)}% match
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Graph Visualization */}
          {data?.graph && (data.graph.nodes?.length ?? 0) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Graph Visualization</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Neo4jGraphView
                  nodes={data.graph.nodes ?? []}
                  edges={data.graph.edges ?? []}
                  onNodeClick={(node) => {
                    console.log("Node clicked:", node)
                    setSelectedNode(node)
                  }}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Sidebar - Node Inspector */}
        <div className="w-80 border-l bg-card/50 p-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Node Inspector</h2>
              <p className="text-sm text-muted-foreground">
                Select a node to view details
              </p>
            </div>
            <Separator />
            <NodeInspector node={selectedNode} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
