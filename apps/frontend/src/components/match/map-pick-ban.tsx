"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/hooks/use-auth"
import { Match, MapSelection } from "@/types"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Ban, MapPin, CheckCircle2 } from "lucide-react"

interface MapPickBanProps {
  match: Match
  onMatchUpdate: () => void
}

// Standard Valorant map pool
const MAP_POOL = [
  "Ascent",
  "Bind",
  "Haven",
  "Split",
  "Lotus",
  "Sunset",
  "Breeze",
]

// Pick/ban order for BO1, BO3, BO5
// BO1: Ban-Ban-Ban-Ban-Ban-Ban-Pick (6 bans, 1 pick)
// BO3: Ban-Ban-Pick-Pick-Ban-Ban-Pick (4 bans, 3 picks)
// BO5: Ban-Ban-Pick-Pick-Pick-Ban-Ban-Pick-Pick (4 bans, 5 picks)
function getPickBanOrder(seriesType: 'BO1' | 'BO3' | 'BO5'): Array<'BAN' | 'PICK'> {
  if (seriesType === 'BO1') {
    return ['BAN', 'BAN', 'BAN', 'BAN', 'BAN', 'BAN', 'PICK']
  } else if (seriesType === 'BO3') {
    return ['BAN', 'BAN', 'PICK', 'PICK', 'BAN', 'BAN', 'PICK']
  } else { // BO5
    return ['BAN', 'BAN', 'PICK', 'PICK', 'PICK', 'BAN', 'BAN', 'PICK', 'PICK']
  }
}

