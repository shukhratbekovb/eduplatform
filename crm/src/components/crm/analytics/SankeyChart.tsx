'use client'
import { useMemo, useState } from 'react'
import { useT } from '@/lib/i18n'
import type { SankeyData } from '@/types/crm'

// ── SVG constants ──────────────────────────────────────────────────────────────
const W       = 960   // viewBox width
const H       = 400   // viewBox height
const PAD_V   = 24    // top/bottom padding
const PAD_H   = 140   // left/right padding (space for labels)
const NODE_W  = 18    // node rectangle width
const GAP     = 10    // gap between nodes in the same column

// Column x positions (left edge of node rect)
const COL_X = [PAD_H, (W - NODE_W) / 2, W - PAD_H - NODE_W] as const

// Column header i18n keys (resolved at render time)
const COL_LABEL_KEYS = [
  'analytics.sankey.col.source',
  'analytics.sankey.col.stage',
  'analytics.sankey.col.outcome',
] as const

// ── Layout types ───────────────────────────────────────────────────────────────
interface PlacedNode {
  id: string; label: string; color: string
  column: number; value: number
  x: number; y: number; h: number
}
interface PlacedLink {
  d: string
  color: string
  value: number
  sourceName: string
  targetName: string
}

// ── Layout computation ─────────────────────────────────────────────────────────
function computeLayout(data: SankeyData): { nodes: PlacedNode[]; links: PlacedLink[] } {
  const usableH = H - PAD_V * 2

  // Group nodes by column
  const byCol = new Map<number, typeof data.nodes[0][]>()
  for (const n of data.nodes) {
    if (!byCol.has(n.column)) byCol.set(n.column, [])
    byCol.get(n.column)!.push(n)
  }

  const placedNodes: PlacedNode[] = []

  for (const [col, nodes] of byCol) {
    const x         = COL_X[col]
    const sorted     = [...nodes].sort((a, b) => b.value - a.value)
    const totalGaps  = GAP * (sorted.length - 1)
    const colTotal   = sorted.reduce((s, n) => s + n.value, 0)
    const availH     = usableH - totalGaps

    let y = PAD_V
    for (const node of sorted) {
      const h = colTotal > 0 ? Math.max((node.value / colTotal) * availH, 8) : availH / sorted.length
      placedNodes.push({ ...node, x, y, h })
      y += h + GAP
    }
  }

  // Build link ribbons
  // Track how much height has been allocated within each node (source exit / target entry)
  const srcUsed: Record<string, number> = {}
  const tgtUsed: Record<string, number> = {}

  // Sort links: first by source node y, then by target node y (reduces crossings)
  const sortedLinks = [...data.links].sort((a, b) => {
    const sa = placedNodes.find(n => n.id === a.sourceId)
    const sb = placedNodes.find(n => n.id === b.sourceId)
    const ta = placedNodes.find(n => n.id === a.targetId)
    const tb = placedNodes.find(n => n.id === b.targetId)
    return ((sa?.y ?? 0) - (sb?.y ?? 0)) || ((ta?.y ?? 0) - (tb?.y ?? 0))
  })

  const placedLinks: PlacedLink[] = []

  for (const link of sortedLinks) {
    const s = placedNodes.find(n => n.id === link.sourceId)
    const t = placedNodes.find(n => n.id === link.targetId)
    if (!s || !t || link.value === 0) continue

    // Ribbon height proportional to the share of each node's value
    const hS = s.value > 0 ? (link.value / s.value) * s.h : 0
    const hT = t.value > 0 ? (link.value / t.value) * t.h : 0

    const sy0 = s.y + (srcUsed[s.id] ?? 0)
    const ty0 = t.y + (tgtUsed[t.id] ?? 0)

    srcUsed[s.id] = (srcUsed[s.id] ?? 0) + hS
    tgtUsed[t.id] = (tgtUsed[t.id] ?? 0) + hT

    const x1 = s.x + NODE_W     // source right edge
    const x2 = t.x              // target left edge
    const cx = (x1 + x2) / 2   // control point x

    // Closed ribbon path: top bezier + bottom bezier
    const d = [
      `M ${x1} ${sy0}`,
      `C ${cx} ${sy0}, ${cx} ${ty0}, ${x2} ${ty0}`,
      `L ${x2} ${ty0 + hT}`,
      `C ${cx} ${ty0 + hT}, ${cx} ${sy0 + hS}, ${x1} ${sy0 + hS}`,
      `Z`,
    ].join(' ')

    placedLinks.push({ d, color: s.color, value: link.value, sourceName: s.label, targetName: t.label })
  }

  return { nodes: placedNodes, links: placedLinks }
}

