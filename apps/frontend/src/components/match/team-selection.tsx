"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import {
  Users,
  Dice1,
  TrendingUp,
  Crown,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ArrowRight,
} from "lucide-react"
import {
  startCaptainVoting,
  voteForCaptain,
  getCaptainVotes,
  finalizeCaptains,
  assignTeams,
  finalizeTeams,
  captainPickPlayer,
  resetTeams,
  Match,
} from "@/lib/api"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

type AllocationMethod = "random" | "elo" | "captain"

interface TeamSelectionProps {
  match: Match
  onMatchUpdate: () => void
}

export function TeamSelection({ match, onMatchUpdate }: TeamSelectionProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [captainVotes, setCaptainVotes] = useState<Record<string, number>>({})
  const [userVote, setUserVote] = useState<string | null>(null)
  const [allocationMethod, setAllocationMethod] = useState<AllocationMethod | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const isAdmin = user && ['ADMIN', 'ROOT'].includes(user.role)
  const totalPlayers = match.teams.reduce((sum, team) => sum + team.members.length, 0)
  const teamAlpha = match.teams.find(t => t.name === 'Team Alpha')
  const teamBravo = match.teams.find(t => t.name === 'Team Bravo')
  const availablePlayers = match.teams.flatMap(team =>
    team.members.map(member => member.user)
  )

  // Load captain votes when in CAPTAIN_VOTING phase
  useEffect(() => {
    if (match.status === 'CAPTAIN_VOTING') {
      loadCaptainVotes()
    }
  }, [match.status, match.id])

  async function loadCaptainVotes() {
    try {
      const response = await getCaptainVotes(match.id)
      setCaptainVotes(response.voteCounts)
      const currentUserVote = response.votes.find((v: any) => v.userId === user?.id)
      if (currentUserVote) {
        setUserVote(currentUserVote.candidateId)
      }
    } catch (error) {
      console.error("Failed to load captain votes:", error)
    }
  }

  async function handleStartCaptainVoting() {
    try {
      setIsLoading(true)
      await startCaptainVoting(match.id)
      toast({
        title: "Captain Voting Started",
        description: "All players can now vote for captains",
      })
      onMatchUpdate()
    } catch (error: any) {
      console.error("Failed to start captain voting:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to start captain voting",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleVoteForCaptain(candidateId: string) {
    try {
      setIsLoading(true)
      await voteForCaptain(match.id, candidateId)
      setUserVote(candidateId)
      toast({
        title: "Vote Recorded",
        description: "Your vote has been recorded",
      })
      await loadCaptainVotes()
      onMatchUpdate()
    } catch (error: any) {
      console.error("Failed to vote:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to vote",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleFinalizeCaptains() {
    try {
      setIsLoading(true)
      await finalizeCaptains(match.id)
      toast({
        title: "Captains Finalized",
        description: "Moving to team allocation phase",
      })
      onMatchUpdate()
    } catch (error: any) {
      console.error("Failed to finalize captains:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to finalize captains",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleAssignTeams(method: 'random' | 'elo') {
    try {
      setIsLoading(true)
      await assignTeams(match.id, method)
      setAllocationMethod(method)
      setShowPreview(true)
      toast({
        title: "Teams Assigned",
        description: `Teams assigned using ${method} method. Review and finalize or reroll.`,
      })
      onMatchUpdate()
    } catch (error: any) {
      console.error("Failed to assign teams:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to assign teams",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleRerollTeams() {
    try {
      setIsLoading(true)
      await resetTeams(match.id)
      setShowPreview(false)
      toast({
        title: "Teams Reset",
        description: "Teams have been cleared. Assign again.",
      })
      onMatchUpdate()
    } catch (error: any) {
      console.error("Failed to reset teams:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to reset teams",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleFinalizeTeams() {
    try {
      setIsLoading(true)
      await finalizeTeams(match.id)
      toast({
        title: "Teams Finalized",
        description: "Moving to map pick/ban phase",
      })
      onMatchUpdate()
    } catch (error: any) {
      console.error("Failed to finalize teams:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to finalize teams",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // DRAFT Phase: Wait for 10 players, then show "Start Captain Voting"
  if (match.status === 'DRAFT') {
    if (totalPlayers < 10) {
      return (
        <Card className="border-terminal-muted">
          <CardHeader>
            <CardTitle className="font-mono uppercase">PREPARATION PHASE</CardTitle>
            <CardDescription className="font-mono">
              Waiting for players to join ({totalPlayers}/10)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isAdmin ? (
              <div className="space-y-3">
                <p className="text-center text-terminal-muted font-mono text-sm mb-3">
                  Waiting for {10 - totalPlayers} more player{10 - totalPlayers !== 1 ? 's' : ''}...
                </p>
                <Button
                  onClick={handleStartCaptainVoting}
                  disabled={isLoading}
                  className="w-full font-mono relative z-10"
                  style={{ pointerEvents: 'auto' }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      STARTING...
                    </>
                  ) : (
                    <>
                      <Users className="mr-2 h-4 w-4" />
                      START CAPTAIN VOTING (ADMIN OVERRIDE)
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <p className="text-center text-terminal-muted font-mono text-sm">
                Waiting for {10 - totalPlayers} more player{10 - totalPlayers !== 1 ? 's' : ''}...
              </p>
            )}
          </CardContent>
        </Card>
      )
    } else {
      // 10 players ready, show start captain voting button
      return (
        <Card className="border-matrix-500">
          <CardHeader>
            <CardTitle className="font-mono uppercase">READY TO START</CardTitle>
            <CardDescription className="font-mono">
              All players are ready ({totalPlayers}/10)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleStartCaptainVoting}
              disabled={isLoading}
              className="w-full font-mono relative z-10"
              style={{ pointerEvents: 'auto' }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  STARTING...
                </>
              ) : (
                <>
                  <Crown className="mr-2 h-4 w-4" />
                  START CAPTAIN VOTING
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )
    }
  }

  // CAPTAIN_VOTING Phase: Show voting UI
  if (match.status === 'CAPTAIN_VOTING') {
    const playersInMatch = availablePlayers.filter(p => p.id !== user?.id) // Can't vote for self
    const totalVotes = Object.values(captainVotes).reduce((sum, count) => sum + count, 0)
    const allVoted = totalVotes >= totalPlayers

    return (
      <Card className="border-purple-500">
        <CardHeader>
          <CardTitle className="font-mono uppercase">VOTE FOR CAPTAINS</CardTitle>
          <CardDescription className="font-mono">
            Select two players to be team captains ({totalVotes}/{totalPlayers} votes)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {playersInMatch.map((player) => (
              <Button
                key={player.id}
                variant={userVote === player.id ? 'default' : 'outline'}
                onClick={() => handleVoteForCaptain(player.id)}
                disabled={isLoading || userVote !== null}
                className="font-mono justify-start relative z-10"
                style={{ pointerEvents: 'auto' }}
              >
                <Avatar className="h-6 w-6 mr-2">
                  {player.avatar ? (
                    <AvatarImage
                      src={`https://cdn.discordapp.com/avatars/${player.discordId}/${player.avatar}.png?size=32`}
                      alt={player.username}
                    />
                  ) : (
                    <AvatarFallback className="bg-terminal-panel text-matrix-500 text-xs">
                      {player.username?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  )}
                </Avatar>
                {player.username} ({captainVotes[player.id] || 0} votes)
                {userVote === player.id && <CheckCircle2 className="ml-auto h-4 w-4 text-green-500" />}
              </Button>
            ))}
          </div>
          {userVote && (
            <p className="text-center text-terminal-muted font-mono text-sm">
              You have voted. Waiting for other players...
            </p>
          )}
          {allVoted && (
            <Button
              onClick={handleFinalizeCaptains}
              disabled={isLoading}
              className="w-full font-mono relative z-10"
              style={{ pointerEvents: 'auto' }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  FINALIZING...
                </>
              ) : (
                <>
                  <ArrowRight className="mr-2 h-4 w-4" />
                  FINALIZE CAPTAINS
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  // TEAM_SELECTION Phase: Show team allocation options
  if (match.status === 'TEAM_SELECTION') {
    // If teams are assigned and preview is shown
    if (showPreview && teamAlpha && teamBravo && (teamAlpha.members.length > 0 || teamBravo.members.length > 0)) {
      return (
        <Card className="border-matrix-500">
          <CardHeader>
            <CardTitle className="font-mono uppercase">TEAM PREVIEW</CardTitle>
            <CardDescription className="font-mono">
              Review the team allocation. Reroll or finalize.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="border-2 border-matrix-500 rounded p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-matrix-500">TEAM ALPHA</span>
                  <span className="font-mono text-xs text-terminal-muted">
                    {teamAlpha.members.length}/5
                  </span>
                </div>
                {teamAlpha.captain && (
                  <p className="font-mono text-xs text-terminal-muted mb-2">
                    Captain: {teamAlpha.captain.username}
                  </p>
                )}
                <div className="space-y-1">
                  {teamAlpha.members.map((member) => (
                    <div key={member.id} className="font-mono text-sm text-matrix-500">
                      • {member.user.username} (Elo: {member.user.elo || 800})
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-2 border-cyber-500 rounded p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-cyber-500">TEAM BRAVO</span>
                  <span className="font-mono text-xs text-terminal-muted">
                    {teamBravo.members.length}/5
                  </span>
                </div>
                {teamBravo.captain && (
                  <p className="font-mono text-xs text-terminal-muted mb-2">
                    Captain: {teamBravo.captain.username}
                  </p>
                )}
                <div className="space-y-1">
                  {teamBravo.members.map((member) => (
                    <div key={member.id} className="font-mono text-sm text-cyber-500">
                      • {member.user.username} (Elo: {member.user.elo || 800})
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleRerollTeams}
                disabled={isLoading}
                variant="outline"
                className="flex-1 font-mono relative z-10"
                style={{ pointerEvents: 'auto' }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                REROLL
              </Button>
              <Button
                onClick={handleFinalizeTeams}
                disabled={isLoading || (teamAlpha.members.length !== 5 || teamBravo.members.length !== 5)}
                className="flex-1 font-mono relative z-10"
                style={{ pointerEvents: 'auto' }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    FINALIZING...
                  </>
                ) : (
                  <>
                    <ArrowRight className="mr-2 h-4 w-4" />
                    FINALIZE TEAMS
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )
    }

    // Show team allocation options
    return (
      <Card className="border-matrix-500">
        <CardHeader>
          <CardTitle className="font-mono uppercase">SELECT TEAM ALLOCATION METHOD</CardTitle>
          <CardDescription className="font-mono">
            Captains have been selected. Choose how teams will be allocated.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <Button
              variant={allocationMethod === 'random' ? 'default' : 'outline'}
              onClick={() => handleAssignTeams('random')}
              disabled={isLoading}
              className="font-mono justify-start relative z-10"
              style={{ pointerEvents: 'auto' }}
            >
              <Dice1 className="mr-2 h-4 w-4" />
              RANDOM - Randomly assign players to teams
            </Button>
            <Button
              variant={allocationMethod === 'elo' ? 'default' : 'outline'}
              onClick={() => handleAssignTeams('elo')}
              disabled={isLoading}
              className="font-mono justify-start relative z-10"
              style={{ pointerEvents: 'auto' }}
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              ELO BALANCED - Balance teams by Elo rating
            </Button>
            <Button
              variant={allocationMethod === 'captain' ? 'default' : 'outline'}
              onClick={() => {
                setAllocationMethod('captain')
                toast({
                  title: "Captain Draft",
                  description: "Captain draft mode coming soon",
                })
              }}
              disabled={isLoading}
              className="font-mono justify-start relative z-10"
              style={{ pointerEvents: 'auto' }}
            >
              <Crown className="mr-2 h-4 w-4" />
              CAPTAIN DRAFT - Captains pick players (Coming Soon)
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return null
}
