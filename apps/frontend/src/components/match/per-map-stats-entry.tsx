"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/use-auth"
import { Match } from "@/types"
import { useToast } from "@/hooks/use-toast"
import { submitMapStats } from "@/lib/api"
import { Loader2, CheckCircle2, XCircle, Trophy } from "lucide-react"

interface PerMapStatsEntryProps {
  match: Match
  onMatchUpdate: () => void
  onMatchCompleted?: (eloResults: Array<{ userId: string; oldElo: number; newElo: number; change: number }>) => void
}

export function PerMapStatsEntry({ match, onMatchUpdate, onMatchCompleted }: PerMapStatsEntryProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Find the current map being played (first unpicked map)
  const currentMap = match.maps
    ?.filter(m => m.action === 'PICK' && !m.wasPlayed)
    .sort((a, b) => a.order - b.order)[0]

  const teamAlpha = match.teams.find(t => t.name === 'Team Alpha')
  const teamBravo = match.teams.find(t => t.name === 'Team Bravo')

  // Initialize stats state for all players
  const [mapStats, setMapStats] = useState<{
    score: { alpha: number; bravo: number }
    winnerTeamId: string
    playerStats: Map<string, {
      userId: string
      teamId: string
      kills: number | null
      deaths: number | null
      assists: number | null
      acs: number | null
      adr: number | null
      headshotPercent: number | null
      firstKills: number | null
      firstDeaths: number | null
      kast: number | null
      multiKills: number | null
      damageDelta: number | null
    }>
  }>(() => {
    const stats = new Map()
    if (teamAlpha && teamBravo) {
      teamAlpha.members.forEach(m => {
        stats.set(m.userId, {
          userId: m.userId,
          teamId: teamAlpha.id,
          kills: null,
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
        })
      })
      teamBravo.members.forEach(m => {
        stats.set(m.userId, {
          userId: m.userId,
          teamId: teamBravo.id,
          kills: null,
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
        })
      })
    }
    return {
      score: { alpha: 0, bravo: 0 },
      winnerTeamId: '',
      playerStats: stats,
    }
  })

  // Update player stat
  const updatePlayerStat = (userId: string, field: string, value: number | null) => {
    const updated = new Map(mapStats.playerStats)
    const playerStat = updated.get(userId)
    if (playerStat) {
      updated.set(userId, {
        ...playerStat,
        [field]: value,
      })
    }
    setMapStats({
      ...mapStats,
      playerStats: updated,
    })
  }

  // Check if user can submit (all stats filled and winner selected)
  const canSubmit = () => {
    if (!currentMap || !teamAlpha || !teamBravo) return false
    if (!mapStats.winnerTeamId) return false
    
    // Check if all players have required stats
    for (const [userId, stats] of mapStats.playerStats.entries()) {
      if (
        stats.kills === null ||
        stats.deaths === null ||
        stats.assists === null ||
        stats.acs === null ||
        stats.adr === null ||
        stats.headshotPercent === null ||
        stats.firstKills === null ||
        stats.firstDeaths === null ||
        stats.kast === null ||
        stats.multiKills === null ||
        stats.damageDelta === null
      ) {
        return false
      }
    }
    
    return true
  }

  const handleSubmit = async () => {
    if (!currentMap || !teamAlpha || !teamBravo || !canSubmit()) return

    try {
      setIsSubmitting(true)

      const statsToSubmit = {
        mapName: currentMap.mapName,
        winnerTeamId: mapStats.winnerTeamId,
        score: mapStats.score,
        playerStats: Array.from(mapStats.playerStats.values()).map(s => ({
          userId: s.userId,
          teamId: s.teamId,
          kills: s.kills!,
          deaths: s.deaths!,
          assists: s.assists!,
          acs: s.acs!,
          adr: s.adr!,
          headshotPercent: s.headshotPercent!,
          firstKills: s.firstKills!,
          firstDeaths: s.firstDeaths!,
          kast: s.kast!,
          multiKills: s.multiKills!,
          damageDelta: s.damageDelta!,
        })),
      }

      const result = await submitMapStats(match.id, statsToSubmit)

      if (result.matchCompleted) {
        // Match completed - show Elo animation
        toast({
          title: "Match Completed!",
          description: "Elo has been calculated. Check the results below.",
        })
        
        if (result.eloResults && onMatchCompleted) {
          onMatchCompleted(result.eloResults)
        }
      } else {
        // More maps needed
        toast({
          title: "Map Stats Submitted",
          description: `Moving to next map pick/ban phase. (${result.mapsPlayed}/${result.mapsNeeded} maps played)`,
        })
      }

      // Reset stats
      setMapStats({
        score: { alpha: 0, bravo: 0 },
        winnerTeamId: '',
        playerStats: new Map(mapStats.playerStats.keys().map(userId => {
          const existing = mapStats.playerStats.get(userId)!
          return [userId, {
            ...existing,
            kills: null,
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
          }]
        })),
      })

      onMatchUpdate()
    } catch (error: any) {
      console.error("Failed to submit map stats:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to submit map stats",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!currentMap || !teamAlpha || !teamBravo) {
    return (
      <Card className="border-gray-500">
        <CardContent className="p-6">
          <p className="font-mono text-sm text-gray-600 dark:text-terminal-muted text-center">
            No map available for stats entry. Waiting for map pick/ban...
          </p>
        </CardContent>
      </Card>
    )
  }

  const alphaPlayers = Array.from(mapStats.playerStats.values())
    .filter(s => s.teamId === teamAlpha.id)
  const bravoPlayers = Array.from(mapStats.playerStats.values())
    .filter(s => s.teamId === teamBravo.id)

  return (
    <Card className="border-green-500">
      <CardHeader>
        <CardTitle className="font-mono uppercase text-green-500">
          ENTER STATS - {currentMap.mapName}
        </CardTitle>
        <CardDescription className="font-mono">
          Fill in stats for all players. All players can enter their own stats.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score Selection */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-terminal-panel/50 rounded border border-terminal-border">
          <div className="space-y-2">
            <Label className="font-mono text-sm text-gray-600 dark:text-terminal-muted">
              Team Alpha Score
            </Label>
            <Input
              type="number"
              min="0"
              max="15"
              value={mapStats.score.alpha}
              onChange={(e) => {
                const score = parseInt(e.target.value) || 0
                setMapStats({
                  ...mapStats,
                  score: { ...mapStats.score, alpha: score },
                })
                // Auto-select winner if score is 13+
                if (score >= 13 && score > mapStats.score.bravo) {
                  setMapStats(prev => ({ ...prev, winnerTeamId: teamAlpha.id }))
                } else if (mapStats.score.bravo >= 13 && mapStats.score.bravo > score) {
                  setMapStats(prev => ({ ...prev, winnerTeamId: teamBravo.id }))
                }
              }}
              className="font-mono text-lg"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-mono text-sm text-gray-600 dark:text-terminal-muted">
              Team Bravo Score
            </Label>
            <Input
              type="number"
              min="0"
              max="15"
              value={mapStats.score.bravo}
              onChange={(e) => {
                const score = parseInt(e.target.value) || 0
                setMapStats({
                  ...mapStats,
                  score: { ...mapStats.score, bravo: score },
                })
                // Auto-select winner if score is 13+
                if (score >= 13 && score > mapStats.score.alpha) {
                  setMapStats(prev => ({ ...prev, winnerTeamId: teamBravo.id }))
                } else if (mapStats.score.alpha >= 13 && mapStats.score.alpha > score) {
                  setMapStats(prev => ({ ...prev, winnerTeamId: teamAlpha.id }))
                }
              }}
              className="font-mono text-lg"
            />
          </div>
        </div>

        {/* Winner Selection */}
        <div className="space-y-2">
          <Label className="font-mono text-sm text-gray-600 dark:text-terminal-muted">
            Winner Team
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={mapStats.winnerTeamId === teamAlpha.id ? "default" : "outline"}
              onClick={() => setMapStats({ ...mapStats, winnerTeamId: teamAlpha.id })}
              className="font-mono"
            >
              Team Alpha
            </Button>
            <Button
              variant={mapStats.winnerTeamId === teamBravo.id ? "default" : "outline"}
              onClick={() => setMapStats({ ...mapStats, winnerTeamId: teamBravo.id })}
              className="font-mono"
            >
              Team Bravo
            </Button>
          </div>
        </div>

        {/* Player Stats */}
        <div className="space-y-4">
          {/* Team Alpha */}
          <div>
            <h3 className="font-mono text-sm uppercase text-gray-600 dark:text-terminal-muted mb-2">
              Team Alpha
            </h3>
            <div className="space-y-2">
              {alphaPlayers.map((playerStat) => {
                const player = teamAlpha.members.find(m => m.userId === playerStat.userId)?.user
                const isCurrentUser = playerStat.userId === user?.id
                
                return (
                  <Card key={playerStat.userId} className={`border-terminal-border ${isCurrentUser ? 'border-green-500 bg-green-500/5' : ''}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-mono text-sm font-bold text-gray-900 dark:text-white">
                          {player?.username || 'Unknown'}
                          {isCurrentUser && <span className="ml-2 text-xs text-green-500">(You)</span>}
                        </h4>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="font-mono text-xs text-gray-600 dark:text-terminal-muted">K</Label>
                          <Input
                            type="number"
                            min="0"
                            value={playerStat.kills === null ? '' : playerStat.kills}
                            onChange={(e) => updatePlayerStat(playerStat.userId, 'kills', e.target.value === '' ? null : parseInt(e.target.value) || null)}
                            className="font-mono text-xs h-8"
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="font-mono text-xs text-gray-600 dark:text-terminal-muted">D</Label>
                          <Input
                            type="number"
                            min="0"
                            value={playerStat.deaths === null ? '' : playerStat.deaths}
                            onChange={(e) => updatePlayerStat(playerStat.userId, 'deaths', e.target.value === '' ? null : parseInt(e.target.value) || null)}
                            className="font-mono text-xs h-8"
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="font-mono text-xs text-gray-600 dark:text-terminal-muted">A</Label>
                          <Input
                            type="number"
                            min="0"
                            value={playerStat.assists === null ? '' : playerStat.assists}
                            onChange={(e) => updatePlayerStat(playerStat.userId, 'assists', e.target.value === '' ? null : parseInt(e.target.value) || null)}
                            className="font-mono text-xs h-8"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="font-mono text-xs text-gray-600 dark:text-terminal-muted">ACS</Label>
                          <Input
                            type="number"
                            min="0"
                            value={playerStat.acs === null ? '' : playerStat.acs}
                            onChange={(e) => updatePlayerStat(playerStat.userId, 'acs', e.target.value === '' ? null : parseInt(e.target.value) || null)}
                            className="font-mono text-xs h-8"
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="font-mono text-xs text-gray-600 dark:text-terminal-muted">ADR</Label>
                          <Input
                            type="number"
                            min="0"
                            value={playerStat.adr === null ? '' : playerStat.adr}
                            onChange={(e) => updatePlayerStat(playerStat.userId, 'adr', e.target.value === '' ? null : parseInt(e.target.value) || null)}
                            className="font-mono text-xs h-8"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="font-mono text-xs text-gray-600 dark:text-terminal-muted">HS%</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={playerStat.headshotPercent === null ? '' : playerStat.headshotPercent}
                            onChange={(e) => updatePlayerStat(playerStat.userId, 'headshotPercent', e.target.value === '' ? null : parseFloat(e.target.value) || null)}
                            className="font-mono text-xs h-8"
                            placeholder="0.0"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="font-mono text-xs text-gray-600 dark:text-terminal-muted">KAST%</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={playerStat.kast === null ? '' : playerStat.kast}
                            onChange={(e) => updatePlayerStat(playerStat.userId, 'kast', e.target.value === '' ? null : parseFloat(e.target.value) || null)}
                            className="font-mono text-xs h-8"
                            placeholder="0.0"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="font-mono text-xs text-gray-600 dark:text-terminal-muted">FK</Label>
                          <Input
                            type="number"
                            min="0"
                            value={playerStat.firstKills === null ? '' : playerStat.firstKills}
                            onChange={(e) => updatePlayerStat(playerStat.userId, 'firstKills', e.target.value === '' ? null : parseInt(e.target.value) || null)}
                            className="font-mono text-xs h-8"
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="font-mono text-xs text-gray-600 dark:text-terminal-muted">FD</Label>
                          <Input
                            type="number"
                            min="0"
                            value={playerStat.firstDeaths === null ? '' : playerStat.firstDeaths}
                            onChange={(e) => updatePlayerStat(playerStat.userId, 'firstDeaths', e.target.value === '' ? null : parseInt(e.target.value) || null)}
                            className="font-mono text-xs h-8"
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="font-mono text-xs text-gray-600 dark:text-terminal-muted">MK</Label>
                          <Input
                            type="number"
                            min="0"
                            value={playerStat.multiKills === null ? '' : playerStat.multiKills}
                            onChange={(e) => updatePlayerStat(playerStat.userId, 'multiKills', e.target.value === '' ? null : parseInt(e.target.value) || null)}
                            className="font-mono text-xs h-8"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="font-mono text-xs text-gray-600 dark:text-terminal-muted">DDΔ</Label>
                        <Input
                          type="number"
                          value={playerStat.damageDelta === null ? '' : playerStat.damageDelta}
                          onChange={(e) => {
                            const value = e.target.value.trim()
                            if (value === '' || value === '-') {
                              updatePlayerStat(playerStat.userId, 'damageDelta', null)
                            } else if (/^-?\d*\.?\d*$/.test(value)) {
                              updatePlayerStat(playerStat.userId, 'damageDelta', parseFloat(value) || null)
                            }
                          }}
                          className="font-mono text-xs h-8"
                          placeholder="0"
                        />
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Team Bravo */}
          <div>
            <h3 className="font-mono text-sm uppercase text-gray-600 dark:text-terminal-muted mb-2">
              Team Bravo
            </h3>
            <div className="space-y-2">
              {bravoPlayers.map((playerStat) => {
                const player = teamBravo.members.find(m => m.userId === playerStat.userId)?.user
                const isCurrentUser = playerStat.userId === user?.id
                
                return (
                  <Card key={playerStat.userId} className={`border-terminal-border ${isCurrentUser ? 'border-green-500 bg-green-500/5' : ''}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-mono text-sm font-bold text-gray-900 dark:text-white">
                          {player?.username || 'Unknown'}
                          {isCurrentUser && <span className="ml-2 text-xs text-green-500">(You)</span>}
                        </h4>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="font-mono text-xs text-gray-600 dark:text-terminal-muted">K</Label>
                          <Input
                            type="number"
                            min="0"
                            value={playerStat.kills === null ? '' : playerStat.kills}
                            onChange={(e) => updatePlayerStat(playerStat.userId, 'kills', e.target.value === '' ? null : parseInt(e.target.value) || null)}
                            className="font-mono text-xs h-8"
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="font-mono text-xs text-gray-600 dark:text-terminal-muted">D</Label>
                          <Input
                            type="number"
                            min="0"
                            value={playerStat.deaths === null ? '' : playerStat.deaths}
                            onChange={(e) => updatePlayerStat(playerStat.userId, 'deaths', e.target.value === '' ? null : parseInt(e.target.value) || null)}
                            className="font-mono text-xs h-8"
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="font-mono text-xs text-gray-600 dark:text-terminal-muted">A</Label>
                          <Input
                            type="number"
                            min="0"
                            value={playerStat.assists === null ? '' : playerStat.assists}
                            onChange={(e) => updatePlayerStat(playerStat.userId, 'assists', e.target.value === '' ? null : parseInt(e.target.value) || null)}
                            className="font-mono text-xs h-8"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="font-mono text-xs text-gray-600 dark:text-terminal-muted">ACS</Label>
                          <Input
                            type="number"
                            min="0"
                            value={playerStat.acs === null ? '' : playerStat.acs}
                            onChange={(e) => updatePlayerStat(playerStat.userId, 'acs', e.target.value === '' ? null : parseInt(e.target.value) || null)}
                            className="font-mono text-xs h-8"
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="font-mono text-xs text-gray-600 dark:text-terminal-muted">ADR</Label>
                          <Input
                            type="number"
                            min="0"
                            value={playerStat.adr === null ? '' : playerStat.adr}
                            onChange={(e) => updatePlayerStat(playerStat.userId, 'adr', e.target.value === '' ? null : parseInt(e.target.value) || null)}
                            className="font-mono text-xs h-8"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="font-mono text-xs text-gray-600 dark:text-terminal-muted">HS%</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={playerStat.headshotPercent === null ? '' : playerStat.headshotPercent}
                            onChange={(e) => updatePlayerStat(playerStat.userId, 'headshotPercent', e.target.value === '' ? null : parseFloat(e.target.value) || null)}
                            className="font-mono text-xs h-8"
                            placeholder="0.0"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="font-mono text-xs text-gray-600 dark:text-terminal-muted">KAST%</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={playerStat.kast === null ? '' : playerStat.kast}
                            onChange={(e) => updatePlayerStat(playerStat.userId, 'kast', e.target.value === '' ? null : parseFloat(e.target.value) || null)}
                            className="font-mono text-xs h-8"
                            placeholder="0.0"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="font-mono text-xs text-gray-600 dark:text-terminal-muted">FK</Label>
                          <Input
                            type="number"
                            min="0"
                            value={playerStat.firstKills === null ? '' : playerStat.firstKills}
                            onChange={(e) => updatePlayerStat(playerStat.userId, 'firstKills', e.target.value === '' ? null : parseInt(e.target.value) || null)}
                            className="font-mono text-xs h-8"
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="font-mono text-xs text-gray-600 dark:text-terminal-muted">FD</Label>
                          <Input
                            type="number"
                            min="0"
                            value={playerStat.firstDeaths === null ? '' : playerStat.firstDeaths}
                            onChange={(e) => updatePlayerStat(playerStat.userId, 'firstDeaths', e.target.value === '' ? null : parseInt(e.target.value) || null)}
                            className="font-mono text-xs h-8"
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="font-mono text-xs text-gray-600 dark:text-terminal-muted">MK</Label>
                          <Input
                            type="number"
                            min="0"
                            value={playerStat.multiKills === null ? '' : playerStat.multiKills}
                            onChange={(e) => updatePlayerStat(playerStat.userId, 'multiKills', e.target.value === '' ? null : parseInt(e.target.value) || null)}
                            className="font-mono text-xs h-8"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="font-mono text-xs text-gray-600 dark:text-terminal-muted">DDΔ</Label>
                        <Input
                          type="number"
                          value={playerStat.damageDelta === null ? '' : playerStat.damageDelta}
                          onChange={(e) => {
                            const value = e.target.value.trim()
                            if (value === '' || value === '-') {
                              updatePlayerStat(playerStat.userId, 'damageDelta', null)
                            } else if (/^-?\d*\.?\d*$/.test(value)) {
                              updatePlayerStat(playerStat.userId, 'damageDelta', parseFloat(value) || null)
                            }
                          }}
                          className="font-mono text-xs h-8"
                          placeholder="0"
                        />
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-terminal-border">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit() || isSubmitting}
            className="w-full font-mono bg-green-500 hover:bg-green-600"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                SUBMITTING...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                SUBMIT MAP STATS
              </>
            )}
          </Button>
          {!canSubmit() && (
            <p className="font-mono text-xs text-gray-600 dark:text-terminal-muted text-center mt-2">
              Please fill in all stats and select a winner
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}



