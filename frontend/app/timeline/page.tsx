"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/components/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Clock, 
  GitBranch, 
  ArrowRight, 
  Plus, 
  Edit, 
  Link2,
  Filter,
  RefreshCw
} from "lucide-react"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE

interface TimelineEvent {
  id: string
  content: string
  status: string
  version: number
  at: string
  op: string | null
  from_id: string | null
  to_id: string | null
}

export default function TimelinePage() {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [limit, setLimit] = useState("50")

  const fetchTimeline = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit,
        ...(statusFilter !== "all" && { status: statusFilter })
      })
      
      const response = await fetch(`${API_BASE}/timeline?${params}`)
      if (response.ok) {
        const data = await response.json()
        setEvents(data)
      }
    } catch (error) {
      console.error("Failed to fetch timeline:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTimeline()
  }, [statusFilter, limit])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 60) {
      return `${diffMins}m ago`
    } else if (diffHours < 24) {
      return `${diffHours}h ago`
    } else if (diffDays < 7) {
      return `${diffDays}d ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const getOperationIcon = (op: string | null) => {
    switch (op) {
      case 'UPDATE':
        return <Edit className="h-4 w-4 text-blue-500" />
      case 'EXTEND':
        return <Plus className="h-4 w-4 text-green-500" />
      case 'DERIVE':
        return <GitBranch className="h-4 w-4 text-purple-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getOperationColor = (op: string | null) => {
    switch (op) {
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'EXTEND':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'DERIVE':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'outdated':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Timeline</h1>
            <p className="text-muted-foreground">
              Track memory evolution and relationship changes over time
            </p>
          </div>
          
          <Button onClick={fetchTimeline} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Status Filter</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active Only</SelectItem>
                    <SelectItem value="outdated">Outdated Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Limit</label>
                <Select value={limit} onValueChange={setLimit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25 events</SelectItem>
                    <SelectItem value="50">50 events</SelectItem>
                    <SelectItem value="100">100 events</SelectItem>
                    <SelectItem value="200">200 events</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Memory Timeline
              <Badge variant="secondary">{events.length} events</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground">Loading timeline...</div>
              </div>
            ) : events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No events found</h3>
                <p className="text-muted-foreground">
                  No timeline events match your current filters
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {events.map((event, index) => (
                    <div key={`${event.id}-${index}`} className="relative">
                      {/* Timeline line */}
                      {index < events.length - 1 && (
                        <div className="absolute left-6 top-12 w-0.5 h-8 bg-border" />
                      )}
                      
                      <div className="flex items-start gap-4">
                        {/* Timeline dot */}
                        <div className="flex-shrink-0 w-12 h-12 rounded-full border-2 bg-background flex items-center justify-center">
                          {getOperationIcon(event.op)}
                        </div>
                        
                        {/* Event content */}
                        <div className="flex-1 min-w-0">
                          <div className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium leading-relaxed">
                                  {event.content}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant="outline" 
                                  className={getStatusColor(event.status)}
                                >
                                  {event.status}
                                </Badge>
                                {event.op && (
                                  <Badge 
                                    variant="outline" 
                                    className={getOperationColor(event.op)}
                                  >
                                    {event.op}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDate(event.at)}
                                </div>
                                <div className="flex items-center gap-1">
                                  <GitBranch className="h-3 w-3" />
                                  v{event.version}
                                </div>
                                <code className="bg-muted px-1 py-0.5 rounded">
                                  {event.id.slice(0, 8)}...
                                </code>
                              </div>
                              
                              {/* Relationship info */}
                              {event.from_id && event.to_id && (
                                <div className="flex items-center gap-1 text-xs">
                                  <code className="bg-muted px-1 py-0.5 rounded">
                                    {event.from_id.slice(0, 6)}...
                                  </code>
                                  <ArrowRight className="h-3 w-3" />
                                  <code className="bg-muted px-1 py-0.5 rounded">
                                    {event.to_id.slice(0, 6)}...
                                  </code>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
