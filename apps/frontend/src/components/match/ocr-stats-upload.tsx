"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { MatchStatsReviewStatus } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, X, Loader2, CheckCircle2, AlertCircle, Image as ImageIcon } from "lucide-react"
import { extractStatsFromImage, ExtractedPlayerStats, fuzzyMatchUsername } from "@/lib/ocr"

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
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
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
      // Show preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    // Process with OCR via backend
    const { players, submissionId: newSubmissionId, statsStatus } = await extractStatsFromImage(matchId, file)

    if (players.length === 0) {
      throw new Error('No players detected in the image. Please ensure the image is clear and contains the stats table.')
    }

    setSubmissionId(newSubmissionId)
    setStatsReviewStatus(statsStatus)
    setExtractedPlayers(players)

      // Try to auto-match players
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
      console.error('OCR Error:', err)
      setError(err.message || 'Failed to process image')
      setExtractedPlayers([])
      setSubmissionId(null)
      setStatsReviewStatus(null)
      setPlayerMatches(new Map())
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
              OCR STATS IMPORT
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
          {!uploadedImage && (
            <div className="relative z-10" style={{ pointerEvents: 'auto' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
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
                    <span className="font-mono text-sm text-matrix-500">PROCESSING OCR...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <ImageIcon className="h-8 w-8 text-matrix-500" />
                    <span className="font-mono text-sm text-matrix-500">
                      CLICK TO UPLOAD STATS SCREENSHOT
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
                    setUploadedImage(null)
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
            <div className="p-3 border border-matrix-500/50 bg-matrix-500/5 rounded font-mono text-xs text-matrix-400">
              Pending review for submission <span className="font-semibold">{submissionId}</span>
              {statsReviewStatus && (
                <span className="ml-2 uppercase tracking-wide text-matrix-500">[{statsReviewStatus}]</span>
              )}
            </div>
          )}

          {/* Preview and Matching */}
          {uploadedImage && extractedPlayers.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {/* Image Preview */}
              <div className="border border-terminal-border rounded-lg overflow-hidden">
                <img
                  src={uploadedImage}
                  alt="Uploaded stats"
                  className="w-full h-auto max-h-64 object-contain bg-black"
                />
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
                    const eligiblePlayers = matchPlayers.filter(p => p.teamName === expectedTeamName)
                    const candidateOptions = eligiblePlayers.length ? eligiblePlayers : matchPlayers

                    return (
                      <div
                        key={index}
                        className={`p-3 border rounded ${
                          isMatched
                            ? 'border-matrix-500 bg-matrix-500/5'
                            : 'border-terminal-border bg-terminal-panel'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {isMatched ? (
                            <CheckCircle2 className="h-4 w-4 text-matrix-500 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <p className="font-mono text-sm text-matrix-400 truncate">
                              Detected: {player.username}
                            </p>
                            <p className="font-mono text-xs text-terminal-muted">
                              ACS {player.acs} • K{player.kills} D{player.deaths} A{player.assists} • {expectedTeamName}
                            </p>
                          </div>

                          <select
                            value={selectedUserId || ''}
                            onChange={(e) => handlePlayerMatch(index, e.target.value)}
                            className="font-mono text-xs bg-terminal-bg border border-terminal-border rounded px-2 py-1.5 text-matrix-500"
                            style={{ pointerEvents: 'auto' }}
                          >
                            <option value="">Select player...</option>
                            {candidateOptions.map((p) => (
                              <option key={p.userId} value={p.userId}>
                                {p.username}
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
                    setUploadedImage(null)
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