export function MapPickBan({ match, onMatchUpdate }: MapPickBanProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [availableMaps, setAvailableMaps] = useState<string[]>(MAP_POOL)
  const [pickBanOrder, setPickBanOrder] = useState<Array<'BAN' | 'PICK'>>([])
  const [currentTurn, setCurrentTurn] = useState<number>(0)
  const [selections, setSelections] = useState<Map<number, { mapName: string; action: 'PICK' | 'BAN' | 'DECIDER'; teamId: string }>>(new Map())

  const teamAlpha = match.teams.find(t => t.name === 'Team Alpha')
  const teamBravo = match.teams.find(t => t.name === 'Team Bravo')
  const isAlphaCaptain = teamAlpha?.captainId === user?.id
  const isBravoCaptain = teamBravo?.captainId === user?.id
  const isCaptain = isAlphaCaptain || isBravoCaptain

  // Determine which team picks first (coinflip or based on captain voting)
  // For now, Team Alpha picks first
  const firstPickTeam = 'alpha'

  useEffect(() => {
    // Initialize pick/ban order
    const order = getPickBanOrder(match.seriesType)
    setPickBanOrder(order)

    // Load existing selections from match (use map.order as index, not array index)
    const existingSelections = new Map<number, { mapName: string; action: 'PICK' | 'BAN' | 'DECIDER'; teamId: string }>()
    match.maps?.forEach((map) => {
      if (map.teamId) {
        existingSelections.set(map.order, {
          mapName: map.mapName,
          action: map.action,
          teamId: map.teamId,
        })
      }
    })
    setSelections(existingSelections)

    // Calculate current turn based on existing selections
    const currentTurnIndex = existingSelections.size
    setCurrentTurn(currentTurnIndex)

    // Update available maps (remove banned/picked maps)
    const usedMaps = new Set(existingSelections.values().map(s => s.mapName))
    setAvailableMaps(MAP_POOL.filter(map => !usedMaps.has(map)))
  }, [match])

  // Determine whose turn it is
  const getCurrentTeam = (): 'alpha' | 'bravo' | null => {
    if (currentTurn >= pickBanOrder.length) return null // All picks/bans done
    
    // Alternate turns: Alpha, Bravo, Alpha, Bravo, etc.
    // But first pick team goes first
    const isAlphaTurn = firstPickTeam === 'alpha' 
      ? currentTurn % 2 === 0 
      : currentTurn % 2 === 1
    
    return isAlphaTurn ? 'alpha' : 'bravo'
  }

  const currentTeam = getCurrentTeam()
  const isUserTurn = (currentTeam === 'alpha' && isAlphaCaptain) || (currentTeam === 'bravo' && isBravoCaptain)
  const currentAction = pickBanOrder[currentTurn]

  const handlePickBan = async (mapName: string, action: 'PICK' | 'BAN') => {
    if (!isUserTurn || !isCaptain || !currentTeam) return

    try {
      setIsLoading(true)

      const teamId = currentTeam === 'alpha' ? teamAlpha!.id : teamBravo!.id

      // Call API to record pick/ban
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001'}/api/matches/${match.id}/pick-ban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          mapName,
          action,
          order: currentTurn,
          teamId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to pick/ban map')
      }

      // Update local state
      const newSelections = new Map(selections)
      newSelections.set(currentTurn, { mapName, action, teamId })
      setSelections(newSelections)
      setAvailableMaps(availableMaps.filter(m => m !== mapName))
      setCurrentTurn(currentTurn + 1)

      toast({
        title: `${action === 'PICK' ? 'Picked' : 'Banned'} ${mapName}`,
        description: `${action === 'PICK' ? 'Map picked' : 'Map banned'} successfully`,
      })

      onMatchUpdate()
    } catch (error: any) {
      console.error("Failed to pick/ban map:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to pick/ban map",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartMatch = async () => {
    if (!isCaptain) return

    try {
      setIsLoading(true)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001'}/api/matches/${match.id}/start-match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        credentials: 'include',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to start match')
      }

      toast({
        title: "Match Started",
        description: "The match has begun! Players can now enter stats after each map.",
      })

      onMatchUpdate()
    } catch (error: any) {
      console.error("Failed to start match:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to start match",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const isComplete = currentTurn >= pickBanOrder.length
  const pickedMaps = Array.from(selections.values())
    .filter(s => s.action === 'PICK')
    .map(s => s.mapName)

  return (
    <Card className="border-2 border-cyber-500">
      <CardHeader>
        <CardTitle className="font-mono uppercase text-cyber-500">MAP PICK/BAN</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Status */}
        {!isComplete && (
          <div className="p-4 bg-cyber-500/10 border border-cyber-500 rounded">
            <p className="font-mono text-sm text-cyber-400 mb-2">
              {currentAction === 'PICK' ? 'PICK' : 'BAN'} Phase - Turn {currentTurn + 1} of {pickBanOrder.length}
            </p>
            {currentTeam && (
              <p className="font-mono text-xs text-gray-600 dark:text-terminal-muted">
                {currentTeam === 'alpha' ? teamAlpha?.captain?.username : teamBravo?.captain?.username}'s turn
                {isUserTurn && " (Your turn!)"}
              </p>
            )}
          </div>
        )}

        {/* Selected Maps */}
        {selections.size > 0 && (
          <div>
            <h3 className="font-mono text-sm uppercase text-gray-600 dark:text-terminal-muted mb-2">
              Selected Maps
            </h3>
            <div className="space-y-2">
              {Array.from(selections.entries())
                .sort(([a], [b]) => a - b)
                .map(([order, selection]) => (
                  <div
                    key={order}
                    className={`flex items-center justify-between p-2 rounded border ${
                      selection.action === 'PICK'
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-red-500 bg-red-500/10'
                    }`}
                  >
                    <span className="font-mono text-sm text-gray-900 dark:text-white">
                      {selection.mapName}
                    </span>
                    <span className={`font-mono text-xs uppercase ${
                      selection.action === 'PICK' ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {selection.action}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Available Maps */}
        {!isComplete && (
          <div>
            <h3 className="font-mono text-sm uppercase text-gray-600 dark:text-terminal-muted mb-2">
              Available Maps
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {availableMaps.map((mapName) => (
                <Button
                  key={mapName}
                  variant="outline"
                  onClick={() => handlePickBan(mapName, currentAction)}
                  disabled={isLoading || !isUserTurn || !isCaptain}
                  className={`font-mono relative z-10 ${
                    currentAction === 'PICK'
                      ? 'hover:bg-green-500/20 hover:border-green-500'
                      : 'hover:bg-red-500/20 hover:border-red-500'
                  }`}
                  style={{ pointerEvents: 'auto' }}
                >
                  {currentAction === 'PICK' ? (
                    <MapPin className="mr-2 h-4 w-4" />
                  ) : (
                    <Ban className="mr-2 h-4 w-4" />
                  )}
                  {mapName}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Start Match Button */}
        {isComplete && isCaptain && (
          <div className="space-y-4">
            <div className="p-4 bg-green-500/10 border border-green-500 rounded">
              <p className="font-mono text-sm text-green-400 mb-2">
                Pick/Ban Complete!
              </p>
              <p className="font-mono text-xs text-gray-600 dark:text-terminal-muted">
                Picked maps: {pickedMaps.join(', ')}
              </p>
            </div>
            <Button
              onClick={handleStartMatch}
              disabled={isLoading}
              className="w-full font-mono bg-green-500 hover:bg-green-600"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  START MATCH
                </>
              )}
            </Button>
          </div>
        )}

        {/* Info for non-captains */}
        {!isCaptain && (
          <div className="p-4 bg-gray-500/10 border border-gray-500 rounded">
            <p className="font-mono text-sm text-gray-600 dark:text-terminal-muted">
              Waiting for captains to pick/ban maps...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

