"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import {
  Plus,
  Users,
  Clock,
  Trophy,
  Swords,
  Calendar,
  X,
  UserPlus,
  LogOut,
  Trash2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"
import { Match, MatchStatus, SeriesType } from "@/types"
import { fetchMatches, createMatch, joinMatch, leaveMatch, deleteMatch } from "@/lib/api"
import { formatTimestamp } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const STATUS_COLORS: Record<MatchStatus, string> = {
  DRAFT: "border-gray-400 dark:border-terminal-muted text-gray-700 dark:text-terminal-muted",
  CAPTAIN_VOTING: "border-yellow-500 text-yellow-500",
  MAP_PICK_BAN: "border-cyber-500 text-cyber-500",
  TEAM_SELECTION: "border-matrix-500 text-matrix-500",
  IN_PROGRESS: "border-green-500 text-green-500",
  VOTING: "border-yellow-500 text-yellow-500",
  COMPLETED: "border-matrix-500 text-matrix-500",
  CANCELLED: "border-red-500 text-red-500",
}

const STATUS_LABELS: Record<MatchStatus, string> = {
  DRAFT: "DRAFT",
  CAPTAIN_VOTING: "CAPTAIN VOTING",
  MAP_PICK_BAN: "PICK/BAN",
  TEAM_SELECTION: "TEAM SELECT",
  IN_PROGRESS: "IN PROGRESS",
  VOTING: "VOTING",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
}

