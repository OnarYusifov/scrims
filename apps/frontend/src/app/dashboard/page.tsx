"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Plus, 
  Swords, 
  TrendingUp, 
  Trophy, 
  Target,
  Clock,
  Users,
  AlertCircle
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { fetchMatches } from "@/lib/api"
import { Match } from "@/types"
import { formatTimestamp } from "@/lib/utils"

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [recentMatches, setRecentMatches] = useState<Match[]>([])
  const [activeMatches, setActiveMatches] = useState<Match[]>([])
  const [isLoadingMatches, setIsLoadingMatches] = useState(true)

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
      return
    }

    // Load matches if authenticated
    if (isAuthenticated && !authLoading && user) {
      loadMatches()
    }
  }, [isAuthenticated, authLoading, user, router])

  async function loadMatches() {
    if (!user) return
    
    try {
      setIsLoadingMatches(true)
      // Fetch recent completed matches
      const recentResponse = await fetchMatches({ status: 'COMPLETED', limit: 5 })
      setRecentMatches(recentResponse.matches.filter(m => 
        m.teams.some(team => team.members.some(member => member.user.id === user.id))
      ))

      // Fetch active matches (DRAFT, TEAM_SELECTION, IN_PROGRESS)
      const activeResponse = await fetchMatches({ limit: 10 })
      setActiveMatches(activeResponse.matches.filter(m => 
        ['DRAFT', 'TEAM_SELECTION', 'IN_PROGRESS', 'MAP_PICK_BAN'].includes(m.status) &&
        m.teams.some(team => team.members.some(member => member.user.id === user.id))
      ))
    } catch (error) {
      console.error("Failed to load matches:", error)
    } finally {
      setIsLoadingMatches(false)
    }
  }

  // Show loading state while checking auth
  if (authLoading) {
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
              CHECKING_AUTH<span className="animate-terminal-blink">_</span>
            </p>
          </motion.div>
        </div>
      </div>
    )
  }

  // Don't show dashboard if not authenticated (redirect will happen)
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="container relative py-10 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold font-mono uppercase text-gray-900 dark:text-matrix-500">
            DASHBOARD
          </h1>
          <p className="text-terminal-muted font-mono mt-1">
            Welcome back, Agent<span className="animate-terminal-blink">_</span>
          </p>
        </div>

        <Button size="lg" asChild className="relative z-10" style={{ pointerEvents: 'auto' }}>
          <Link href="/matches">
            <Plus className="mr-2 h-5 w-5" />
            CREATE MATCH
          </Link>
        </Button>
      </motion.div>

      {/* Stats Overview */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <Card className="border-matrix-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase">ELO RATING</CardTitle>
            <Trophy className="h-4 w-4 text-matrix-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-matrix-500">{user?.elo || 800}</div>
            <p className="text-xs font-mono text-terminal-muted">
              {user?.isCalibrating ? 'Calibrating' : 'Ranked'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase">MATCHES</CardTitle>
            <TrendingUp className="h-4 w-4 text-cyber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyber-500">{user?.matchesPlayed || 0}</div>
            <p className="text-xs font-mono text-terminal-muted">
              Total played
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase">PEAK ELO</CardTitle>
            <Swords className="h-4 w-4 text-matrix-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-matrix-500">{user?.peakElo || 800}</div>
            <p className="text-xs font-mono text-terminal-muted">
              Highest rating
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase">ROLE</CardTitle>
            <Target className="h-4 w-4 text-cyber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyber-500 font-mono text-sm">{user?.role || 'USER'}</div>
            <p className="text-xs font-mono text-terminal-muted">
              Access level
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Recent Matches */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  RECENT MATCHES
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/matches">View All</Link>
                </Button>
              </div>
              <CardDescription>Your match history</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingMatches ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 border-2 border-matrix-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : recentMatches.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-terminal-muted mb-4 opacity-50" />
                  <p className="text-terminal-muted font-mono mb-2">No matches yet</p>
                  <p className="text-sm text-terminal-muted font-mono">
                    Create or join a match to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentMatches.map((match) => (
                    <Link
                      key={match.id}
                      href={`/matches/${match.id}`}
                      className="block p-3 rounded border border-terminal-border hover:border-matrix-500 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-mono text-sm text-matrix-500">{match.seriesType}</p>
                          <p className="font-mono text-xs text-terminal-muted">
                            {formatTimestamp(match.createdAt)}
                          </p>
                        </div>
                        {match.winnerTeamId && (
                          <Trophy className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Active Lobbies */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                ACTIVE LOBBIES
              </CardTitle>
              <CardDescription>Join an ongoing match</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingMatches ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 border-2 border-matrix-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : activeMatches.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-terminal-muted mx-auto mb-4 opacity-50" />
                  <p className="text-terminal-muted font-mono mb-2">No active lobbies</p>
                  <p className="text-sm text-terminal-muted font-mono mb-4">
                    Create one to get started!
                  </p>
                  <Button className="w-full relative z-10" asChild style={{ pointerEvents: 'auto' }}>
                    <Link href="/matches">
                      <Plus className="mr-2 h-4 w-4" />
                      CREATE MATCH
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeMatches.map((match) => (
                    <Link
                      key={match.id}
                      href={`/matches/${match.id}`}
                      className="block p-3 rounded border border-terminal-border hover:border-matrix-500 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-mono text-sm text-matrix-500">
                            {match.seriesType} • {match.status}
                          </p>
                          <p className="font-mono text-xs text-terminal-muted">
                            {match.teams.reduce((sum, t) => sum + t.members.length, 0)}/10 players
                          </p>
                        </div>
                        <Users className="h-4 w-4 text-matrix-500" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
