"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/use-auth"
import {
  ArrowLeft,
  Users,
  Trophy,
  MapPin,
  Calendar,
  Clock,
  Swords,
  AlertCircle,
  UserPlus,
  LogOut,
  Trash2,
  FileText,
  XCircle,
  Loader2,
  CheckCircle2,
  X,
} from "lucide-react"
import { Match, MatchStatus } from "@/types"
import { fetchMatch, joinMatch, leaveMatch, deleteMatch, addTestUsersToMatch, submitMatchStats, MatchStatsSubmission, addUserToMatchManually, rootAssignTeams, rootSetMatchStatus, rootSetMaps, fetchUsers } from "@/lib/api"
import { formatTimestamp } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { TeamSelection } from "@/components/match/team-selection"
import { OCRStatsUpload } from "@/components/match/ocr-stats-upload"
import { DragDropTeamBuilder } from "@/components/match/drag-drop-team-builder"
import { Users2, ImagePlus, Settings, ChevronDown, ChevronUp } from "lucide-react"

const STATUS_COLORS: Record<MatchStatus, string> = {
  DRAFT: "border-terminal-muted text-terminal-muted",
  CAPTAIN_VOTING: "border-purple-500 text-purple-500",
  TEAM_SELECTION: "border-matrix-500 text-matrix-500",
  MAP_PICK_BAN: "border-cyber-500 text-cyber-500",
  IN_PROGRESS: "border-green-500 text-green-500",
  VOTING: "border-yellow-500 text-yellow-500",
  COMPLETED: "border-matrix-500 text-matrix-500",
  CANCELLED: "border-red-500 text-red-500",
}

const STATUS_LABELS: Record<MatchStatus, string> = {
  DRAFT: "DRAFT",
  CAPTAIN_VOTING: "CAPTAIN VOTING",
  TEAM_SELECTION: "TEAM SELECT",
  MAP_PICK_BAN: "PICK/BAN",
  IN_PROGRESS: "IN PROGRESS",
  VOTING: "VOTING",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
}

