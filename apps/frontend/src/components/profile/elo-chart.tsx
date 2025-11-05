"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { motion } from "framer-motion"

interface EloHistoryPoint {
  oldElo: number
  newElo: number
  change: number
  won: boolean
  seriesType: string
  createdAt: string
}

interface EloChartProps {
  history: EloHistoryPoint[]
}

export function EloChart({ history }: EloChartProps) {
  // Transform data for chart
  const chartData = history.map((point, index) => ({
    match: index + 1,
    elo: point.newElo,
    change: point.change,
    won: point.won,
  }))

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-terminal-panel border-2 border-matrix-500 p-3 rounded-md font-mono text-sm">
          <p className="text-matrix-500">Match #{data.match}</p>
          <p className="text-cyber-500">Elo: {data.elo}</p>
          <p className={data.change >= 0 ? "text-green-500" : "text-red-500"}>
            Change: {data.change >= 0 ? "+" : ""}{data.change}
          </p>
          <p className={data.won ? "text-green-500" : "text-red-500"}>
            Result: {data.won ? "Win" : "Loss"}
          </p>
        </div>
      )
    }
    return null
  }

  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-terminal-muted font-mono">
        <p>No match history yet. Play matches to see your Elo progression!</p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#22c55e" opacity={0.2} />
          <XAxis
            dataKey="match"
            stroke="#22c55e"
            style={{ fontFamily: "JetBrains Mono", fontSize: "12px" }}
          />
          <YAxis
            stroke="#22c55e"
            style={{ fontFamily: "JetBrains Mono", fontSize: "12px" }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="elo"
            stroke="#22c55e"
            strokeWidth={2}
            dot={{ fill: "#22c55e", r: 4 }}
            activeDot={{ r: 6, fill: "#06b6d4" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  )
}

