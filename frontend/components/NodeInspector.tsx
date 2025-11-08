"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  GitBranch, 
  Clock, 
  Database, 
  Plus, 
  Edit, 
  Link,
  Eye,
  AlertCircle
} from "lucide-react"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE

interface NodeInspectorProps {
  node: any | null
}

export default function NodeInspector({ node }: NodeInspectorProps) {
  const [fullNode, setFullNode] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!node) {
      setFullNode(null)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    fetch(`${API_BASE}/memories/${node.id}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to fetch: ${r.status}`)
        return r.json()
      })
      .then((data) => setFullNode(data))
      .catch((e) => {
        console.error(e)
        setError(e.message)
      })
      .finally(() => setLoading(false))
  }, [node])

  if (!node) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Eye className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Node Selected</h3>
          <p className="text-sm text-muted-foreground">
            Click on a node in the graph or search results to inspect its details
          </p>
        </CardContent>
      </Card>
    )
  }

  const mem = fullNode?.memory ?? node
  const subgraph = fullNode?.graph ?? { nodes: [], edges: [] }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'outdated':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown'
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="space-y-4">
      {/* Main Node Info */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Memory Details</CardTitle>
            {mem.status && (
              <Badge variant="outline" className={getStatusColor(mem.status)}>
                {mem.status}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="text-sm text-muted-foreground">Loading details...</div>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          ) : (
            <>
              {/* Content */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Content</div>
                <p className="text-sm leading-relaxed">{mem.content}</p>
              </div>

              <Separator />

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <div className="font-medium text-muted-foreground">ID</div>
                  <code className="bg-muted px-2 py-1 rounded text-xs">
                    {mem.id?.slice(0, 8)}...
                  </code>
                </div>
                <div className="space-y-1">
                  <div className="font-medium text-muted-foreground">Version</div>
                  <div className="flex items-center gap-1">
                    <GitBranch className="h-3 w-3" />
                    v{mem.version || 1}
                  </div>
                </div>
                {mem.created_at && (
                  <div className="col-span-2 space-y-1">
                    <div className="font-medium text-muted-foreground">Created</div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(mem.created_at)}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Connected Memories */}
      {subgraph.nodes && subgraph.nodes.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" />
              Connected Memories
              <Badge variant="secondary" className="text-xs">
                {subgraph.nodes.length - 1}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-32">
              <div className="space-y-2">
                {subgraph.nodes
                  ?.filter((n: any) => n.id !== mem.id)
                  .map((n: any) => (
                    <div
                      key={n.id}
                      className="flex items-start gap-2 p-2 rounded-lg border bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {n.content || 'No content'}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <code className="text-xs bg-background px-1 py-0.5 rounded">
                            {n.id?.slice(0, 6)}...
                          </code>
                          {n.status && (
                            <Badge variant="outline" className="text-xs h-4">
                              {n.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="text-xs">
              <Plus className="mr-1 h-3 w-3" />
              Extend
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              <Edit className="mr-1 h-3 w-3" />
              Update
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              <Link className="mr-1 h-3 w-3" />
              Link
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              <GitBranch className="mr-1 h-3 w-3" />
              Derive
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}