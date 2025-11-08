"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { createMemory } from "@/lib/api"
import { Loader2, Plus, AlertCircle, Link2, Copy, GitMerge } from "lucide-react"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE

interface Suggestion {
  from: string
  to: string
  type: "DUPLICATE" | "EXTEND" | "DERIVE"
  similarity: number
  reason: string
}

interface SimilarMemory {
  id: string
  content: string
  similarity: number
}

interface MemoryFormProps {
  onSuccess?: () => void
}

export default function MemoryForm({ onSuccess }: MemoryFormProps) {
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [similarMemories, setSimilarMemories] = useState<SimilarMemory[]>([])
  const [newMemoryId, setNewMemoryId] = useState<string | null>(null)

  // Check for similar memories when user types (debounced)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (content.trim().length < 10) {
        setSimilarMemories([])
        return
      }

      setChecking(true)
      try {
        const response = await fetch(`${API_BASE}/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: content.trim(),
            k: 3,
            with_graph: false,
            similarity_threshold: 0.75
          })
        })

        if (response.ok) {
          const data = await response.json()
          setSimilarMemories(data.results || [])
        }
      } catch (err) {
        console.error("Failed to check for similar memories:", err)
      } finally {
        setChecking(false)
      }
    }, 800) // Debounce for 800ms

    return () => clearTimeout(timer)
  }, [content])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    setLoading(true)
    setError(null)

    try {
      const result = await createMemory(content.trim())
      setNewMemoryId(result.id)
      setContent("")
      
      // If we found the new ID, check for suggestions
      if (result.id && similarMemories.length > 0) {
        // Automatically suggest links for the new memory
        setTimeout(() => {
          checkSuggestions(result.id)
        }, 500)
      }
      
      onSuccess?.()
    } catch (err: any) {
      console.error("Failed to create memory:", err)
      setError(err.message || "Failed to create memory")
    } finally {
      setLoading(false)
    }
  }

  const checkSuggestions = async (memoryId: string) => {
    try {
      const response = await fetch(`${API_BASE}/memories/${memoryId}/suggest`, {
        method: "POST"
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log("Suggestions for new memory:", data.suggestions)
        // You could show these suggestions in a toast or notification
      }
    } catch (err) {
      console.error("Failed to get suggestions:", err)
    }
  }

  const handleMerge = async (targetId: string) => {
    if (!newMemoryId) return

    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/memories/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_id: newMemoryId,
          target_id: targetId
        })
      })

      if (response.ok) {
        alert("Memories merged successfully!")
        setSimilarMemories([])
        onSuccess?.()
      }
    } catch (err: any) {
      setError(err.message || "Failed to merge memories")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateLink = async (targetId: string, linkType: "EXTEND" | "DERIVE") => {
    if (!newMemoryId) return

    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/graph/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: newMemoryId,
          to: targetId,
          type: linkType
        })
      })

      if (response.ok) {
        alert(`${linkType} relationship created!`)
        setSimilarMemories([])
        onSuccess?.()
      }
    } catch (err: any) {
      setError(err.message || "Failed to create relationship")
    } finally {
      setLoading(false)
    }
  }

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.92) return "text-red-500"
    if (similarity >= 0.85) return "text-yellow-500"
    return "text-blue-500"
  }

  const getSuggestionType = (similarity: number) => {
    if (similarity >= 0.92) return { type: "DUPLICATE", label: "Possible Duplicate", icon: Copy }
    if (similarity >= 0.85) return { type: "EXTEND", label: "Could Extend", icon: Link2 }
    return { type: "DERIVE", label: "Could Derive", icon: GitMerge }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="content">Memory Content</Label>
              {checking && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Checking for similar memories...
                </span>
              )}
            </div>
            <Textarea
              id="content"
              placeholder="Enter your memory content here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Describe the information you want to store as a memory node. Similar memories will be detected automatically.
            </p>
          </div>

          {/* Similar Memories Warning */}
          {similarMemories.length > 0 && (
            <div className="space-y-3">
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">Similar Memories Found</span>
                  <Badge variant="secondary" className="text-xs">
                    {similarMemories.length}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  {similarMemories.map((similar) => {
                    const suggestion = getSuggestionType(similar.similarity)
                    const SuggestionIcon = suggestion.icon
                    
                    return (
                      <div
                        key={similar.id}
                        className="border rounded-lg p-3 bg-muted/50 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm leading-relaxed">
                              {similar.content}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getSimilarityColor(similar.similarity)}`}
                            >
                              {(similar.similarity * 100).toFixed(0)}% match
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <SuggestionIcon className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {suggestion.label}
                          </span>
                        </div>
                        
                        <div className="text-xs text-muted-foreground">
                          <code className="bg-muted px-1 py-0.5 rounded">
                            {similar.id.slice(0, 12)}...
                          </code>
                        </div>
                      </div>
                    )
                  })}
                </div>
                
                <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-md p-2">
                  💡 <strong>Tip:</strong> If this is a duplicate, you can merge after creation. Otherwise, relationships will be suggested automatically.
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="submit"
              disabled={loading || !content.trim()}
              className="min-w-[120px]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  {similarMemories.length > 0 ? 'Create Anyway' : 'Create Memory'}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
