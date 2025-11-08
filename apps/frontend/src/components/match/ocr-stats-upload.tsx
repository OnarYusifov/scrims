"use client"

import { useState, useRef } from "react"
import { motion } from "framer-motion"
import type { MatchStatsReviewStatus } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, X, Loader2, CheckCircle2, AlertCircle, FileText } from "lucide-react"
import { extractStatsFromHtml, ExtractedPlayerStats, fuzzyMatchUsername } from "@/lib/ocr"

interface OCRStatsUploadProps {
  matchId: string
  matchPlayers: Array<{
    userId: string
    username: string
    teamId: string
    teamName: string
  }>
  onStatsExtracted: (stats: Array<{
    userId: string
    teamId: string
    stats: Omit<ExtractedPlayerStats, 'username' | 'rawText'>
  }>) => void
  onClose: () => void
}

export function OCRStatsUpload({ matchId, matchPlayers, onStatsExtracted, onClose }: OCRStatsUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [extractedPlayers, setExtractedPlayers] = useState<ExtractedPlayerStats[]>([])
  const [playerMatches, setPlayerMatches] = useState<Map<number, string>>(new Map())
  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [statsReviewStatus, setStatsReviewStatus] = useState<MatchStatsReviewStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)
    setIsProcessing(true)

    try {
      setUploadedFileName(file.name)

      const { players, submissionId: newSubmissionId, statsStatus } = await extractStatsFromHtml(matchId, file)

      if (players.length === 0) {
        throw new Error('No players detected in the uploaded HTML file. Please ensure the file is a valid tracker.gg scoreboard export.')
      }

      setSubmissionId(newSubmissionId)
      setStatsReviewStatus(statsStatus)
      setExtractedPlayers(players)

      const matches = new Map<number, string>()

      players.forEach((player, index) => {
        const expectedTeamName = player.team === 'alpha' ? 'Team Alpha' : 'Team Bravo'
        const teamCandidates = matchPlayers.filter(p => p.teamName === expectedTeamName)
        const candidateUsernames = teamCandidates.map(p => p.username)
        let matched = candidateUsernames.length
          ? fuzzyMatchUsername(player.username, candidateUsernames)
          : null

        if (!matched) {
          matched = fuzzyMatchUsername(player.username, matchPlayers.map(p => p.username))
        }

        if (matched) {
          const matchPlayer = matchPlayers.find(p => p.username === matched)
          if (matchPlayer) {
            matches.set(index, matchPlayer.userId)
          }
        }
      })

      setPlayerMatches(matches)
    } catch (err: any) {
      console.error('Scoreboard import error:', err)
      setError(err.message || 'Failed to process scoreboard HTML')
      setExtractedPlayers([])
      setSubmissionId(null)
      setStatsReviewStatus(null)
      setPlayerMatches(new Map())
      setUploadedFileName(null)
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePlayerMatch = (extractedIndex: number, userId: string) => {
    const newMatches = new Map(playerMatches)
    newMatches.set(extractedIndex, userId)
    setPlayerMatches(newMatches)
  }

  const handleConfirm = () => {
    // Build the stats array with matched players
    const stats = extractedPlayers
      .map((player, index) => {
        const userId = playerMatches.get(index)
        if (!userId) return null

        const matchPlayer = matchPlayers.find(p => p.userId === userId)
        if (!matchPlayer) return null

        return {
          userId: matchPlayer.userId,
          teamId: matchPlayer.teamId,
          stats: {
            acs: player.acs,
            kills: player.kills,
            deaths: player.deaths,
            assists: player.assists,
            adr: player.adr,
            headshotPercent: player.headshotPercent,
            kast: player.kast,
            firstKills: player.firstKills,
            firstDeaths: player.firstDeaths,
            multiKills: player.multiKills,
            damageDelta: player.damageDelta,
          }
        }
      })
      .filter(Boolean) as Array<{
        userId: string
        teamId: string
        stats: any
      }>

    onStatsExtracted(stats)
  }

  const allPlayersMatched = extractedPlayers.length > 0 && 
    extractedPlayers.every((_, index) => playerMatches.has(index))

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      style={{ pointerEvents: 'auto' }}
    >
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto border-2 border-matrix-500 bg-terminal-bg">
        <CardHeader className="border-b border-terminal-border">
          <div className="flex items-center justify-between">
            <CardTitle className="font-mono uppercase text-matrix-500 flex items-center gap-2">
              <Upload className="h-5 w-5" />
              SCOREBOARD HTML IMPORT
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="relative z-10"
              style={{ pointerEvents: 'auto' }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Upload Section */}
          {!uploadedFileName && (
            <div className="relative z-10" style={{ pointerEvents: 'auto' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".html,text/html"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="w-full h-32 border-2 border-dashed border-matrix-500 bg-terminal-panel hover:bg-terminal-panel/70"
              >
                {isProcessing ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-matrix-500" />
                    <span className="font-mono text-sm text-matrix-500">PROCESSING...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-8 w-8 text-matrix-500" />
                    <span className="font-mono text-sm text-matrix-500">
                      CLICK TO UPLOAD SCOREBOARD HTML
                    </span>
                    <span className="font-mono text-[10px] text-terminal-muted">
                      Export from tracker.gg scoreboard view
                    </span>
                  </div>
                )}
              </Button>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 border border-red-500 bg-red-500/10 rounded flex items-start gap-2"
            >
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-mono text-sm text-red-500 font-bold">ERROR</p>
                <p className="font-mono text-xs text-red-400 mt-1">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setError(null)
                    setUploadedFileName(null)
                    setExtractedPlayers([])
                    setPlayerMatches(new Map())
                  }}
                  className="mt-2"
                >
                  TRY AGAIN
                </Button>
              </div>
            </motion.div>
          )}

          {submissionId && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 border border-green-500/50 bg-green-500/10 rounded font-mono text-xs"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-green-500 font-semibold">SUCCESSFULLY PARSED</p>
                  <p className="text-terminal-muted mt-1">
                    Found {extractedPlayers.length} players • Submission ID: <span className="font-semibold text-matrix-500">{submissionId}</span>
                  </p>
                  {statsReviewStatus && (
                    <p className="text-terminal-muted mt-1 uppercase tracking-wide">
                      Status: <span className="text-matrix-500">{statsReviewStatus}</span>
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Uploaded file summary and matching */}
          {uploadedFileName && extractedPlayers.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="border border-terminal-border rounded p-3 bg-terminal-panel/60 font-mono text-xs text-terminal-muted">
                Uploaded file: <span className="text-matrix-500 font-semibold">{uploadedFileName}</span>
              </div>

              {/* Player Matching */}
              <div className="space-y-2">
                <p className="font-mono text-sm text-matrix-500 uppercase">
                  MATCH PLAYERS ({playerMatches.size}/{extractedPlayers.length})
                </p>
                <div className="space-y-2">
                  {extractedPlayers.map((player, index) => {
                    const selectedUserId = playerMatches.get(index)
                    const isMatched = !!selectedUserId
                    const expectedTeamName = player.team === 'alpha' ? 'Team Alpha' : 'Team Bravo'
                    const takenUserIds = new Set(
                      Array.from(playerMatches.entries())
                        .filter(([i]) => i !== index)
                        .map(([, id]) => id),
                    )
                    const candidateOptions = [...matchPlayers]
                      .filter((p) => !takenUserIds.has(p.userId))
                      .sort((a, b) => {
                        const aPriority = a.teamName === expectedTeamName ? 0 : 1
                        const bPriority = b.teamName === expectedTeamName ? 0 : 1
                        if (aPriority !== bPriority) return aPriority - bPriority
                        return a.username.localeCompare(b.username)
                      })

                    return (
                      <div
                        key={index}
                        className={`p-3 border rounded transition-colors ${
                          isMatched
                            ? 'border-matrix-500 bg-matrix-500/5 dark:bg-matrix-500/10'
                            : 'border-terminal-border bg-white dark:bg-terminal-panel'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {isMatched ? (
                            <CheckCircle2 className="h-4 w-4 text-matrix-500 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <p className="font-mono text-sm text-gray-900 dark:text-matrix-400 truncate">
                              Detected: {player.username}
                            </p>
                            <p className="font-mono text-xs text-terminal-muted">
                              Rank {player.rank || '—'} • ACS {player.acs ?? '—'} • K{player.kills ?? '—'} D{player.deaths ?? '—'} A{player.assists ?? '—'} • {expectedTeamName}
                            </p>
                          </div>

                          <select
                            value={selectedUserId || ''}
                            onChange={(e) => handlePlayerMatch(index, e.target.value)}
                            className="font-mono text-xs bg-white dark:bg-terminal-bg border border-terminal-border rounded px-2 py-1.5 text-gray-900 dark:text-matrix-500"
                            style={{ pointerEvents: 'auto' }}
                          >
                            <option value="">Select player...</option>
                            {candidateOptions.map((p) => (
                              <option key={p.userId} value={p.userId}>
                                {p.username} {p.teamName ? `(${p.teamName})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-4 border-t border-terminal-border">
                <Button
                  variant="outline"
                  onClick={() => {
                    setUploadedFileName(null)
                    setExtractedPlayers([])
                    setPlayerMatches(new Map())
                    setSubmissionId(null)
                    setStatsReviewStatus(null)
                    setError(null)
                  }}
                  style={{ pointerEvents: 'auto' }}
                >
                  RESET
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={!allPlayersMatched}
                  className="bg-matrix-500 hover:bg-matrix-600 text-black font-mono"
                  style={{ pointerEvents: 'auto' }}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  IMPORT {playerMatches.size} PLAYERS
                </Button>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

