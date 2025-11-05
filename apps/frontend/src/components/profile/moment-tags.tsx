"use client"

import { motion } from "framer-motion"
import { Trophy, TrendingUp, Zap, Target, Award } from "lucide-react"

interface MomentTagsProps {
  user: {
    elo: number
    peakElo: number
    matchesPlayed: number
    isCalibrating: boolean
  }
  eloHistory: Array<{ change: number; won: boolean }>
}

export function MomentTags({ user, eloHistory }: MomentTagsProps) {
  const moments: Array<{ text: string; icon: React.ReactNode; color: string }> = []

  // Check for rank up
  if (user.elo >= 2000 && user.elo < 2005) {
    moments.push({
      text: "Rank Up: GODLIKE!",
      icon: <Trophy className="h-4 w-4" />,
      color: "text-purple-500 border-purple-500",
    })
  } else if (user.elo >= 1800 && user.elo < 1805) {
    moments.push({
      text: "Rank Up: LEGENDARY!",
      icon: <Trophy className="h-4 w-4" />,
      color: "text-red-500 border-red-500",
    })
  } else if (user.elo >= 1600 && user.elo < 1605) {
    moments.push({
      text: "Rank Up: DIAMOND!",
      icon: <Trophy className="h-4 w-4" />,
      color: "text-cyan-500 border-cyan-500",
    })
  }

  // Check for peak Elo
  if (user.elo === user.peakElo && user.matchesPlayed > 0) {
    moments.push({
      text: "Peak Elo Achieved!",
      icon: <TrendingUp className="h-4 w-4" />,
      color: "text-green-500 border-green-500",
    })
  }

  // Check for calibration complete
  if (!user.isCalibrating && user.matchesPlayed === 10) {
    moments.push({
      text: "Calibration Complete!",
      icon: <Target className="h-4 w-4" />,
      color: "text-cyber-500 border-cyber-500",
    })
  }

  // Check for big win streak (last 5 matches)
  const recentWins = eloHistory.slice(-5).filter((h) => h.won).length
  if (recentWins >= 5) {
    moments.push({
      text: "5 Win Streak!",
      icon: <Zap className="h-4 w-4" />,
      color: "text-yellow-500 border-yellow-500",
    })
  }

  // Check for big Elo gain in last match
  if (eloHistory.length > 0) {
    const lastChange = eloHistory[eloHistory.length - 1].change
    if (lastChange >= 30) {
      moments.push({
        text: "Massive Elo Gain!",
        icon: <Award className="h-4 w-4" />,
        color: "text-green-500 border-green-500",
      })
    }
  }

  if (moments.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-2">
      {moments.map((moment, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.8, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: index * 0.1, type: "spring" }}
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-md border-2 bg-terminal-panel font-mono text-xs uppercase ${moment.color}`}
        >
          {moment.icon}
          {moment.text}
        </motion.div>
      ))}
    </div>
  )
}

