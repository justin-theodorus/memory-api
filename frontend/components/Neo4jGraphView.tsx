"use client"

import React, { useCallback, useRef, useState } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import ForceGraph2D to avoid SSR issues (window is not defined)
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-80 rounded border border-slate-800 bg-slate-950 flex items-center justify-center text-slate-400">
      Loading graph visualization...
    </div>
  ),
})

export type MemoryNode = {
  id: string
  content?: string | null
  status?: string
  version?: number
}

export type MemoryEdge = {
  id?: string
  from: string
  to: string
  type?: string
}

type Props = {
  nodes: MemoryNode[]
  edges: MemoryEdge[]
  onNodeClick?: (node: MemoryNode) => void
}

type GraphNode = MemoryNode & {
  x?: number
  y?: number
  vx?: number
  vy?: number
}

type GraphLink = {
  source: string | GraphNode
  target: string | GraphNode
  type?: string
}

const Neo4jGraphView: React.FC<Props> = ({ nodes, edges, onNodeClick }) => {
  const fgRef = useRef<any>(null)
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)

  // Transform data for react-force-graph
  const graphData = {
    nodes: nodes.map(n => ({ ...n })),
    links: edges
      .filter(e => e.from && e.to)
      .map(e => ({
        source: e.from,
        target: e.to,
        type: e.type,
      })),
  }

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      onNodeClick?.(node)
      // Zoom to node
      if (fgRef.current) {
        fgRef.current.centerAt(node.x, node.y, 1000)
        fgRef.current.zoom(2, 1000)
      }
    },
    [onNodeClick]
  )

  const handleNodeHover = useCallback((node: GraphNode | null) => {
    setHoveredNode(node)
  }, [])

  // Custom node rendering (Neo4j style)
  const paintNode = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const label = node.content?.slice(0, 30) || node.id.slice(0, 8)
      const fontSize = 12 / globalScale
      const nodeRadius = 8

      // Determine color based on status (Neo4j Bloom style)
      let nodeColor = '#94a3b8' // default gray
      if (node.status === 'ACTIVE' || node.status === 'active') {
        nodeColor = '#06b6d4' // cyan (active)
      }

      // Highlight on hover
      if (hoveredNode?.id === node.id) {
        ctx.beginPath()
        ctx.arc(node.x!, node.y!, nodeRadius + 3, 0, 2 * Math.PI)
        ctx.fillStyle = 'rgba(6, 182, 212, 0.3)'
        ctx.fill()
      }

      // Draw node circle
      ctx.beginPath()
      ctx.arc(node.x!, node.y!, nodeRadius, 0, 2 * Math.PI)
      ctx.fillStyle = nodeColor
      ctx.fill()

      // Node border
      ctx.strokeStyle = '#0f172a'
      ctx.lineWidth = 2 / globalScale
      ctx.stroke()

      // Draw label
      ctx.font = `${fontSize}px Inter, system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#e2e8f0'
      ctx.fillText(label, node.x!, node.y! - nodeRadius - 8)

      // Draw version badge if exists
      if (node.version) {
        ctx.font = `${fontSize * 0.7}px Inter, system-ui, sans-serif`
        ctx.fillStyle = '#64748b'
        ctx.fillText(`v${node.version}`, node.x!, node.y! + nodeRadius + 8)
      }
    },
    [hoveredNode]
  )

  // Custom link rendering with arrows (Neo4j style)
  const paintLink = useCallback(
    (link: GraphLink, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const source = link.source as GraphNode
      const target = link.target as GraphNode

      if (!source?.x || !source?.y || !target?.x || !target?.y) return

      // Calculate arrow position
      const dx = target.x - source.x
      const dy = target.y - source.y
      const angle = Math.atan2(dy, dx)
      const nodeRadius = 8

      // Draw line
      ctx.beginPath()
      ctx.moveTo(source.x, source.y)
      ctx.lineTo(target.x, target.y)
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)'
      ctx.lineWidth = 2 / globalScale
      ctx.stroke()

      // Draw arrow
      const arrowLength = 10 / globalScale
      const arrowWidth = 6 / globalScale
      const arrowX = target.x - Math.cos(angle) * nodeRadius
      const arrowY = target.y - Math.sin(angle) * nodeRadius

      ctx.beginPath()
      ctx.moveTo(arrowX, arrowY)
      ctx.lineTo(
        arrowX - arrowLength * Math.cos(angle - Math.PI / 6),
        arrowY - arrowLength * Math.sin(angle - Math.PI / 6)
      )
      ctx.lineTo(
        arrowX - arrowLength * Math.cos(angle + Math.PI / 6),
        arrowY - arrowLength * Math.sin(angle + Math.PI / 6)
      )
      ctx.closePath()
      ctx.fillStyle = 'rgba(56, 189, 248, 0.8)'
      ctx.fill()

      // Draw relationship type label
      if (link.type) {
        const midX = (source.x + target.x) / 2
        const midY = (source.y + target.y) / 2
        const fontSize = 9 / globalScale

        ctx.font = `${fontSize}px Inter, system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#64748b'
        ctx.fillText(link.type.toUpperCase(), midX, midY - 5)
      }
    },
    []
  )

  if (nodes.length === 0) {
    return (
      <div className="w-full h-80 rounded border border-slate-800 bg-slate-950 flex items-center justify-center text-slate-400">
        No graph data to display
      </div>
    )
  }

  return (
    <div className="w-full h-80 rounded border border-slate-800 bg-slate-950 overflow-hidden relative">
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        nodeId="id"
        nodeLabel={(node: any) => {
          const n = node as GraphNode
          return `${n.content || n.id}\nStatus: ${n.status || 'N/A'}\nVersion: ${n.version || 'N/A'}`
        }}
        nodeCanvasObject={paintNode as any}
        linkCanvasObject={paintLink as any}
        onNodeClick={handleNodeClick as any}
        onNodeHover={handleNodeHover as any}
        backgroundColor="#020617"
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleSpeed={0.005}
        d3VelocityDecay={0.3}
        cooldownTicks={100}
        onEngineStop={() => {
          // Fit graph to view after initial layout
          if (fgRef.current) {
            fgRef.current.zoomToFit(400, 50)
          }
        }}
      />
      
      {/* Info overlay */}
      <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-sm rounded px-3 py-2 text-xs text-slate-300 border border-slate-700">
        <div className="font-semibold mb-1">Graph Info</div>
        <div>Nodes: {nodes.length}</div>
        <div>Edges: {edges.length}</div>
        {hoveredNode && (
          <div className="mt-2 pt-2 border-t border-slate-700">
            <div className="font-semibold">Hovered:</div>
            <div className="truncate max-w-[200px]">
              {hoveredNode.content || hoveredNode.id}
            </div>
          </div>
        )}
      </div>

      {/* Controls info */}
      <div className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur-sm rounded px-3 py-2 text-xs text-slate-400 border border-slate-700">
        <div>🖱️ Drag to pan</div>
        <div>🔍 Scroll to zoom</div>
        <div>👆 Click node to focus</div>
      </div>
    </div>
  )
}

export default Neo4jGraphView

