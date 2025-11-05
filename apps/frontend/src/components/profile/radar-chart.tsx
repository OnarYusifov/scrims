"use client"

import { useEffect, useRef } from "react"
import { motion } from "framer-motion"

interface RadarChartProps {
  stats: {
    acs: number
    adr: number
    kast: number
    headshotPercent: number
    kd: number
    wpr: number
  }
}

const STAT_LABELS = ['ACS', 'ADR', 'KAST', 'HS%', 'K/D', 'WPR']
const MAX_VALUES = {
  acs: 300,
  adr: 200,
  kast: 100,
  headshotPercent: 100,
  kd: 3,
  wpr: 100,
}

export function RadarChart({ stats }: RadarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const size = 300
    const center = size / 2
    const radius = size / 2 - 40

    canvas.width = size
    canvas.height = size

    // Clear canvas
    ctx.clearRect(0, 0, size, size)

    // Draw grid circles
    ctx.strokeStyle = "#22c55e"
    ctx.lineWidth = 1
    for (let i = 1; i <= 5; i++) {
      ctx.beginPath()
      ctx.arc(center, center, (radius * i) / 5, 0, Math.PI * 2)
      ctx.stroke()
    }

    // Draw grid lines
    const numStats = STAT_LABELS.length
    for (let i = 0; i < numStats; i++) {
      const angle = (Math.PI * 2 * i) / numStats - Math.PI / 2
      const x = center + Math.cos(angle) * radius
      const y = center + Math.sin(angle) * radius

      ctx.beginPath()
      ctx.moveTo(center, center)
      ctx.lineTo(x, y)
      ctx.stroke()
    }

    // Normalize stats (0-1 range)
    const normalizedStats = [
      Math.min(stats.acs / MAX_VALUES.acs, 1),
      Math.min(stats.adr / MAX_VALUES.adr, 1),
      Math.min(stats.kast / MAX_VALUES.kast, 1),
      Math.min(stats.headshotPercent / MAX_VALUES.headshotPercent, 1),
      Math.min(stats.kd / MAX_VALUES.kd, 1),
      Math.min(stats.wpr / MAX_VALUES.wpr, 1),
    ]

    // Draw stat polygon
    ctx.fillStyle = "rgba(34, 197, 94, 0.2)"
    ctx.strokeStyle = "#22c55e"
    ctx.lineWidth = 2

    ctx.beginPath()
    for (let i = 0; i < numStats; i++) {
      const angle = (Math.PI * 2 * i) / numStats - Math.PI / 2
      const value = normalizedStats[i] * radius
      const x = center + Math.cos(angle) * value
      const y = center + Math.sin(angle) * value

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Draw stat points
    ctx.fillStyle = "#22c55e"
    for (let i = 0; i < numStats; i++) {
      const angle = (Math.PI * 2 * i) / numStats - Math.PI / 2
      const value = normalizedStats[i] * radius
      const x = center + Math.cos(angle) * value
      const y = center + Math.sin(angle) * value

      ctx.beginPath()
      ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fill()
    }

    // Draw labels
    ctx.fillStyle = "#22c55e"
    ctx.font = "12px 'JetBrains Mono', monospace"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"

    for (let i = 0; i < numStats; i++) {
      const angle = (Math.PI * 2 * i) / numStats - Math.PI / 2
      const labelRadius = radius + 20
      const x = center + Math.cos(angle) * labelRadius
      const y = center + Math.sin(angle) * labelRadius

      ctx.fillText(STAT_LABELS[i], x, y)
    }
  }, [stats])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="flex justify-center"
    >
      <canvas
        ref={canvasRef}
        className="max-w-full h-auto"
        style={{ maxWidth: "300px", maxHeight: "300px" }}
      />
    </motion.div>
  )
}

