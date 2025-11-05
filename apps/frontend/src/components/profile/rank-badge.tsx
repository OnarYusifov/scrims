"use client"

import { motion } from "framer-motion"
import { Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react"

interface RankBadgeProps {
  elo: number
  previousElo?: number
  isCalibrating?: boolean
  className?: string
}

function getRankTier(elo: number, isCalibrating: boolean = false): { name: string; color: string; icon: string } {
  // If calibrating, show as Unranked
  if (isCalibrating) {
    return { name: "UNRANKED", color: "text-terminal-muted", icon: "❓" }
  }
  
  // Rank tiers based on Elo
  if (elo >= 2000) return { name: "GODLIKE", color: "text-purple-500", icon: "👑" }
  if (elo >= 1800) return { name: "LEGENDARY", color: "text-red-500", icon: "🔥" }
  if (elo >= 1600) return { name: "DIAMOND", color: "text-cyan-500", icon: "💎" }
  if (elo >= 1400) return { name: "PLATINUM", color: "text-blue-500", icon: "⭐" }
  if (elo >= 1200) return { name: "GOLD", color: "text-yellow-500", icon: "🥇" }
  if (elo >= 800) return { name: "SILVER", color: "text-gray-400", icon: "🥈" }
  // 600 and below is Bronze
  return { name: "BRONZE", color: "text-orange-600", icon: "🥉" }
}

export function RankBadge({ elo, previousElo, isCalibrating = false, className = "" }: RankBadgeProps) {
  const tier = getRankTier(elo, isCalibrating)
  const change = previousElo ? elo - previousElo : 0
  const rankChanged = change !== 0

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200 }}
      className={`flex items-center gap-3 ${className}`}
    >
      <div className={`text-4xl ${tier.color}`}>{tier.icon}</div>
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className={`text-2xl font-bold font-mono ${tier.color}`}>
            {tier.name}
          </span>
          {rankChanged && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className={`text-sm font-mono flex items-center gap-1 ${
                change > 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {change > 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              {change > 0 ? "+" : ""}
              {change}
            </motion.span>
          )}
        </div>
        <span className="text-terminal-muted font-mono text-sm">
          Elo: {elo} {previousElo && `(${previousElo > elo ? "↓" : "↑"})`}
        </span>
      </div>
    </motion.div>
  )
}

