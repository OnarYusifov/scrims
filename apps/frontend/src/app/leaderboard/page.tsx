"use client"

import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, Trophy, AlertCircle } from "lucide-react"
import { useState } from "react"

// Empty leaderboard - will be populated from API
const mockLeaderboard: any[] = []

export default function LeaderboardPage() {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredLeaderboard = mockLeaderboard.filter((player) =>
    player.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const hasPlayers = mockLeaderboard.length > 0

  return (
    <div className="container relative py-10 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-3">
          <Trophy className="h-10 w-10 text-matrix-500" />
          <div>
            <h1 className="text-3xl font-bold font-mono uppercase text-matrix-500 neon-text">
              LEADERBOARD
            </h1>
            <p className="text-terminal-muted font-mono mt-1">
              Top players ranked by Elo<span className="animate-terminal-blink">_</span>
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-terminal-muted" />
            <Input
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </motion.div>

      {/* Leaderboard Table or Empty State */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {!hasPlayers ? (
          <Card className="p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <Trophy className="h-16 w-16 text-terminal-muted mb-6 opacity-30" />
              <h3 className="text-xl font-bold font-mono uppercase text-matrix-500 mb-2">
                NO RANKINGS YET
              </h3>
              <p className="text-terminal-muted font-mono max-w-md">
                The leaderboard is empty. Complete matches to start climbing the ranks!
              </p>
              <div className="mt-8 space-y-2 text-sm text-terminal-muted font-mono">
                <p className="flex items-center gap-2">
                  <span className="text-matrix-500">&gt;</span> Play matches to earn Elo
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-matrix-500">&gt;</span> Rankings: Bronze → Silver → Gold → Platinum → Diamond → Godlike
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-matrix-500">&gt;</span> Starting Elo: 800
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-terminal-border">
                    <th className="px-6 py-4 text-left text-xs font-bold font-mono uppercase text-matrix-500">
                      Rank
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold font-mono uppercase text-matrix-500">
                      Player
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold font-mono uppercase text-matrix-500">
                      Elo
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-bold font-mono uppercase text-matrix-500">
                      Change
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold font-mono uppercase text-matrix-500">
                      Matches
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold font-mono uppercase text-matrix-500">
                      K/D
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold font-mono uppercase text-matrix-500">
                      Avg ACS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Player rows will appear here */}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </motion.div>

      {/* No Search Results */}
      {hasPlayers && filteredLeaderboard.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12 text-terminal-muted font-mono"
        >
          <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No players found</p>
          <p className="text-sm mt-2">Try a different search term</p>
        </motion.div>
      )}
    </div>
  )
}
