"use client"

import React, { useCallback, useRef, useState, useEffect } from 'react'
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
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)

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

  // Warm up the simulation for better initial layout
  useEffect(() => {
    if (fgRef.current) {
      // Set initial zoom level
      fgRef.current.zoom(1.2)
      
      // Run simulation to stabilize the layout
      fgRef.current.d3Force('charge')?.strength(-300) // Increased repulsion
      fgRef.current.d3Force('link')?.distance(80) // Closer links
      fgRef.current.d3Force('center')?.strength(0.5)
    }
  }, [nodes.length])

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      onNodeClick?.(node)
      // Center on node without zooming (removed the zoom call that was causing issues)
      if (fgRef.current && node.x && node.y) {
        fgRef.current.centerAt(node.x, node.y, 800)
      }
    },
    [onNodeClick]
  )

  const handleNodeHover = useCallback((node: GraphNode | null, prevNode: GraphNode | null) => {
    setHoveredNode(node)
    
    // Update tooltip position based on canvas coordinates
    if (node && fgRef.current) {
      const coords = fgRef.current.graph2ScreenCoords(node.x, node.y)
      if (coords) {
        setTooltipPos({ x: coords.x, y: coords.y })
      }
    } else {
      setTooltipPos(null)
    }
  }, [])

  // Custom node rendering (Neo4j style)
  const paintNode = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const label = node.content?.slice(0, 40) || node.id.slice(0, 8)
      const fontSize = 11 / globalScale
      const nodeRadius = 12 // Larger nodes for better visibility

      // Determine color based on status (Neo4j Bloom style)
      let nodeColor = '#94a3b8' // default gray
      if (node.status === 'ACTIVE' || node.status === 'active') {
        nodeColor = '#06b6d4' // cyan (active)
      } else if (node.status === 'outdated') {
        nodeColor = '#71717a' // darker gray for outdated
      }

      // Highlight on hover - larger glow effect
      if (hoveredNode?.id === node.id) {
        // Outer glow
        ctx.beginPath()
        ctx.arc(node.x!, node.y!, nodeRadius + 6, 0, 2 * Math.PI)
        ctx.fillStyle = 'rgba(6, 182, 212, 0.25)'
        ctx.fill()
        
        // Inner glow
        ctx.beginPath()
        ctx.arc(node.x!, node.y!, nodeRadius + 3, 0, 2 * Math.PI)
        ctx.fillStyle = 'rgba(6, 182, 212, 0.4)'
        ctx.fill()
      }

      // Draw node circle
      ctx.beginPath()
      ctx.arc(node.x!, node.y!, nodeRadius, 0, 2 * Math.PI)
      ctx.fillStyle = nodeColor
      ctx.fill()

      // Node border - thicker on hover
      ctx.strokeStyle = hoveredNode?.id === node.id ? '#38bdf8' : '#0f172a'
      ctx.lineWidth = (hoveredNode?.id === node.id ? 3 : 2) / globalScale
      ctx.stroke()

      // Draw label - always visible
      ctx.font = `${fontSize}px Inter, system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#e2e8f0'
      ctx.fillText(label, node.x!, node.y! - nodeRadius - 10)

      // Draw version badge if exists
      if (node.version) {
        ctx.font = `${fontSize * 0.75}px Inter, system-ui, sans-serif`
        ctx.fillStyle = '#94a3b8'
        ctx.fillText(`v${node.version}`, node.x!, node.y! + nodeRadius + 10)
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
        nodeLabel={() => ''} // Disable default tooltip
        nodeCanvasObject={paintNode as any}
        linkCanvasObject={paintLink as any}
        onNodeClick={handleNodeClick as any}
        onNodeHover={handleNodeHover as any}
        backgroundColor="#020617"
        linkDirectionalParticles={1}
        linkDirectionalParticleWidth={1.5}
        linkDirectionalParticleSpeed={0.004}
        d3VelocityDecay={0.4}
        d3AlphaDecay={0.02}
        d3AlphaMin={0.001}
        cooldownTicks={100}
        warmupTicks={50}
        enableNodeDrag={true}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        onEngineStop={() => {
          // Fit graph to view after initial layout with padding
          if (fgRef.current) {
            fgRef.current.zoomToFit(400, 80)
          }
        }}
      />
      
      {/* Custom Tooltip - Neo4j style */}
      {hoveredNode && tooltipPos && (
        <div 
          className="absolute pointer-events-none z-50 transition-opacity duration-150"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y - 60}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="bg-slate-900/95 backdrop-blur-md rounded-lg px-4 py-3 text-xs text-slate-100 border border-slate-700 shadow-xl max-w-xs">
            <div className="font-semibold text-sm mb-2 text-cyan-400">
              {hoveredNode.content?.slice(0, 80) || 'Memory Node'}
              {hoveredNode.content && hoveredNode.content.length > 80 && '...'}
            </div>
            <div className="space-y-1 text-slate-300">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">ID:</span>
                <code className="text-xs bg-slate-800 px-1.5 py-0.5 rounded">
                  {hoveredNode.id.slice(0, 12)}...
                </code>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Status:</span>
                <span className={`text-xs font-medium ${
                  hoveredNode.status === 'active' ? 'text-cyan-400' : 'text-slate-400'
                }`}>
                  {hoveredNode.status || 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Version:</span>
                <span className="text-slate-300">v{hoveredNode.version || 1}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Info overlay */}
      <div className="absolute top-2 left-2 bg-slate-900/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-slate-300 border border-slate-700 shadow-lg">
        <div className="font-semibold mb-1.5 text-cyan-400">Graph Info</div>
        <div className="space-y-0.5">
          <div>Nodes: <span className="text-white font-medium">{nodes.length}</span></div>
          <div>Edges: <span className="text-white font-medium">{edges.length}</span></div>
        </div>
      </div>

      {/* Controls info */}
      <div className="absolute bottom-2 right-2 bg-slate-900/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-slate-400 border border-slate-700 shadow-lg">
        <div className="flex items-center gap-1.5">
          <span>🖱️</span>
          <span>Drag to pan</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>🔍</span>
          <span>Scroll to zoom</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>👆</span>
          <span>Click to select</span>
        </div>
      </div>
    </div>
  )
}

export default Neo4jGraphView

