"use client"

import { useState, useEffect } from "react"
import { motion, Reorder } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { GripVertical, Crown, X } from "lucide-react"

interface Player {
  userId: string
  username: string
  avatar?: string
  discordId: string
  elo: number
}

interface DragDropTeamBuilderProps {
  availablePlayers: Player[]
  teamAlphaPlayers: Player[]
  teamBravoPlayers: Player[]
  teamAlphaCaptain?: string // userId
  teamBravoCaptain?: string // userId
  onTeamChange: (alphaPlayers: Player[], bravoPlayers: Player[]) => void
  onCaptainChange: (team: 'alpha' | 'bravo', userId: string | null) => void
  onConfirm: () => void
  maxPerTeam?: number
}

export function DragDropTeamBuilder({
  availablePlayers,
  teamAlphaPlayers: initialAlpha,
  teamBravoPlayers: initialBravo,
  teamAlphaCaptain,
  teamBravoCaptain,
  onTeamChange,
  onCaptainChange,
  onConfirm,
  maxPerTeam = 5,
}: DragDropTeamBuilderProps) {
  const [teamAlpha, setTeamAlpha] = useState<Player[]>(initialAlpha)
  const [teamBravo, setTeamBravo] = useState<Player[]>(initialBravo)
  
  // Calculate unassigned players by removing those already in teams
  const unassigned = availablePlayers.filter(player => {
    const inAlpha = teamAlpha.some(p => p.userId === player.userId)
    const inBravo = teamBravo.some(p => p.userId === player.userId)
    return !inAlpha && !inBravo
  })

  // Sync with props when they change
  useEffect(() => {
    setTeamAlpha(initialAlpha)
    setTeamBravo(initialBravo)
  }, [initialAlpha, initialBravo])

  const moveToAlpha = (player: Player) => {
    if (teamAlpha.length >= maxPerTeam) return
    
    // Check if already in alpha
    if (teamAlpha.some(p => p.userId === player.userId)) return

    // Remove from bravo if there
    const newBravo = teamBravo.filter(p => p.userId !== player.userId)
    const newAlpha = [...teamAlpha, player]
    
    setTeamBravo(newBravo)
    setTeamAlpha(newAlpha)
    onTeamChange(newAlpha, newBravo)
  }

  const moveToBravo = (player: Player) => {
    if (teamBravo.length >= maxPerTeam) return
    
    // Check if already in bravo
    if (teamBravo.some(p => p.userId === player.userId)) return

    // Remove from alpha if there
    const newAlpha = teamAlpha.filter(p => p.userId !== player.userId)
    const newBravo = [...teamBravo, player]
    
    setTeamAlpha(newAlpha)
    setTeamBravo(newBravo)
    onTeamChange(newAlpha, newBravo)
  }

  const moveToUnassigned = (player: Player) => {
    const newAlpha = teamAlpha.filter(p => p.userId !== player.userId)
    const newBravo = teamBravo.filter(p => p.userId !== player.userId)
    
    setTeamAlpha(newAlpha)
    setTeamBravo(newBravo)
    onTeamChange(newAlpha, newBravo)
  }

  const renderPlayer = (player: Player, team?: 'alpha' | 'bravo') => {
    const isCaptain = (team === 'alpha' && player.userId === teamAlphaCaptain) ||
                      (team === 'bravo' && player.userId === teamBravoCaptain)

    return (
      <motion.div
        key={player.userId}
        layout
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className="relative"
      >
        <div
          className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
            team === 'alpha'
              ? 'border-matrix-500 bg-matrix-500/10 hover:bg-matrix-500/20'
              : team === 'bravo'
              ? 'border-cyber-500 bg-cyber-500/10 hover:bg-cyber-500/20'
              : 'border-terminal-border bg-terminal-panel hover:bg-terminal-panel/70'
          }`}
          style={{ pointerEvents: 'auto' }}
        >
          <GripVertical className="h-4 w-4 text-terminal-muted flex-shrink-0" />
          
          <Avatar className="h-10 w-10">
            {player.avatar && player.discordId ? (
              <AvatarImage
                src={`https://cdn.discordapp.com/avatars/${player.discordId}/${player.avatar}.png?size=64`}
                alt={player.username}
              />
            ) : (
              <AvatarFallback className="bg-terminal-panel text-matrix-500">
                {player.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-mono text-sm text-matrix-400 truncate">
                {player.username}
              </p>
              {isCaptain && (
                <Crown className="h-4 w-4 text-yellow-500 flex-shrink-0" />
              )}
            </div>
            <p className="font-mono text-xs text-terminal-muted">
              ELO: {player.elo}
            </p>
          </div>

          {!team && (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation()
                  moveToAlpha(player)
                }}
                disabled={teamAlpha.length >= maxPerTeam}
                className="h-7 px-2 text-xs border-matrix-500 text-matrix-500"
                style={{ pointerEvents: 'auto' }}
              >
                → Alpha
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation()
                  moveToBravo(player)
                }}
                disabled={teamBravo.length >= maxPerTeam}
                className="h-7 px-2 text-xs border-cyber-500 text-cyber-500"
                style={{ pointerEvents: 'auto' }}
              >
                → Bravo
              </Button>
            </div>
          )}

          {team && (
            <div className="flex gap-1">
              {!isCaptain && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    onCaptainChange(team, player.userId)
                  }}
                  className="h-7 px-2 text-xs"
                  style={{ pointerEvents: 'auto' }}
                >
                  <Crown className="h-3 w-3" />
                </Button>
              )}
              {isCaptain && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    onCaptainChange(team, null)
                  }}
                  className="h-7 px-2 text-xs text-yellow-500"
                  style={{ pointerEvents: 'auto' }}
                >
                  <Crown className="h-3 w-3 fill-yellow-500" />
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation()
                  moveToUnassigned(player)
                }}
                className="h-7 px-2 text-xs"
                style={{ pointerEvents: 'auto' }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    )
  }

  const allAssigned = unassigned.length === 0
  const bothTeamsFull = teamAlpha.length === maxPerTeam && teamBravo.length === maxPerTeam

  return (
    <div className="space-y-6">
      {/* Unassigned Players */}
      {unassigned.length > 0 && (
        <Card className="border-terminal-border">
          <CardHeader>
            <CardTitle className="font-mono uppercase text-terminal-muted flex items-center justify-between">
              <span>UNASSIGNED PLAYERS</span>
              <span className="text-xs">{unassigned.length} remaining</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unassigned.map(player => renderPlayer(player))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Teams Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Team Alpha */}
        <Card className="border-2 border-matrix-500">
          <CardHeader>
            <CardTitle className="font-mono uppercase text-matrix-400 flex items-center justify-between">
              <span>TEAM ALPHA</span>
              <span className="text-xs">{teamAlpha.length}/{maxPerTeam}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 min-h-[100px]">
              {teamAlpha.length === 0 ? (
                <p className="text-center py-8 font-mono text-xs text-terminal-muted">
                  Drag players here or click "→ Alpha"
                </p>
              ) : (
                teamAlpha.map(player => renderPlayer(player, 'alpha'))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Team Bravo */}
        <Card className="border-2 border-cyber-500">
          <CardHeader>
            <CardTitle className="font-mono uppercase text-cyber-400 flex items-center justify-between">
              <span>TEAM BRAVO</span>
              <span className="text-xs">{teamBravo.length}/{maxPerTeam}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 min-h-[100px]">
              {teamBravo.length === 0 ? (
                <p className="text-center py-8 font-mono text-xs text-terminal-muted">
                  Drag players here or click "→ Bravo"
                </p>
              ) : (
                teamBravo.map(player => renderPlayer(player, 'bravo'))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirm Button */}
      <div className="flex justify-end">
        <Button
          onClick={(e) => {
            e.stopPropagation()
            console.log('CONFIRM TEAMS clicked', { teamAlpha, teamBravo })
            onConfirm()
          }}
          disabled={!allAssigned || !bothTeamsFull}
          className="font-mono bg-matrix-500 hover:bg-matrix-600 text-black"
          style={{ pointerEvents: 'auto' }}
        >
          {!allAssigned
            ? `ASSIGN ${unassigned.length} MORE PLAYER${unassigned.length > 1 ? 'S' : ''}`
            : !bothTeamsFull
            ? 'TEAMS NOT FULL'
            : 'CONFIRM TEAMS'}
        </Button>
      </div>
    </div>
  )
}

