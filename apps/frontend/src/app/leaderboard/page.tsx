"use client"

import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Search, Trophy, Crown, TrendingUp, TrendingDown, AlertCircle } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

interface LeaderboardEntry {
  rank: number
  id: string
  username: string
  discordId: string
  avatar: string | null
  elo: number
  peakElo: number
  matchesPlayed: number
  isCalibrating: boolean
  avgKD: number
  avgACS: number
  avgADR: number
  rankName: string
}

export default function LeaderboardPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return

    if (!isAuthenticated) {
      router.push("/login")
      return
    }

    loadLeaderboard()
  }, [isAuthenticated, authLoading, router])

  async function loadLeaderboard() {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch('/api/leaderboard', {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to load leaderboard')
      }

      const data = await response.json()
      setLeaderboard(data.leaderboard || [])
    } catch (err: any) {
      console.error('Failed to load leaderboard:', err)
      setError(err.message || 'Failed to load leaderboard data')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredLeaderboard = leaderboard.filter((player) =>
    player.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (authLoading || isLoading) {
    return (
      <div className="container relative py-10">
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <div className="h-12 w-12 border-2 border-matrix-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-lg font-mono text-matrix-500">
              LOADING_LEADERBOARD<span className="animate-terminal-blink">_</span>
            </p>
          </motion.div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const hasPlayers = leaderboard.length > 0

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
            <h1 className="text-3xl font-bold font-mono uppercase text-gray-900 dark:text-matrix-500">
              LEADERBOARD
            </h1>
            <p className="text-gray-600 dark:text-terminal-muted font-mono mt-1">
              Top players ranked by Elo<span className="animate-terminal-blink">_</span>
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-terminal-muted" />
            <Input
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </motion.div>

      {/* Error State */}
      {error && (
        <Card className="border-red-500 bg-red-500/10 p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-red-500" />
            <div>
              <p className="font-mono text-red-500 font-bold">Error Loading Leaderboard</p>
              <p className="font-mono text-sm text-red-400 mt-1">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Leaderboard Table or Empty State */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {!hasPlayers ? (
          <Card className="p-12 border-gray-200 dark:border-terminal-border bg-white dark:bg-terminal-panel">
            <div className="flex flex-col items-center justify-center text-center">
              <Trophy className="h-16 w-16 text-gray-300 dark:text-terminal-muted mb-6 opacity-30" />
              <h3 className="text-xl font-bold font-mono uppercase text-gray-900 dark:text-matrix-500 mb-2">
                NO RANKINGS YET
              </h3>
              <p className="text-gray-600 dark:text-terminal-muted font-mono max-w-md">
                The leaderboard is empty. Complete matches to start climbing the ranks!
              </p>
              <div className="mt-8 space-y-2 text-sm text-gray-600 dark:text-terminal-muted font-mono">
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
          <Card className="border-gray-200 dark:border-terminal-border bg-white dark:bg-terminal-panel">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-right">Elo</TableHead>
                    <TableHead className="text-right">Peak</TableHead>
                    <TableHead className="text-right">Matches</TableHead>
                    <TableHead className="text-right">K/D</TableHead>
                    <TableHead className="text-right">Avg ACS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeaderboard.map((player, index) => {
                    const eloChange = player.elo - 800 // Simple calculation from starting Elo
                    const isTop3 = player.rank <= 3

                    return (
                      <TableRow
                        key={player.id}
                        className="cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-terminal-panel/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-matrix-500"
                        onClick={() => router.push(`/profile/${player.discordId}`)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault()
                            router.push(`/profile/${player.discordId}`)
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        data-index={index}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {isTop3 && (
                              <Crown
                                className={cn(
                                  "h-4 w-4",
                                  player.rank === 1
                                    ? "text-yellow-500"
                                    : player.rank === 2
                                      ? "text-gray-400"
                                      : "text-amber-700",
                                )}
                              />
                            )}
                            <div className="flex flex-col leading-tight">
                              <span className="font-bold text-gray-900 dark:text-matrix-500">
                                {player.rankName}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-terminal-muted">
                                #{player.rank}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border border-terminal-border/70">
                              {player.avatar ? (
                                <AvatarImage
                                  src={`https://cdn.discordapp.com/avatars/${player.discordId}/${player.avatar}.png?size=64`}
                                  alt={player.username}
                                />
                              ) : (
                                <AvatarFallback className="bg-gray-200 dark:bg-terminal-panel text-gray-700 dark:text-matrix-500">
                                  {player.username.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-matrix-400">
                                {player.username}
                              </p>
                              {player.isCalibrating && (
                                <span className="text-xs text-yellow-600 dark:text-yellow-500">
                                  CALIBRATING
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-bold text-lg text-gray-900 dark:text-matrix-500">
                            {player.elo}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm text-gray-600 dark:text-terminal-muted">
                            {player.peakElo}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-gray-700 dark:text-matrix-400">
                            {player.matchesPlayed}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={cn(
                              "font-semibold",
                              player.avgKD >= 1
                                ? "text-green-600 dark:text-green-400"
                                : "text-gray-600 dark:text-terminal-muted",
                            )}
                          >
                            {player.avgKD.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm text-gray-700 dark:text-cyber-400">
                            {Math.round(player.avgACS)}
                          </span>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
                <TableCaption className="font-mono">
                  Elo change shown relative to the default starting rating (800 Elo).
                </TableCaption>
              </Table>
            </div>
          </Card>
        )}
      </motion.div>

      {/* No Search Results */}
      {hasPlayers && filteredLeaderboard.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12 text-gray-600 dark:text-terminal-muted font-mono"
        >
          <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No players found</p>
          <p className="text-sm mt-2">Try a different search term</p>
        </motion.div>
      )}
    </div>
  )
}