// ── Props ──────────────────────────────────────────────────────────────────────
interface Props {
  data: SankeyData
  isLoading?: boolean
}

// ── Component ──────────────────────────────────────────────────────────────────
export function SankeyChart({ data, isLoading }: Props) {
  const t = useT()
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null)

  const { nodes, links } = useMemo(() => {
    if (!data || data.nodes.length === 0) return { nodes: [], links: [] }
    return computeLayout(data)
  }, [data])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="animate-spin w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full" />
      </div>
    )
  }
  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400 dark:text-gray-500">
        {t('common.noData')}
      </div>
    )
  }

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Column header labels */}
        {COL_LABEL_KEYS.map((key, i) => (
          <text
            key={key}
            x={COL_X[i] + NODE_W / 2}
            y={10}
            textAnchor="middle"
            fontSize={11}
            fontWeight={600}
            className="fill-gray-400 dark:fill-gray-500"
            style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            {t(key)}
          </text>
        ))}

        {/* Link ribbons (rendered behind nodes) */}
        {links.map((link, i) => (
          <path
            key={i}
            d={link.d}
            fill={link.color}
            fillOpacity={0.25}
            stroke={link.color}
            strokeOpacity={0.15}
            strokeWidth={0.5}
            className="transition-all duration-150 cursor-pointer"
            onMouseEnter={(e) => {
              const rect = (e.currentTarget.closest('svg') as SVGSVGElement).getBoundingClientRect()
              setTooltip({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                text: `${link.sourceName} → ${link.targetName}: ${link.value} лид${link.value === 1 ? '' : link.value < 5 ? 'а' : 'ов'}`,
              })
            }}
            onMouseMove={(e) => {
              const rect = (e.currentTarget.closest('svg') as SVGSVGElement).getBoundingClientRect()
              setTooltip((t) => t ? { ...t, x: e.clientX - rect.left, y: e.clientY - rect.top } : null)
            }}
            onMouseLeave={() => setTooltip(null)}
          />
        ))}

        {/* Node rectangles */}
        {nodes.map((node) => (
          <g key={node.id}>
            <rect
              x={node.x}
              y={node.y}
              width={NODE_W}
              height={node.h}
              rx={3}
              fill={node.color}
              fillOpacity={0.9}
            />

            {/* Labels */}
            {node.column === 0 && (
              // Source: label left of node
              <text
                x={node.x - 8}
                y={node.y + node.h / 2}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={12}
                fontWeight={500}
                className="fill-gray-700 dark:fill-gray-200"
              >
                {node.label}
                <tspan fontSize={10} fontWeight={400} className="fill-gray-400 dark:fill-gray-500">
                  {' '}({node.value})
                </tspan>
              </text>
            )}
            {node.column === 1 && (
              // Stage: label right of node, with bg for readability
              <>
                <rect
                  x={node.x + NODE_W + 4}
                  y={node.y + node.h / 2 - 8}
                  width={estimateTextW(node.label, node.value)}
                  height={16}
                  rx={3}
                  fill="white"
                  fillOpacity={0.85}
                  className="dark:fill-gray-800 dark:fill-opacity-90"
                />
                <text
                  x={node.x + NODE_W + 8}
                  y={node.y + node.h / 2}
                  textAnchor="start"
                  dominantBaseline="middle"
                  fontSize={11}
                  fontWeight={500}
                  className="fill-gray-700 dark:fill-gray-200"
                >
                  {node.label}
                  <tspan fontSize={10} fontWeight={400} className="fill-gray-400 dark:fill-gray-500">
                    {' '}({node.value})
                  </tspan>
                </text>
              </>
            )}
            {node.column === 2 && (
              // Outcome: label right of node
              <text
                x={node.x + NODE_W + 8}
                y={node.y + node.h / 2}
                textAnchor="start"
                dominantBaseline="middle"
                fontSize={12}
                fontWeight={600}
                className="fill-gray-700 dark:fill-gray-200"
              >
                {node.label}
                <tspan fontSize={10} fontWeight={400} className="fill-gray-400 dark:fill-gray-500">
                  {' '}({node.value})
                </tspan>
              </text>
            )}
          </g>
        ))}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded px-2.5 py-1.5 shadow-lg whitespace-nowrap"
          style={{
            left: Math.min(tooltip.x + 12, (typeof window !== 'undefined' ? window.innerWidth : 800) - 200),
            top: tooltip.y - 36,
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  )
}

// Rough estimate of text width to size the bg rect behind stage labels
function estimateTextW(label: string, value: number): number {
  return label.length * 6.5 + String(value).length * 6 + 20
}