export default function MatchesPage() {
  const { user, isAuthenticated } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [matches, setMatches] = useState<Match[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<MatchStatus | "ALL">("ALL")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedSeriesType, setSelectedSeriesType] = useState<SeriesType>("BO1")

  useEffect(() => {
    if (!isAuthenticated) return
    loadMatches()
  }, [isAuthenticated, selectedStatus])

  async function loadMatches() {
    try {
      setIsLoading(true)
      const response = await fetchMatches({
        status: selectedStatus === "ALL" ? undefined : selectedStatus,
        limit: 50,
      })
      setMatches(response.matches)
    } catch (error) {
      console.error("Failed to load matches:", error)
      toast({
        title: "Error",
        description: "Failed to load matches",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCreateMatch() {
    try {
      setIsCreating(true)
      const match = await createMatch(selectedSeriesType)
      toast({
        title: "Match Created",
        description: `Created ${selectedSeriesType} match as host`,
      })
      setShowCreateDialog(false)
      // Navigate to match detail page (don't auto-join, let host decide)
      router.push(`/matches/${match.id}`)
    } catch (error: any) {
      console.error("Failed to create match:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create match",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  async function handleJoinMatch(matchId: string) {
    try {
      await joinMatch(matchId)
      toast({
        title: "Joined Match",
        description: "You've joined the match",
      })
      loadMatches()
    } catch (error: any) {
      console.error("Failed to join match:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to join match",
        variant: "destructive",
      })
    }
  }

  async function handleLeaveMatch(matchId: string) {
    try {
      await leaveMatch(matchId)
      toast({
        title: "Left Match",
        description: "You've left the match",
      })
      loadMatches()
    } catch (error) {
      console.error("Failed to leave match:", error)
      toast({
        title: "Error",
        description: "Failed to leave match",
        variant: "destructive",
      })
    }
  }

  async function handleDeleteMatch(matchId: string) {
    try {
      await deleteMatch(matchId)
      toast({
        title: "Match Deleted",
        description: "Match has been deleted",
      })
      loadMatches()
    } catch (error) {
      console.error("Failed to delete match:", error)
      toast({
        title: "Error",
        description: "Failed to delete match",
        variant: "destructive",
      })
    }
  }

  function isUserInMatch(match: Match): boolean {
    if (!user) return false
    return match.teams.some(team =>
      team.members.some(member => member.user.id === user.id)
    )
  }

  function getTotalPlayers(match: Match): number {
    return match.teams.reduce((sum, team) => sum + team.members.length, 0)
  }

  const statusFilters: Array<{ value: MatchStatus | "ALL"; label: string }> = [
    { value: "ALL", label: "ALL" },
    { value: "DRAFT", label: "DRAFT" },
    { value: "TEAM_SELECTION", label: "TEAM SELECT" },
    { value: "IN_PROGRESS", label: "IN PROGRESS" },
    { value: "COMPLETED", label: "COMPLETED" },
  ]

  if (!isAuthenticated) {
    return (
      <div className="container relative py-10">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-terminal-muted mx-auto mb-4 opacity-50" />
          <p className="text-terminal-muted font-mono">Please log in to view matches</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container relative z-10 py-10 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold font-mono uppercase text-gray-900 dark:text-matrix-500">
            MATCHES
          </h1>
          <p className="text-terminal-muted font-mono mt-1">
            Create, join, and manage matches<span className="animate-terminal-blink">_</span>
          </p>
        </div>

        <div className="relative z-50" style={{ pointerEvents: 'auto' }}>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="lg" className="relative z-50" style={{ pointerEvents: 'auto' }}>
                <Plus className="mr-2 h-5 w-5" />
                CREATE MATCH
              </Button>
            </DialogTrigger>
          <DialogContent className="border-matrix-500 bg-terminal-panel">
            <DialogHeader>
              <DialogTitle className="font-mono text-matrix-500">CREATE MATCH</DialogTitle>
              <DialogDescription className="font-mono text-terminal-muted">
                Choose the series type for your match
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-mono uppercase text-terminal-muted">Series Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['BO1', 'BO3', 'BO5'] as SeriesType[]).map((type) => (
                    <Button
                      key={type}
                      variant={selectedSeriesType === type ? "default" : "outline"}
                      onClick={() => setSelectedSeriesType(type)}
                      className="font-mono"
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </div>
              <Button
                onClick={handleCreateMatch}
                disabled={isCreating}
                className="w-full font-mono"
                size="lg"
              >
                {isCreating ? "CREATING..." : "CREATE MATCH"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </motion.div>

      {/* Status Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap gap-2 relative z-10"
      >
        {statusFilters.map((filter) => (
          <Button
            key={filter.value}
            variant={selectedStatus === filter.value ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedStatus(filter.value)}
            className="font-mono uppercase relative z-10"
            style={{ pointerEvents: 'auto' }}
          >
            {filter.label}
          </Button>
        ))}
      </motion.div>

      {/* Matches List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-12 w-12 border-2 border-matrix-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : matches.length === 0 ? (
        <Card className="border-terminal-muted">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <AlertCircle className="h-16 w-16 text-terminal-muted mb-4 opacity-50" />
            <p className="text-terminal-muted font-mono text-lg mb-2">No matches found</p>
            <p className="text-sm text-terminal-muted font-mono mb-4">
              Create a match to get started
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              CREATE MATCH
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {matches.map((match) => {
              const userInMatch = isUserInMatch(match)
              const totalPlayers = getTotalPlayers(match)
              const isFull = totalPlayers >= 10
              const canJoin = match.status === "DRAFT" || match.status === "TEAM_SELECTION"

              const playerPoolTeam = match.teams.find(team => team.name === "Player Pool")
              const teamAlpha = match.teams.find(team => team.name === "Team Alpha")
              const teamBravo = match.teams.find(team => team.name === "Team Bravo")

              const teamSummaries = [
                {
                  key: "pool",
                  name: "Player Pool",
                  capacity: 10,
                  team: playerPoolTeam,
                  count: playerPoolTeam?.members.length ?? 0,
                  showCaptain: false,
                },
                {
                  key: "alpha",
                  name: "Team Alpha",
                  capacity: 5,
                  team: teamAlpha,
                  count: teamAlpha?.members.length ?? 0,
                  showCaptain: true,
                },
                {
                  key: "bravo",
                  name: "Team Bravo",
                  capacity: 5,
                  team: teamBravo,
                  count: teamBravo?.members.length ?? 0,
                  showCaptain: true,
                },
              ]

              return (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="relative z-10"
                >
                  <Card 
                    className={`border-2 ${STATUS_COLORS[match.status]} hover:border-matrix-500 transition-colors relative z-10 cursor-pointer`}
                    onClick={() => router.push(`/matches/${match.id}`)}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="font-mono text-sm uppercase">
                          {STATUS_LABELS[match.status]}
                        </CardTitle>
                        <span className="text-xs font-mono text-gray-600 dark:text-terminal-muted">
                          {match.seriesType}
                        </span>
                      </div>
                      <CardDescription className="font-mono text-xs">
                        {formatTimestamp(match.createdAt)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Teams */}
                      <div className="space-y-2">
                        {teamSummaries.map((summary) => {
                          const hasCaptain =
                            summary.showCaptain &&
                            !!(
                              summary.team?.captainId ||
                              summary.team?.captain
                            )
                          return (
                            <div
                              key={summary.key}
                              className="flex items-center justify-between p-2 rounded border border-gray-200 dark:border-terminal-border bg-gray-50 dark:bg-terminal-panel/50"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs text-gray-600 dark:text-terminal-muted">
                                  {summary.name}
                                </span>
                                {hasCaptain && (
                                  <span className="text-xs text-matrix-500">👑</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Users className="h-3 w-3 text-gray-600 dark:text-terminal-muted" />
                                <span className="font-mono text-xs text-gray-600 dark:text-terminal-muted">
                                  {summary.count}/{summary.capacity}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Player Count */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-mono text-gray-600 dark:text-terminal-muted">
                          Players: {totalPlayers}/10
                        </span>
                        {match.status === "COMPLETED" && match.winnerTeamId && (
                          <Trophy className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 relative z-20" onClick={(e) => e.stopPropagation()}>
                        {userInMatch ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleLeaveMatch(match.id)}
                            className="flex-1 font-mono text-xs relative z-20"
                            style={{ pointerEvents: 'auto' }}
                          >
                            <LogOut className="mr-1 h-3 w-3" />
                            LEAVE
                          </Button>
                        ) : canJoin && !isFull ? (
                          <Button
                            size="sm"
                            onClick={() => handleJoinMatch(match.id)}
                            className="flex-1 font-mono text-xs relative z-20"
                            style={{ pointerEvents: 'auto' }}
                          >
                            <UserPlus className="mr-1 h-3 w-3" />
                            JOIN
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled
                            className="flex-1 font-mono text-xs relative z-20"
                          >
                            {isFull ? "FULL" : "LOCKED"}
                          </Button>
                        )}
                        {user && (user.role === "ADMIN" || user.role === "ROOT") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteMatch(match.id)}
                            className="font-mono text-xs relative z-20"
                            style={{ pointerEvents: 'auto' }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