export default function MatchDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const [match, setMatch] = useState<Match | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const matchId = params.id as string
  
  // Stats entry state
  const [showStatsEntry, setShowStatsEntry] = useState(false)
  const [showOCRUpload, setShowOCRUpload] = useState(false)
  const [isSubmittingStats, setIsSubmittingStats] = useState(false)
  const [eloResults, setEloResults] = useState<Array<{ userId: string; oldElo: number; newElo: number; change: number }> | null>(null)
  
  // Manual user add state
  const [showAddUserManual, setShowAddUserManual] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; username: string; discordId: string; elo: number }>>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  
  // ROOT Admin Override state
  const [showRootControls, setShowRootControls] = useState(false)
  const [rootTeamAlphaCaptain, setRootTeamAlphaCaptain] = useState<string | null>(null)
  const [rootTeamBravoCaptain, setRootTeamBravoCaptain] = useState<string | null>(null)
  const [rootTeamAlphaPlayers, setRootTeamAlphaPlayers] = useState<Array<{ userId: string }>>([])
  const [rootTeamBravoPlayers, setRootTeamBravoPlayers] = useState<Array<{ userId: string }>>([])

  const [mapsStats, setMapsStats] = useState<Array<{
    mapName: string;
    winnerTeamId: string;
    score: { alpha: number; bravo: number };
    playerStats: Array<{
      userId: string;
      teamId: string;
      kills: number | null;
      deaths: number | null;
      assists: number | null;
      acs: number | null;
      adr: number | null;
      headshotPercent: number | null;
      firstKills: number | null;
      firstDeaths: number | null;
      kast: number | null;
      multiKills: number | null;
      damageDelta: number | null;
    }>;
  }>>([])

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      router.push("/login")
      return
    }

    // Load match if authenticated
    loadMatch()
  }, [matchId, isAuthenticated, authLoading, router])

  async function loadMatch() {
    try {
      setIsLoading(true)
      const data = await fetchMatch(matchId)
      setMatch(data)
    } catch (error: any) {
      console.error("Failed to load match:", error)
      router.push("/matches")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleJoinMatch() {
    try {
      await joinMatch(matchId)
      loadMatch()
    } catch (error: any) {
      console.error("Failed to join match:", error)
    }
  }

  async function handleLeaveMatch() {
    try {
      await leaveMatch(matchId)
      loadMatch()
    } catch (error: any) {
      console.error("Failed to leave match:", error)
    }
  }

  async function handleDeleteMatch() {
    if (!confirm("Are you sure you want to delete this match?")) return
    
    try {
      await deleteMatch(matchId)
      router.push("/matches")
    } catch (error: any) {
      console.error("Failed to delete match:", error)
    }
  }

  async function handleAddTestUsers() {
    try {
      const result = await addTestUsersToMatch(matchId)
      loadMatch()
    } catch (error: any) {
      console.error("Failed to add test users:", error)
    }
  }

  async function loadAvailableUsers() {
    try {
      const { users } = await fetchUsers({ limit: 100 })
      setAvailableUsers(users.map(u => ({ id: u.id, username: u.username, discordId: u.discordId, elo: u.elo || 800 })))
    } catch (error: any) {
      console.error("Failed to load users:", error)
    }
  }

  async function handleAddUserManually() {
    if (!selectedUserId) {
      console.error("User ID is required")
      return
    }

    try {
      const result = await addUserToMatchManually(matchId, {
        userId: selectedUserId,
      })
      
      console.log(result.message)
      setShowAddUserManual(false)
      setSelectedUserId('')
      // Remove added user from available list
      setAvailableUsers(availableUsers.filter(u => u.id !== selectedUserId))
      loadMatch()
    } catch (error: any) {
      console.error("Failed to add user:", error)
    }
  }

  // ROOT Override functions
  async function handleRootAssignTeams() {
    try {
      console.log('Assigning teams:', {
        alpha: rootTeamAlphaPlayers,
        bravo: rootTeamBravoPlayers,
        alphaCaptain: rootTeamAlphaCaptain,
        bravoCaptain: rootTeamBravoCaptain,
      })

      await rootAssignTeams(matchId, {
        teamAlpha: rootTeamAlphaPlayers,
        teamBravo: rootTeamBravoPlayers,
        alphaCaptainId: rootTeamAlphaCaptain || undefined,
        bravoCaptainId: rootTeamBravoCaptain || undefined,
      })
      
      console.log("Teams assigned successfully")
      loadMatch()
    } catch (error: any) {
      console.error("Failed to assign teams:", error)
    }
  }

  async function handleRootSetStatus(status: string) {
    try {
      const validStatus = status as 'DRAFT' | 'CAPTAIN_VOTING' | 'TEAM_SELECTION' | 'MAP_PICK_BAN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
      await rootSetMatchStatus(matchId, validStatus)
      console.log(`Match status set to ${status}`)
      loadMatch()
    } catch (error: any) {
      console.error("Failed to set status:", error)
    }
  }

  async function handleRootSetMaps(maps: Array<{ mapName: string; action: any; wasPlayed?: boolean }>) {
    try {
      await rootSetMaps(matchId, maps.map(m => ({
        mapName: m.mapName,
        action: (m.action === 'DECIDER' ? 'PICK' : m.action) as 'PICK' | 'BAN',
        wasPlayed: m.wasPlayed,
      })))
      console.log("Maps set successfully")
      loadMatch()
    } catch (error: any) {
      console.error("Failed to set maps:", error)
    }
  }

  function handleOCRStatsImported(
    stats: Array<{
      userId: string
      teamId: string
      stats: {
        acs: number | null
        kills: number | null
        deaths: number | null
        assists: number | null
        adr: number | null
        headshotPercent: number | null
        kast: number | null
        firstKills: number | null
        firstDeaths: number | null
        multiKills: number | null
        damageDelta: number | null
      }
    }>
  ) {
    console.log('OCR Stats Import - Received stats for', stats.length, 'players')
    console.log('Current mapsStats length:', mapsStats.length)
    
    // Ensure mapsStats is initialized
    if (mapsStats.length === 0) {
      console.error('mapsStats not initialized')
      return
    }

    // Create a deep copy of mapsStats
    const updated = mapsStats.map(mapData => ({
      ...mapData,
      playerStats: [...mapData.playerStats]
    }))
    
    // Update each player's stats for the first map (Map 1)
    let updatedCount = 0
    stats.forEach(({ userId, teamId, stats: playerStats }) => {
      const playerIndex = updated[0].playerStats.findIndex(p => p.userId === userId)
      console.log(`Updating player ${userId}, found at index ${playerIndex}`)
      
      if (playerIndex !== -1) {
        updated[0].playerStats[playerIndex] = {
          userId: updated[0].playerStats[playerIndex].userId,
          teamId: updated[0].playerStats[playerIndex].teamId,
          kills: playerStats.kills,
          deaths: playerStats.deaths,
          assists: playerStats.assists,
          acs: playerStats.acs,
          adr: playerStats.adr,
          headshotPercent: playerStats.headshotPercent,
          firstKills: playerStats.firstKills,
          firstDeaths: playerStats.firstDeaths,
          kast: playerStats.kast,
          multiKills: playerStats.multiKills,
          damageDelta: playerStats.damageDelta,
        }
        updatedCount++
      }
    })
    
    console.log(`Updated ${updatedCount} players in the stats form`)
    setMapsStats(updated)
    setShowOCRUpload(false)
  }

  function isUserInMatch(): boolean {
    if (!user || !match) return false
    return match.teams.some(team =>
      team.members.some(member => member.user.id === user.id)
    )
  }

  function getTotalPlayers(): number {
    if (!match) return 0
    return match.teams.reduce((sum, team) => sum + team.members.length, 0)
  }

  // Initialize maps stats when showing stats entry
  useEffect(() => {
    if (showStatsEntry && match && mapsStats.length === 0) {
      const playedMaps = match.maps?.filter(m => m.wasPlayed) || []
      const maxMaps = match.seriesType === 'BO1' ? 1 : match.seriesType === 'BO3' ? 3 : 5
      
      const initialMaps: typeof mapsStats = []
      for (let i = 0; i < Math.max(playedMaps.length || 1, maxMaps); i++) {
        const map = playedMaps[i]
        const teamAlpha = match.teams.find(t => t.name === 'Team Alpha')
        const teamBravo = match.teams.find(t => t.name === 'Team Bravo')
        
        if (!teamAlpha || !teamBravo) continue
        
        const playerStats = [
          ...teamAlpha.members.map(m => ({
            userId: m.userId,
            teamId: teamAlpha.id,
            kills: null as number | null,
            deaths: null,
            assists: null,
            acs: null,
            adr: null,
            headshotPercent: null,
            firstKills: null,
            firstDeaths: null,
            kast: null,
            multiKills: null,
            damageDelta: null,
          })),
          ...teamBravo.members.map(m => ({
            userId: m.userId,
            teamId: teamBravo.id,
            kills: null as number | null,
            deaths: null,
            assists: null,
            acs: null,
            adr: null,
            headshotPercent: null,
            firstKills: null,
            firstDeaths: null,
            kast: null,
            multiKills: null,
            damageDelta: null,
          })),
        ]
        
        initialMaps.push({
          mapName: map?.mapName || `Map ${i + 1}`,
          winnerTeamId: map?.winnerTeamId || '',
          score: { alpha: 0, bravo: 0 },
          playerStats,
        })
      }
      
      setMapsStats(initialMaps)
    }
  }, [showStatsEntry, match, mapsStats.length])

  async function handleSubmitStats() {
    if (!match || !user) return
    
    // Check admin access
    if (user.role !== 'ROOT' && user.role !== 'ADMIN') {
      console.error("Admin access required")
      return
    }

    // Validate all maps have winner
    const invalidMaps = mapsStats.filter(m => !m.winnerTeamId)
    if (invalidMaps.length > 0) {
      console.error("Please select winner for all maps")
      return
    }

    // Validate all players have stats
    const hasEmptyStats = mapsStats.some(map =>
      map.playerStats.some(p =>
        p.kills === null || p.deaths === null || p.acs === null
      )
    )
    
    if (hasEmptyStats) {
      console.error("Please fill in all stats for all players")
      return
    }

    try {
      setIsSubmittingStats(true)
      
      // Determine overall winner (team with most maps won)
      const mapsWon = {
        alpha: mapsStats.filter(m => {
          const team = match.teams.find(t => t.id === m.winnerTeamId)
          return team?.name === 'Team Alpha'
        }).length,
        bravo: mapsStats.filter(m => {
          const team = match.teams.find(t => t.id === m.winnerTeamId)
          return team?.name === 'Team Bravo'
        }).length,
      }
      
      const winnerTeam = match.teams.find(t =>
        mapsWon.alpha > mapsWon.bravo ? t.name === 'Team Alpha' : t.name === 'Team Bravo'
      )
      
      if (!winnerTeam) {
        console.error("Could not determine winner")
        return
      }

      // Prepare stats for submission
      const statsToSubmit: MatchStatsSubmission = {
        maps: mapsStats.map(map => ({
          mapName: map.mapName,
          winnerTeamId: map.winnerTeamId,
          score: map.score,
          playerStats: map.playerStats.map(p => ({
            userId: p.userId,
            teamId: p.teamId,
            kills: p.kills ?? 0,
            deaths: p.deaths ?? 0,
            assists: p.assists ?? 0,
            acs: p.acs ?? 0,
            adr: p.adr ?? 0,
            headshotPercent: p.headshotPercent ?? 0,
            firstKills: p.firstKills ?? 0,
            firstDeaths: p.firstDeaths ?? 0,
            kast: p.kast ?? 0,
            multiKills: p.multiKills ?? 0,
            damageDelta: p.damageDelta ?? 0,
          })),
        })),
        winnerTeamId: winnerTeam.id,
        adminOverride: true,
      }

      // Submit stats (Elo calculation happens in backend, hidden)
      const result = await submitMatchStats(matchId, statsToSubmit)
      
      // Show Elo results with animation
      setEloResults(result.eloResults)
      
      // Reload match to show updated status
      setTimeout(() => {
        loadMatch()
        setShowStatsEntry(false)
        setMapsStats([])
        setEloResults(null)
      }, 3000) // Show results for 3 seconds
      
    } catch (error: any) {
      console.error("Failed to submit stats:", error)
    } finally {
      setIsSubmittingStats(false)
    }
  }

  function updateMapStat(
    mapIndex: number,
    playerIndex: number,
    field: string,
    value: number | null
  ) {
    const updated = [...mapsStats]
    updated[mapIndex].playerStats[playerIndex] = {
      ...updated[mapIndex].playerStats[playerIndex],
      [field]: value === null || value === undefined ? null : value,
    }
    setMapsStats(updated)
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

  // Don't show page if not authenticated (redirect will happen)
  if (!isAuthenticated) {
    return null
  }

  if (isLoading) {
    return (
      <div className="container relative py-10">
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="h-12 w-12 border-2 border-matrix-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!match) {
    return (
      <div className="container relative py-10">
        <Card className="border-terminal-muted">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <AlertCircle className="h-16 w-16 text-terminal-muted mb-4 opacity-50" />
            <p className="text-terminal-muted font-mono text-lg mb-2">Match not found</p>
            <Button onClick={() => router.push("/matches")} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Matches
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const userInMatch = isUserInMatch()
  const totalPlayers = getTotalPlayers()
  const isFull = totalPlayers >= 10
  const canJoin = match.status === "DRAFT" || match.status === "TEAM_SELECTION"

  return (
    <div className="container relative z-10 py-10 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/matches")}
            className="relative z-10"
            style={{ pointerEvents: 'auto' }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            BACK
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-mono uppercase text-matrix-500 neon-text">
              MATCH DETAILS
            </h1>
            <p className="text-terminal-muted font-mono mt-1">
              {match.seriesType} • {STATUS_LABELS[match.status]}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {userInMatch ? (
            <Button
              variant="outline"
              onClick={handleLeaveMatch}
              className="relative z-10 font-mono"
              style={{ pointerEvents: 'auto' }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              LEAVE
            </Button>
          ) : canJoin && !isFull ? (
            <Button
              onClick={handleJoinMatch}
              className="relative z-10 font-mono"
              style={{ pointerEvents: 'auto' }}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              JOIN
            </Button>
          ) : (
            <Button variant="outline" disabled className="font-mono">
              {isFull ? "FULL" : "LOCKED"}
            </Button>
          )}
          {user && user.role === "ROOT" && (
            <Button
              variant="outline"
              onClick={handleAddTestUsers}
              className="relative z-10 font-mono"
              style={{ pointerEvents: 'auto' }}
            >
              <Users2 className="mr-2 h-4 w-4" />
              ADD TEST USERS
            </Button>
          )}
          {user && (user.role === "ADMIN" || user.role === "ROOT") && (
            <Button
              variant="outline"
              onClick={() => {
                setShowAddUserManual(true)
                loadAvailableUsers()
              }}
              className="relative z-10 font-mono"
              style={{ pointerEvents: 'auto' }}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              ADD USER MANUALLY
            </Button>
          )}
          {user && (user.role === "ADMIN" || user.role === "ROOT") && (
            <Button
              variant="outline"
              onClick={handleDeleteMatch}
              className="relative z-10"
              style={{ pointerEvents: 'auto' }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </motion.div>

      {/* ROOT Admin Override Panel */}
      {user && user.role === "ROOT" && match && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative z-50"
          style={{ pointerEvents: 'auto' }}
        >
          <Card className="border-2 border-yellow-500/50 bg-yellow-500/5 relative z-50">
            <CardHeader 
              className="cursor-pointer hover:bg-yellow-500/10 transition-colors relative z-50"
              onClick={(e) => {
                e.stopPropagation()
                console.log('Clicked ROOT controls toggle')
                setShowRootControls(!showRootControls)
              }}
              style={{ pointerEvents: 'auto' }}
            >
              <div className="flex items-center justify-between" style={{ pointerEvents: 'none' }}>
                <CardTitle className="font-mono uppercase text-yellow-500 flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  ROOT ADMIN OVERRIDE
                </CardTitle>
                {showRootControls ? (
                  <ChevronUp className="h-5 w-5 text-yellow-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-yellow-500" />
                )}
              </div>
              <CardDescription className="font-mono text-xs text-yellow-400/70">
                Manually control all match settings (teams, captains, status, maps) - Click to expand
              </CardDescription>
            </CardHeader>

            {showRootControls && (
              <CardContent className="space-y-6">
                {/* Match Status Control */}
                <div className="space-y-2">
                  <Label className="font-mono text-sm text-yellow-400">MATCH STATUS</Label>
                  <select
                    value={match.status}
                    onChange={(e) => handleRootSetStatus(e.target.value as MatchStatus)}
                    className="font-mono text-sm bg-terminal-bg border-2 border-yellow-500/50 rounded px-3 py-2 text-yellow-400 w-full"
                    style={{ pointerEvents: 'auto' }}
                  >
                    <option value="DRAFT">DRAFT</option>
                    <option value="CAPTAIN_VOTING">CAPTAIN VOTING</option>
                    <option value="TEAM_SELECTION">TEAM SELECTION</option>
                    <option value="MAP_PICK_BAN">MAP PICK/BAN</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>

                {/* Team Assignment with Drag & Drop */}
                <div className="space-y-2">
                  <Label className="font-mono text-sm text-yellow-400">TEAM ASSIGNMENT</Label>
                  <DragDropTeamBuilder
                    availablePlayers={(() => {
                      // Get players from Player Pool only (unassigned players)
                      const playerPool = match.teams.find(t => t.name === 'Player Pool')
                      if (!playerPool) return []
                      return playerPool.members.map(m => ({
                        userId: m.userId,
                        username: m.user.username,
                        avatar: m.user.avatar || undefined,
                        discordId: m.user.discordId,
                        elo: m.user.elo || 800,
                      }))
                    })()}
                    teamAlphaPlayers={match.teams.find(t => t.name === 'Team Alpha')?.members.map(m => ({
                      userId: m.userId,
                      username: m.user.username,
                      avatar: m.user.avatar || undefined,
                      discordId: m.user.discordId,
                      elo: m.user.elo || 800,
                    })) || []}
                    teamBravoPlayers={match.teams.find(t => t.name === 'Team Bravo')?.members.map(m => ({
                      userId: m.userId,
                      username: m.user.username,
                      avatar: m.user.avatar || undefined,
                      discordId: m.user.discordId,
                      elo: m.user.elo || 800,
                    })) || []}
                    teamAlphaCaptain={match.teams.find(t => t.name === 'Team Alpha')?.captainId || undefined}
                    teamBravoCaptain={match.teams.find(t => t.name === 'Team Bravo')?.captainId || undefined}
                    onTeamChange={(alphaPlayers, bravoPlayers) => {
                      // Update state as user drags
                      console.log('onTeamChange fired:', { 
                        alphaCount: alphaPlayers.length, 
                        bravoCount: bravoPlayers.length,
                        alphaPlayers,
                        bravoPlayers 
                      })
                      setRootTeamAlphaPlayers(alphaPlayers.map(p => ({ userId: p.userId })))
                      setRootTeamBravoPlayers(bravoPlayers.map(p => ({ userId: p.userId })))
                    }}
                    onCaptainChange={(team, userId) => {
                      if (team === 'alpha') {
                        setRootTeamAlphaCaptain(userId)
                      } else {
                        setRootTeamBravoCaptain(userId)
                      }
                    }}
                    onConfirm={handleRootAssignTeams}
                  />
                </div>

                {/* Map Selection Control */}
                <div className="space-y-2">
                  <Label className="font-mono text-sm text-yellow-400">MAP SELECTIONS (BO{match.seriesType === 'BO1' ? '1' : match.seriesType === 'BO3' ? '3' : '5'})</Label>
                  <div className="space-y-2">
                    {['Ascent', 'Bind', 'Haven', 'Split', 'Lotus', 'Sunset', 'Breeze'].slice(0, match.seriesType === 'BO1' ? 1 : match.seriesType === 'BO3' ? 3 : 5).map((mapName, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          value={match.maps[idx]?.mapName || mapName}
                          readOnly
                          className="font-mono flex-1"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            // Create or update the map
                            const currentMap = match.maps[idx]
                            const newWasPlayed = !currentMap?.wasPlayed
                            
                            // Create a complete map object
                            const mapToUpdate = {
                              mapName: currentMap?.mapName || mapName,
                              action: (currentMap?.action || 'PICK') as 'PICK' | 'BAN',
                              wasPlayed: newWasPlayed,
                              teamId: currentMap?.teamId,
                            }
                            
                            // Build the full maps array
                            const allMaps = ['Ascent', 'Bind', 'Haven', 'Split', 'Lotus', 'Sunset', 'Breeze']
                              .slice(0, match.seriesType === 'BO1' ? 1 : match.seriesType === 'BO3' ? 3 : 5)
                              .map((name, i) => {
                                if (i === idx) return mapToUpdate
                                const existing = match.maps[i]
                                return {
                                  mapName: existing?.mapName || name,
                                  action: (existing?.action || 'PICK') as 'PICK' | 'BAN',
                                  wasPlayed: existing?.wasPlayed || false,
                                  teamId: existing?.teamId,
                                }
                              })
                            
                            handleRootSetMaps(allMaps)
                          }}
                          className={match.maps[idx]?.wasPlayed ? 'bg-green-500/20 border-green-500' : ''}
                          style={{ pointerEvents: 'auto' }}
                        >
                          {match.maps[idx]?.wasPlayed ? 'PLAYED' : 'NOT PLAYED'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </motion.div>
      )}

      {/* Match Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Card className={`border-2 ${STATUS_COLORS[match.status]}`}>
          <CardHeader>
            <CardTitle className="font-mono uppercase flex items-center justify-between">
              <span>MATCH INFO</span>
              <span className="text-sm">{formatTimestamp(match.createdAt)}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs font-mono uppercase text-terminal-muted mb-1">Series Type</p>
                <p className="font-mono text-matrix-500">{match.seriesType}</p>
              </div>
              <div>
                <p className="text-xs font-mono uppercase text-terminal-muted mb-1">Status</p>
                <p className={`font-mono ${STATUS_COLORS[match.status]}`}>
                  {STATUS_LABELS[match.status]}
                </p>
              </div>
              <div>
                <p className="text-xs font-mono uppercase text-terminal-muted mb-1">Players</p>
                <p className="font-mono text-matrix-500">{totalPlayers}/10</p>
              </div>
              <div>
                <p className="text-xs font-mono uppercase text-terminal-muted mb-1">Match ID</p>
                <p className="font-mono text-xs text-terminal-muted break-all">{match.id}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Teams - Only show when teams have been formed (not during draft, captain voting, or team selection) */}
      {match.status !== 'DRAFT' && match.status !== 'CAPTAIN_VOTING' && match.status !== 'TEAM_SELECTION' && (
        <div className="grid gap-6 md:grid-cols-2">
          {(() => {
            const teamAlpha = match.teams.find(t => t.name === 'Team Alpha') || null
            const teamBravo = match.teams.find(t => t.name === 'Team Bravo') || null
            
            return [
              { team: teamAlpha, name: 'Team Alpha', side: 'ATTACKER', borderColor: 'border-matrix-500', idx: 0 },
              { team: teamBravo, name: 'Team Bravo', side: 'DEFENDER', borderColor: 'border-cyber-500', idx: 1 }
            ].map(({ team, name, side, borderColor, idx }) => (
              <motion.div
                key={team?.id || name}
                initial={{ opacity: 0, x: idx === 0 ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + idx * 0.1 }}
              >
                <Card className={`border-2 ${borderColor}`}>
                  <CardHeader>
                    <CardTitle className="font-mono uppercase flex items-center justify-between">
                      <span>{name}</span>
                      <span className="text-xs text-terminal-muted">{side}</span>
                    </CardTitle>
                    {team?.captain && (
                      <CardDescription className="font-mono text-xs">
                        Captain: {team.captain.username}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {team && team.members.length > 0 ? (
                        team.members.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-3 p-2 rounded border border-terminal-border bg-terminal-panel/50"
                          >
                            <Avatar className="h-8 w-8">
                              {member.user.avatar ? (
                                <AvatarImage
                                  src={`https://cdn.discordapp.com/avatars/${member.user.discordId}/${member.user.avatar}.png?size=64`}
                                  alt={member.user.username}
                                />
                              ) : (
                                <AvatarFallback className="bg-terminal-panel text-matrix-500 text-xs">
                                  {member.user.username?.charAt(0).toUpperCase() || 'U'}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-mono text-sm text-matrix-500">{member.user.username}</p>
                              <p className="font-mono text-xs text-terminal-muted">
                                Elo: {member.user.elo || 800}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center py-4 text-terminal-muted font-mono text-sm">
                          No players yet
                        </p>
                      )}
                      <div className="pt-2 border-t border-terminal-border">
                        <p className="font-mono text-xs text-terminal-muted">
                          {team?.members.length || 0}/5 players
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          })()}
        </div>
      )}

          {/* Team Selection Phase */}
          {(match.status === 'DRAFT' || match.status === 'CAPTAIN_VOTING' || match.status === 'TEAM_SELECTION') && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <TeamSelection match={match} onMatchUpdate={loadMatch} />
            </motion.div>
          )}

      {/* Maps */}
      {match.maps && match.maps.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="font-mono uppercase">MAPS</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {match.maps.map((map) => (
                  <div
                    key={map.id}
                    className="flex items-center justify-between p-2 rounded border border-terminal-border"
                  >
                    <span className="font-mono text-sm text-matrix-500">{map.mapName}</span>
                    <span className="font-mono text-xs text-terminal-muted uppercase">{map.action}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stats Entry (Admin Only) */}
      {user && (user.role === 'ROOT' || user.role === 'ADMIN') && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {!showStatsEntry ? (
            <Card className="border-matrix-500">
              <CardHeader>
                <CardTitle className="font-mono uppercase">MATCH STATS</CardTitle>
                <CardDescription className="font-mono">
                  Enter match results and player stats to calculate Elo changes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  onClick={() => setShowStatsEntry(true)}
                  className="font-mono w-full"
                  style={{ pointerEvents: 'auto' }}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  ENTER STATS MANUALLY
                </Button>
                <Button
                  onClick={() => {
                    setShowStatsEntry(true)
                    setShowOCRUpload(true)
                  }}
                  variant="outline"
                  className="font-mono w-full border-matrix-500 text-matrix-500 hover:bg-matrix-500/10"
                  style={{ pointerEvents: 'auto' }}
                >
                  <ImagePlus className="mr-2 h-4 w-4" />
                  IMPORT FROM IMAGE (OCR)
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-matrix-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="font-mono uppercase">ENTER MATCH STATS</CardTitle>
                    <CardDescription className="font-mono">
                      Fill in stats for each map ({match.seriesType})
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowStatsEntry(false)
                      setMapsStats([])
                      setEloResults(null)
                    }}
                    className="font-mono"
                    style={{ pointerEvents: 'auto' }}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    CANCEL
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {mapsStats.map((mapData, mapIndex) => {
                  const teamAlpha = match.teams.find(t => t.name === 'Team Alpha')
                  const teamBravo = match.teams.find(t => t.name === 'Team Bravo')
                  if (!teamAlpha || !teamBravo) return null

                  const alphaPlayers = mapData.playerStats.filter(p => p.teamId === teamAlpha.id)
                  const bravoPlayers = mapData.playerStats.filter(p => p.teamId === teamBravo.id)

                  return (
                    <Card key={mapIndex} className="border-terminal-border">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="font-mono uppercase text-lg">{mapData.mapName}</CardTitle>
                          <div className="flex gap-2 items-center">
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                min="0"
                                max="15"
                                value={mapData.score.alpha}
                                onChange={(e) => {
                                  const updated = [...mapsStats]
                                  updated[mapIndex].score.alpha = parseInt(e.target.value) || 0
                                  setMapsStats(updated)
                                }}
                                placeholder="0"
                                className="font-mono w-16 text-center"
                                style={{ pointerEvents: 'auto' }}
                              />
                              <span className="font-mono text-matrix-500">-</span>
                              <Input
                                type="number"
                                min="0"
                                max="15"
                                value={mapData.score.bravo}
                                onChange={(e) => {
                                  const updated = [...mapsStats]
                                  updated[mapIndex].score.bravo = parseInt(e.target.value) || 0
                                  setMapsStats(updated)
                                }}
                                placeholder="0"
                                className="font-mono w-16 text-center"
                                style={{ pointerEvents: 'auto' }}
                              />
                            </div>
                            <select
                              value={mapData.winnerTeamId}
                              onChange={(e) => {
                                const updated = [...mapsStats]
                                updated[mapIndex].winnerTeamId = e.target.value
                                setMapsStats(updated)
                              }}
                              className="font-mono text-xs bg-terminal-bg border border-terminal-border rounded px-2 py-1 text-matrix-500 ml-4"
                              style={{ pointerEvents: 'auto' }}
                            >
                              <option value="">Select Winner</option>
                              <option value={teamAlpha.id}>Team Alpha</option>
                              <option value={teamBravo.id}>Team Bravo</option>
                            </select>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          {/* Team Alpha */}
                          <div className="space-y-3">
                            <p className="font-mono text-sm uppercase text-matrix-400 border-b border-terminal-border pb-2">
                              TEAM ALPHA
                            </p>
                            {alphaPlayers.map((player, playerIndex) => {
                              const globalIndex = mapData.playerStats.findIndex(p => p.userId === player.userId)
                              const playerUser = teamAlpha.members.find(m => m.userId === player.userId)?.user
                              
                              return (
                                <Card key={playerIndex} className="border-terminal-border bg-terminal-panel/30">
                                  <CardHeader className="pb-2">
                                    <CardTitle className="font-mono text-sm text-matrix-400">
                                      {playerUser?.username || 'Unknown'}
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="space-y-2">
                                    <div className="grid grid-cols-3 gap-1">
                                      <div className="space-y-1">
                                        <Label className="font-mono text-xs text-terminal-muted">K</Label>
                                        <Input
                                          type="text"
                                          inputMode="decimal"
                                          value={player.kills === null ? '' : player.kills.toString()}
                                          onChange={(e) => {
                                            const value = e.target.value.trim()
                                            updateMapStat(mapIndex, globalIndex, 'kills', value === '' ? null : parseFloat(value) || null)
                                          }}
                                          placeholder="0"
                                          className="font-mono text-xs h-7"
                                          style={{ pointerEvents: 'auto' }}
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="font-mono text-xs text-terminal-muted">D</Label>
                                        <Input
                                          type="text"
                                          inputMode="decimal"
                                          value={player.deaths === null ? '' : player.deaths.toString()}
                                          onChange={(e) => {
                                            const value = e.target.value.trim()
                                            updateMapStat(mapIndex, globalIndex, 'deaths', value === '' ? null : parseFloat(value) || null)
                                          }}
                                          placeholder="0"
                                          className="font-mono text-xs h-7"
                                          style={{ pointerEvents: 'auto' }}
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="font-mono text-xs text-terminal-muted">A</Label>
                                        <Input
                                          type="text"
                                          inputMode="decimal"
                                          value={player.assists === null ? '' : player.assists.toString()}
                                          onChange={(e) => {
                                            const value = e.target.value.trim()
                                            updateMapStat(mapIndex, globalIndex, 'assists', value === '' ? null : parseFloat(value) || null)
                                          }}
                                          placeholder="0"
                                          className="font-mono text-xs h-7"
                                          style={{ pointerEvents: 'auto' }}
                                        />
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1">
                                      <div className="space-y-1">
                                        <Label className="font-mono text-xs text-terminal-muted">ACS</Label>
                                        <Input
                                          type="text"
                                          inputMode="decimal"
                                          value={player.acs === null ? '' : player.acs.toString()}
                                          onChange={(e) => {
                                            const value = e.target.value.trim()
                                            updateMapStat(mapIndex, globalIndex, 'acs', value === '' ? null : parseFloat(value) || null)
                                          }}
                                          placeholder="0"
                                          className="font-mono text-xs h-7"
                                          style={{ pointerEvents: 'auto' }}
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="font-mono text-xs text-terminal-muted">ADR</Label>
                                        <Input
                                          type="text"
                                          inputMode="decimal"
                                          value={player.adr === null ? '' : player.adr.toString()}
                                          onChange={(e) => {
                                            const value = e.target.value.trim()
                                            updateMapStat(mapIndex, globalIndex, 'adr', value === '' ? null : parseFloat(value) || null)
                                          }}
                                          placeholder="0"
                                          className="font-mono text-xs h-7"
                                          style={{ pointerEvents: 'auto' }}
                                        />
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1">
                                      <div className="space-y-1">
                                        <Label className="font-mono text-xs text-terminal-muted">HS%</Label>
                                        <Input
                                          type="text"
                                          inputMode="decimal"
                                          value={player.headshotPercent === null ? '' : player.headshotPercent.toString()}
                                          onChange={(e) => {
                                            const value = e.target.value.trim()
                                            updateMapStat(mapIndex, globalIndex, 'headshotPercent', value === '' ? null : parseFloat(value) || null)
                                          }}
                                          placeholder="0"
                                          className="font-mono text-xs h-7"
                                          style={{ pointerEvents: 'auto' }}
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="font-mono text-xs text-terminal-muted">KAST%</Label>
                                        <Input
                                          type="text"
                                          inputMode="decimal"
                                          value={player.kast === null ? '' : player.kast.toString()}
                                          onChange={(e) => {
                                            const value = e.target.value.trim()
                                            updateMapStat(mapIndex, globalIndex, 'kast', value === '' ? null : parseFloat(value) || null)
                                          }}
                                          placeholder="0"
                                          className="font-mono text-xs h-7"
                                          style={{ pointerEvents: 'auto' }}
                                        />
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-1">
                                      <div className="space-y-1">
                                        <Label className="font-mono text-xs text-terminal-muted">FK</Label>
                                        <Input
                                          type="text"
                                          inputMode="decimal"
                                          value={player.firstKills === null ? '' : player.firstKills.toString()}
                                          onChange={(e) => {
                                            const value = e.target.value.trim()
                                            updateMapStat(mapIndex, globalIndex, 'firstKills', value === '' ? null : parseFloat(value) || null)
                                          }}
                                          placeholder="0"
                                          className="font-mono text-xs h-7"
                                          style={{ pointerEvents: 'auto' }}
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="font-mono text-xs text-terminal-muted">FD</Label>
                                        <Input
                                          type="text"
                                          inputMode="decimal"
                                          value={player.firstDeaths === null ? '' : player.firstDeaths.toString()}
                                          onChange={(e) => {
                                            const value = e.target.value.trim()
                                            updateMapStat(mapIndex, globalIndex, 'firstDeaths', value === '' ? null : parseFloat(value) || null)
                                          }}
                                          placeholder="0"
                                          className="font-mono text-xs h-7"
                                          style={{ pointerEvents: 'auto' }}
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="font-mono text-xs text-terminal-muted">MK</Label>
                                        <Input
                                          type="text"
                                          inputMode="decimal"
                                          value={player.multiKills === null ? '' : player.multiKills.toString()}
                                          onChange={(e) => {
                                            const value = e.target.value.trim()
                                            updateMapStat(mapIndex, globalIndex, 'multiKills', value === '' ? null : parseFloat(value) || null)
                                          }}
                                          placeholder="0"
                                          className="font-mono text-xs h-7"
                                          style={{ pointerEvents: 'auto' }}
                                        />
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="font-mono text-xs text-terminal-muted">DDΔ</Label>
                                      <Input
                                        type="text"
                                        inputMode="decimal"
                                        value={player.damageDelta === null ? '' : player.damageDelta.toString()}
                                        onChange={(e) => {
                                          const value = e.target.value.trim()
                                          if (value === '' || value === '-') {
                                            updateMapStat(mapIndex, globalIndex, 'damageDelta', null)
                                          } else if (/^-?\d*\.?\d*$/.test(value)) {
                                            updateMapStat(mapIndex, globalIndex, 'damageDelta', parseFloat(value) || null)
                                          }
                                        }}
                                        placeholder="0"
                                        className="font-mono text-xs h-7"
                                        style={{ pointerEvents: 'auto' }}
                                      />
                                    </div>
                                  </CardContent>
                                </Card>
                              )
                            })}
                          </div>

                          {/* Team Bravo */}
                          <div className="space-y-3">
                            <p className="font-mono text-sm uppercase text-cyber-400 border-b border-terminal-border pb-2">
                              TEAM BRAVO
                            </p>
                            {bravoPlayers.map((player, playerIndex) => {
                              const globalIndex = mapData.playerStats.findIndex(p => p.userId === player.userId)
                              const playerUser = teamBravo.members.find(m => m.userId === player.userId)?.user
                              
                              return (
                                <Card key={playerIndex} className="border-terminal-border bg-terminal-panel/30">
                                  <CardHeader className="pb-2">
                                    <CardTitle className="font-mono text-sm text-cyber-400">
                                      {playerUser?.username || 'Unknown'}
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="space-y-2">
                                    <div className="grid grid-cols-3 gap-1">
                                      <div className="space-y-1">
                                        <Label className="font-mono text-xs text-terminal-muted">K</Label>
                                        <Input
                                          type="text"
                                          inputMode="decimal"
                                          value={player.kills === null ? '' : player.kills.toString()}
                                          onChange={(e) => {
                                            const value = e.target.value.trim()
                                            updateMapStat(mapIndex, globalIndex, 'kills', value === '' ? null : parseFloat(value) || null)
                                          }}
                                          placeholder="0"
                                          className="font-mono text-xs h-7"
                                          style={{ pointerEvents: 'auto' }}
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="font-mono text-xs text-terminal-muted">D</Label>
                                        <Input
                                          type="text"
                                          inputMode="decimal"
                                          value={player.deaths === null ? '' : player.deaths.toString()}
                                          onChange={(e) => {
                                            const value = e.target.value.trim()
                                            updateMapStat(mapIndex, globalIndex, 'deaths', value === '' ? null : parseFloat(value) || null)
                                          }}
                                          placeholder="0"
                                          className="font-mono text-xs h-7"
                                          style={{ pointerEvents: 'auto' }}
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="font-mono text-xs text-terminal-muted">A</Label>
                                        <Input
                                          type="text"
                                          inputMode="decimal"
                                          value={player.assists === null ? '' : player.assists.toString()}
                                          onChange={(e) => {
                                            const value = e.target.value.trim()
                                            updateMapStat(mapIndex, globalIndex, 'assists', value === '' ? null : parseFloat(value) || null)
                                          }}
                                          placeholder="0"
                                          className="font-mono text-xs h-7"
                                          style={{ pointerEvents: 'auto' }}
                                        />
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1">
                                      <div className="space-y-1">
                                        <Label className="font-mono text-xs text-terminal-muted">ACS</Label>
                                        <Input
                                          type="text"
                                          inputMode="decimal"
                                          value={player.acs === null ? '' : player.acs.toString()}
                                          onChange={(e) => {
                                            const value = e.target.value.trim()
                                            updateMapStat(mapIndex, globalIndex, 'acs', value === '' ? null : parseFloat(value) || null)
                                          }}
                                          placeholder="0"
                                          className="font-mono text-xs h-7"
                                          style={{ pointerEvents: 'auto' }}
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="font-mono text-xs text-terminal-muted">ADR</Label>
                                        <Input
                                          type="text"
                                          inputMode="decimal"
                                          value={player.adr === null ? '' : player.adr.toString()}
                                          onChange={(e) => {
                                            const value = e.target.value.trim()
                                            updateMapStat(mapIndex, globalIndex, 'adr', value === '' ? null : parseFloat(value) || null)
                                          }}
                                          placeholder="0"
                                          className="font-mono text-xs h-7"
                                          style={{ pointerEvents: 'auto' }}
                                        />
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1">
                                      <div className="space-y-1">
                                        <Label className="font-mono text-xs text-terminal-muted">HS%</Label>
                                        <Input
                                          type="text"
                                          inputMode="decimal"
                                          value={player.headshotPercent === null ? '' : player.headshotPercent.toString()}
                                          onChange={(e) => {
                                            const value = e.target.value.trim()
                                            updateMapStat(mapIndex, globalIndex, 'headshotPercent', value === '' ? null : parseFloat(value) || null)
                                          }}
                                          placeholder="0"
                                          className="font-mono text-xs h-7"
                                          style={{ pointerEvents: 'auto' }}
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="font-mono text-xs text-terminal-muted">KAST%</Label>
                                        <Input
                                          type="text"
                                          inputMode="decimal"
                                          value={player.kast === null ? '' : player.kast.toString()}
                                          onChange={(e) => {
                                            const value = e.target.value.trim()
                                            updateMapStat(mapIndex, globalIndex, 'kast', value === '' ? null : parseFloat(value) || null)
                                          }}
                                          placeholder="0"
                                          className="font-mono text-xs h-7"
                                          style={{ pointerEvents: 'auto' }}
                                        />
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-1">
                                      <div className="space-y-1">
                                        <Label className="font-mono text-xs text-terminal-muted">FK</Label>
                                        <Input
                                          type="text"
                                          inputMode="decimal"
                                          value={player.firstKills === null ? '' : player.firstKills.toString()}
                                          onChange={(e) => {
                                            const value = e.target.value.trim()
                                            updateMapStat(mapIndex, globalIndex, 'firstKills', value === '' ? null : parseFloat(value) || null)
                                          }}
                                          placeholder="0"
                                          className="font-mono text-xs h-7"
                                          style={{ pointerEvents: 'auto' }}
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="font-mono text-xs text-terminal-muted">FD</Label>
                                        <Input
                                          type="text"
                                          inputMode="decimal"
                                          value={player.firstDeaths === null ? '' : player.firstDeaths.toString()}
                                          onChange={(e) => {
                                            const value = e.target.value.trim()
                                            updateMapStat(mapIndex, globalIndex, 'firstDeaths', value === '' ? null : parseFloat(value) || null)
                                          }}
                                          placeholder="0"
                                          className="font-mono text-xs h-7"
                                          style={{ pointerEvents: 'auto' }}
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="font-mono text-xs text-terminal-muted">MK</Label>
                                        <Input
                                          type="text"
                                          inputMode="decimal"
                                          value={player.multiKills === null ? '' : player.multiKills.toString()}
                                          onChange={(e) => {
                                            const value = e.target.value.trim()
                                            updateMapStat(mapIndex, globalIndex, 'multiKills', value === '' ? null : parseFloat(value) || null)
                                          }}
                                          placeholder="0"
                                          className="font-mono text-xs h-7"
                                          style={{ pointerEvents: 'auto' }}
                                        />
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="font-mono text-xs text-terminal-muted">DDΔ</Label>
                                      <Input
                                        type="text"
                                        inputMode="decimal"
                                        value={player.damageDelta === null ? '' : player.damageDelta.toString()}
                                        onChange={(e) => {
                                          const value = e.target.value.trim()
                                          if (value === '' || value === '-') {
                                            updateMapStat(mapIndex, globalIndex, 'damageDelta', null)
                                          } else if (/^-?\d*\.?\d*$/.test(value)) {
                                            updateMapStat(mapIndex, globalIndex, 'damageDelta', parseFloat(value) || null)
                                          }
                                        }}
                                        placeholder="0"
                                        className="font-mono text-xs h-7"
                                        style={{ pointerEvents: 'auto' }}
                                      />
                                    </div>
                                  </CardContent>
                                </Card>
                              )
                            })}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}

                {/* Elo Results Animation */}
                {eloResults && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-6"
                  >
                    <Card className="border-matrix-500 bg-matrix-500/10">
                      <CardHeader>
                        <CardTitle className="font-mono uppercase text-matrix-400">ELO CALCULATED</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-3">
                          {eloResults.map((result) => {
                            const player = match?.teams
                              .flatMap(t => t.members)
                              .find(m => m.userId === result.userId)?.user
                            
                            return (
                              <div
                                key={result.userId}
                                className="p-3 rounded border border-terminal-border bg-terminal-panel/50"
                              >
                                <p className="font-mono text-sm text-matrix-400 mb-1">
                                  {player?.username || 'Unknown'}
                                </p>
                                <p className={`font-mono text-lg font-bold ${result.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {result.change >= 0 ? '+' : ''}{result.change}
                                </p>
                                <p className="font-mono text-xs text-terminal-muted">
                                  {result.oldElo} → {result.newElo}
                                </p>
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t border-terminal-border">
                  <Button
                    variant="outline"
                    onClick={() => setShowOCRUpload(true)}
                    className="font-mono border-matrix-500 text-matrix-500 hover:bg-matrix-500/10"
                    style={{ pointerEvents: 'auto' }}
                  >
                    <ImagePlus className="mr-2 h-4 w-4" />
                    IMPORT FROM IMAGE
                  </Button>
                  <Button
                    onClick={handleSubmitStats}
                    disabled={isSubmittingStats}
                    className="font-mono flex-1"
                    style={{ pointerEvents: 'auto' }}
                  >
                    {isSubmittingStats ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        CALCULATING ELO...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        SUBMIT STATS & CALCULATE ELO
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}

      {/* OCR Stats Upload Modal */}
      {showOCRUpload && match && (
        <OCRStatsUpload
          matchPlayers={match.teams.flatMap(team => 
            team.members.map(member => ({
              userId: member.userId,
              username: member.user.username,
              teamId: team.id,
            }))
          )}
          onStatsExtracted={handleOCRStatsImported}
          onClose={() => setShowOCRUpload(false)}
        />
      )}

      {/* Manual Add User Modal */}
      {showAddUserManual && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          style={{ pointerEvents: 'auto' }}
        >
          <Card className="w-full max-w-md border-2 border-matrix-500 bg-terminal-bg">
            <CardHeader className="border-b border-terminal-border">
              <div className="flex items-center justify-between">
                <CardTitle className="font-mono uppercase text-matrix-500 flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  ADD USER MANUALLY
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddUserManual(false)}
                  className="relative z-10"
                  style={{ pointerEvents: 'auto' }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription className="font-mono text-xs">
                Add a user to this match without requiring them to log in
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label className="font-mono text-sm text-matrix-400">SELECT USER *</Label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="font-mono text-sm bg-terminal-bg border-2 border-matrix-500/50 rounded px-3 py-2 text-matrix-400 w-full"
                  style={{ pointerEvents: 'auto' }}
                >
                  <option value="">-- Select a user --</option>
                  {availableUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.username} (ELO: {u.elo})
                    </option>
                  ))}
                </select>
                <p className="font-mono text-xs text-terminal-muted">
                  User will be added to the player pool. Assign them to teams using the draft flow or ROOT override.
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddUserManual(false)
                    setSelectedUserId('')
                  }}
                  className="flex-1 font-mono"
                  style={{ pointerEvents: 'auto' }}
                >
                  CANCEL
                </Button>
                <Button
                  onClick={handleAddUserManually}
                  disabled={!selectedUserId}
                  className="flex-1 font-mono bg-matrix-500 hover:bg-matrix-600 text-black"
                  style={{ pointerEvents: 'auto' }}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  ADD TO POOL
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}

