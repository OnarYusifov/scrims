"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Crown, X, UserMinus } from "lucide-react"

interface Player {
  userId: string
  username: string
  avatar?: string
  discordId: string
  elo: number
  // Lifetime stats (from User model)
  totalKills?: number
  totalDeaths?: number
  totalAssists?: number
  totalACS?: number
  totalADR?: number
  matchesPlayed?: number
  // Per-map stats (would need to be aggregated from PlayerMatchStats)
  // These are not in User model, so we'll need to add them or calculate from match history
  avgHeadshotPercent?: number
  avgKAST?: number
  avgDamageDelta?: number
  totalFirstKills?: number
  totalFirstDeaths?: number
  totalMultiKills?: number
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
  onRemovePlayer?: (userId: string) => void // Optional: for admins to kick players
  canRemovePlayers?: boolean // Whether remove buttons should be shown
  isLocked?: boolean // Whether the match is locked (e.g., cancelled)
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
  onRemovePlayer,
  canRemovePlayers = false,
  isLocked = false,
  maxPerTeam = 5,
}: DragDropTeamBuilderProps) {
  const [teamAlpha, setTeamAlpha] = useState<Player[]>(initialAlpha)
  const [teamBravo, setTeamBravo] = useState<Player[]>(initialBravo)
  const [lastPropsHash, setLastPropsHash] = useState<string>('')
  const isUserInteracting = useRef(false)
  
  // Calculate unassigned players by removing those already in teams
  // Use internal state (teamAlpha, teamBravo) to determine what's assigned
  // This ensures immediate UI updates when players are moved
  const unassigned = availablePlayers.filter(player => {
    const inAlpha = teamAlpha.some(p => p.userId === player.userId)
    const inBravo = teamBravo.some(p => p.userId === player.userId)
    const isAssigned = inAlpha || inBravo
    return !isAssigned
  })

  // Create a hash of the props to detect actual changes
  const propsHash = JSON.stringify({
    alpha: initialAlpha.map(p => p.userId).sort(),
    bravo: initialBravo.map(p => p.userId).sort(),
  })

  // Initialize hash on mount
  useEffect(() => {
    if (lastPropsHash === '') {
      setLastPropsHash(propsHash)
    }
  }, [propsHash, lastPropsHash])

  // Only sync with props when they actually change (not on every render)
  useEffect(() => {
    // Don't sync if user is currently interacting
    if (isUserInteracting.current) {
      console.log('Skipping prop sync - user is interacting')
      return
    }
    
    // Only update if the props actually changed (different hash)
    // AND we're not in the middle of a user interaction (hash is already set)
    if (propsHash !== lastPropsHash && lastPropsHash !== '') {
      // Compare current internal state with new props
      // Only sync if the team assignments actually changed on the server
      const currentStateHash = JSON.stringify({
        alpha: teamAlpha.map(p => p.userId).sort(),
        bravo: teamBravo.map(p => p.userId).sort(),
      })
      
      // If current state matches new props, don't sync (nothing changed)
      if (currentStateHash === propsHash) {
        console.log('State already matches props - skipping sync')
        setLastPropsHash(propsHash)
        return
      }
      
      console.log('Props changed, syncing state:', { 
        propsHash, 
        lastPropsHash,
        currentStateHash,
        initialAlpha: initialAlpha.map(p => p.username),
        initialBravo: initialBravo.map(p => p.username),
        currentAlpha: teamAlpha.map(p => p.username),
        currentBravo: teamBravo.map(p => p.username)
      })
    setTeamAlpha(initialAlpha)
    setTeamBravo(initialBravo)
      setLastPropsHash(propsHash)
    }
  }, [propsHash, lastPropsHash, initialAlpha, initialBravo, teamAlpha, teamBravo])

  const moveToAlpha = (player: Player) => {
    if (isLocked) {
      return // Locked - don't allow changes
    }
    console.log('moveToAlpha called:', { player, currentAlpha: teamAlpha.length, maxPerTeam })
    
    // Mark that user is interacting
    isUserInteracting.current = true
    
    if (teamAlpha.length >= maxPerTeam) {
      console.log('Team Alpha is full')
      isUserInteracting.current = false
      return
    }
    
    // Check if already in alpha
    if (teamAlpha.some(p => p.userId === player.userId)) {
      console.log('Player already in Alpha')
      isUserInteracting.current = false
      return
    }

    // Remove from bravo if there
    const newBravo = teamBravo.filter(p => p.userId !== player.userId)
    const newAlpha = [...teamAlpha, player]
    
    console.log('Updating teams:', { 
      newAlphaCount: newAlpha.length, 
      newBravoCount: newBravo.length,
      newAlpha: newAlpha.map(p => p.username),
      newBravo: newBravo.map(p => p.username)
    })
    
    // Update state immediately
    setTeamAlpha(newAlpha)
    setTeamBravo(newBravo)
    
    // Notify parent component
    onTeamChange(newAlpha, newBravo)
    
    // Reset interaction flag after a short delay to allow state to settle
    setTimeout(() => {
      isUserInteracting.current = false
    }, 100)
  }

  const moveToBravo = (player: Player) => {
    if (isLocked) {
      return // Locked - don't allow changes
    }
    console.log('moveToBravo called:', { player, currentBravo: teamBravo.length, maxPerTeam })
    
    // Mark that user is interacting
    isUserInteracting.current = true
    
    if (teamBravo.length >= maxPerTeam) {
      console.log('Team Bravo is full')
      isUserInteracting.current = false
      return
    }
    
    // Check if already in bravo
    if (teamBravo.some(p => p.userId === player.userId)) {
      console.log('Player already in Bravo')
      isUserInteracting.current = false
      return
    }

    // Remove from alpha if there
    const newAlpha = teamAlpha.filter(p => p.userId !== player.userId)
    const newBravo = [...teamBravo, player]
    
    console.log('Updating teams:', { 
      newAlphaCount: newAlpha.length, 
      newBravoCount: newBravo.length,
      newAlpha: newAlpha.map(p => p.username),
      newBravo: newBravo.map(p => p.username)
    })
    
    // Update state immediately
    setTeamAlpha(newAlpha)
    setTeamBravo(newBravo)
    
    // Notify parent component
    onTeamChange(newAlpha, newBravo)
    
    // Reset interaction flag after a short delay to allow state to settle
    setTimeout(() => {
      isUserInteracting.current = false
    }, 100)
  }

  const moveToUnassigned = (player: Player) => {
    if (isLocked) {
      return // Locked - don't allow changes
    }
    console.log('moveToUnassigned called:', { player })
    
    // Mark that user is interacting
    isUserInteracting.current = true
    
    const newAlpha = teamAlpha.filter(p => p.userId !== player.userId)
    const newBravo = teamBravo.filter(p => p.userId !== player.userId)
    
    console.log('Removing from teams:', { 
      newAlphaCount: newAlpha.length, 
      newBravoCount: newBravo.length
    })
    
    // Update state immediately
    setTeamAlpha(newAlpha)
    setTeamBravo(newBravo)
    
    // Notify parent component
    onTeamChange(newAlpha, newBravo)
    
    // Reset interaction flag after a short delay to allow state to settle
    setTimeout(() => {
      isUserInteracting.current = false
    }, 100)
  }

  const renderPlayer = (player: Player, team?: 'alpha' | 'bravo') => {
    const isCaptain = (team === 'alpha' && player.userId === teamAlphaCaptain) ||
                      (team === 'bravo' && player.userId === teamBravoCaptain)

    // Calculate stats from lifetime totals
    const kills = player.totalKills || 0
    const deaths = player.totalDeaths || 0
    const assists = player.totalAssists || 0
    const totalACS = player.totalACS || 0
    const totalADR = player.totalADR || 0
    const matches = player.matchesPlayed || 0
    
    // Averages (per match)
    const avgKD = deaths > 0 ? (kills / deaths).toFixed(2) : kills > 0 ? kills.toFixed(2) : '0.00'
    const avgACS = matches > 0 ? Math.round(totalACS / matches) : 0
    const avgADR = matches > 0 ? Math.round(totalADR / matches) : 0
    const plusMinus = kills - deaths
    
    // Per-map stats (from aggregated PlayerMatchStats - would need backend aggregation)
    const avgHS = player.avgHeadshotPercent || 0
    const avgKAST = player.avgKAST || 0
    const avgDamageDelta = player.avgDamageDelta || 0
    const totalFK = player.totalFirstKills || 0
    const totalFD = player.totalFirstDeaths || 0
    const totalMultiKills = player.totalMultiKills || 0
    
    // First Kill/Death percentages (would need rounds data to calculate properly)
    // For now, showing counts only
    const fkPercent = matches > 0 ? ((totalFK / matches) * 100).toFixed(1) : '0.0'
    const fdPercent = matches > 0 ? ((totalFD / matches) * 100).toFixed(1) : '0.0'

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
              className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
            team === 'alpha'
                  ? 'border-matrix-600 bg-matrix-600/10'
              : team === 'bravo'
                  ? 'border-cyber-600 bg-cyber-600/10'
                  : 'border-terminal-border bg-terminal-panel'
          }`}
          style={{ pointerEvents: 'auto' }}
        >
          <Avatar className="h-10 w-10 flex-shrink-0">
            {player.avatar && player.discordId ? (
              <AvatarImage
                src={`https://cdn.discordapp.com/avatars/${player.discordId}/${player.avatar}.png?size=64`}
                alt={player.username}
              />
            ) : (
              <AvatarFallback className="bg-terminal-panel text-matrix-400">
                {player.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
                <p className="font-mono text-sm text-terminal-text truncate">
                {player.username}
              </p>
              {isCaptain && (
                <Crown className="h-4 w-4 text-yellow-500 flex-shrink-0" />
              )}
            </div>
            
            {/* Stats Table - Horizontal columns, left to right */}
            {/* Show reduced stats when assigned to team, full stats when unassigned */}
            <div className="flex gap-x-4 overflow-x-auto text-sm font-mono">
              {/* ACS */}
              <div className="flex flex-col items-center min-w-[50px]">
                <span className="text-gray-900 dark:text-white opacity-100 text-xs mb-0.5">ACS</span>
                <span className="text-gray-900 dark:text-cyber-400 opacity-100 font-semibold">{avgACS}</span>
              </div>
              
              {/* K/D Ratio */}
              <div className="flex flex-col items-center min-w-[50px]">
                <span className="text-gray-900 dark:text-white opacity-100 text-xs mb-0.5">K/D</span>
                <span className="text-gray-900 dark:text-matrix-400 opacity-100 font-semibold">{avgKD}</span>
              </div>
              
              {/* HS% */}
              <div className="flex flex-col items-center min-w-[50px]">
                <span className="text-gray-900 dark:text-white opacity-100 text-xs mb-0.5">HS%</span>
                <span className="text-gray-900 dark:text-cyber-400 opacity-100 font-semibold">{avgHS > 0 ? avgHS.toFixed(1) : '-'}%</span>
              </div>
              
              {/* KAST */}
              <div className="flex flex-col items-center min-w-[50px]">
                <span className="text-gray-900 dark:text-white opacity-100 text-xs mb-0.5">KAST</span>
                <span className="text-gray-900 dark:text-cyber-400 opacity-100 font-semibold">{avgKAST > 0 ? avgKAST.toFixed(1) : '-'}%</span>
              </div>
              
              {/* ELO */}
              <div className="flex flex-col items-center min-w-[50px]">
                <span className="text-gray-900 dark:text-white opacity-100 text-xs mb-0.5">ELO</span>
                <span className="text-gray-900 dark:text-matrix-400 opacity-100 font-semibold">{player.elo}</span>
              </div>
              
              {/* Matches */}
              <div className="flex flex-col items-center min-w-[40px]">
                <span className="text-gray-900 dark:text-white opacity-100 text-xs mb-0.5">M</span>
                <span className="text-gray-900 dark:text-matrix-400 opacity-100 font-semibold">{matches}</span>
              </div>
              
              {/* Additional stats - only show when unassigned */}
              {!team && (
                <>
                  {/* KDA */}
                  <div className="flex flex-col items-center min-w-[60px]">
                    <span className="text-gray-900 dark:text-white opacity-100 text-xs mb-0.5">KDA</span>
                    <span className="text-gray-900 dark:text-matrix-400 opacity-100 font-semibold">{kills}/{deaths}/{assists}</span>
                  </div>
                  
                  {/* +/- */}
                  <div className="flex flex-col items-center min-w-[50px]">
                    <span className="text-gray-900 dark:text-white opacity-100 text-xs mb-0.5">+/-</span>
                    <span className={plusMinus >= 0 ? "text-gray-900 dark:text-matrix-400 opacity-100 font-semibold" : "text-red-600 dark:text-red-500 opacity-100 font-semibold"}>{plusMinus}</span>
                  </div>
                  
                  {/* Damage Delta */}
                  <div className="flex flex-col items-center min-w-[50px]">
                    <span className="text-gray-900 dark:text-white opacity-100 text-xs mb-0.5">DD</span>
                    <span className={avgDamageDelta >= 0 ? "text-gray-900 dark:text-cyber-400 opacity-100 font-semibold" : "text-red-600 dark:text-red-500 opacity-100 font-semibold"}>{avgDamageDelta > 0 ? `+${avgDamageDelta.toFixed(1)}` : avgDamageDelta.toFixed(1)}</span>
                  </div>
                  
                  {/* ADR */}
                  <div className="flex flex-col items-center min-w-[50px]">
                    <span className="text-gray-900 dark:text-white opacity-100 text-xs mb-0.5">ADR</span>
                    <span className="text-gray-900 dark:text-cyber-400 opacity-100 font-semibold">{avgADR}</span>
                  </div>
                  
                  {/* First Kill Count */}
                  <div className="flex flex-col items-center min-w-[40px]">
                    <span className="text-gray-900 dark:text-white opacity-100 text-xs mb-0.5">FK</span>
                    <span className="text-gray-900 dark:text-matrix-400 opacity-100 font-semibold">{totalFK}</span>
                  </div>
                  
                  {/* First Death Count */}
                  <div className="flex flex-col items-center min-w-[40px]">
                    <span className="text-gray-900 dark:text-white opacity-100 text-xs mb-0.5">FD</span>
                    <span className="text-gray-900 dark:text-matrix-400 opacity-100 font-semibold">{totalFD}</span>
                  </div>
                  
                  {/* First Kill% */}
                  <div className="flex flex-col items-center min-w-[50px]">
                    <span className="text-gray-900 dark:text-white opacity-100 text-xs mb-0.5">FK%</span>
                    <span className="text-gray-900 dark:text-matrix-400 opacity-100 font-semibold">{fkPercent}%</span>
                  </div>
                  
                  {/* First Death% */}
                  <div className="flex flex-col items-center min-w-[50px]">
                    <span className="text-gray-900 dark:text-white opacity-100 text-xs mb-0.5">FD%</span>
                    <span className="text-gray-900 dark:text-matrix-400 opacity-100 font-semibold">{fdPercent}%</span>
                  </div>
                  
                  {/* Multikill */}
                  <div className="flex flex-col items-center min-w-[50px]">
                    <span className="text-gray-900 dark:text-white opacity-100 text-xs mb-0.5">Multi</span>
                    <span className="text-gray-900 dark:text-cyber-400 opacity-100 font-semibold">{totalMultiKills}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {!team && (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (isLocked) return
                  console.log('→ Alpha button clicked for:', player.username)
                  moveToAlpha(player)
                }}
                disabled={isLocked || teamAlpha.length >= maxPerTeam}
                className="h-10 px-3 text-xl border-matrix-600 text-matrix-400 hover:bg-matrix-600/20"
                style={{ pointerEvents: 'auto', zIndex: 1000 }}
              >
                A
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (isLocked) return
                  console.log('→ Bravo button clicked for:', player.username)
                  moveToBravo(player)
                }}
                disabled={isLocked || teamBravo.length >= maxPerTeam}
                className="h-10 px-3 text-xl border-cyber-600 text-cyber-400 hover:bg-cyber-600/20"
                style={{ pointerEvents: 'auto', zIndex: 1000 }}
              >
                B
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
                    if (isLocked) return
                    onCaptainChange(team, player.userId)
                  }}
                  disabled={isLocked}
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
                    if (isLocked) return
                    onCaptainChange(team, null)
                  }}
                  disabled={isLocked}
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
                  e.preventDefault()
                  e.stopPropagation()
                  if (isLocked) return
                  console.log('Remove from team clicked for:', player.username)
                  moveToUnassigned(player)
                }}
                disabled={isLocked}
                className="h-7 px-2 text-xs hover:bg-red-500/20 hover:text-red-500"
                style={{ pointerEvents: 'auto', zIndex: 1000 }}
                title="Remove from team"
              >
                <X className="h-3 w-3" />
              </Button>
              {canRemovePlayers && onRemovePlayer && !isLocked && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('Kick player clicked for:', player.username)
                    onRemovePlayer(player.userId)
                  }}
                  className="h-7 px-2 text-xs hover:bg-red-600/30 hover:text-red-600"
                  style={{ pointerEvents: 'auto', zIndex: 1000 }}
                  title="Kick from match"
                >
                  <UserMinus className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
          
          {!team && canRemovePlayers && onRemovePlayer && !isLocked && (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log('Kick player clicked for:', player.username)
                  onRemovePlayer(player.userId)
                }}
                className="h-7 px-2 text-xs hover:bg-red-600/30 hover:text-red-600"
                style={{ pointerEvents: 'auto', zIndex: 1000 }}
                title="Kick from match"
              >
                <UserMinus className="h-3 w-3" />
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
        <Card className="border-2 border-matrix-600">
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
          disabled={isLocked || !allAssigned || !bothTeamsFull}
          className="font-mono bg-matrix-600 hover:bg-matrix-700 text-white dark:text-white"
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

