"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"
import type { MatchStatsReviewStatus } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, X, Loader2, CheckCircle2, AlertCircle, FileText } from "lucide-react"
import { extractStatsFromHtml, ExtractedPlayerStats, fuzzyMatchUsername } from "@/lib/ocr"

type MapOption = { index: number; label: string }

interface InitialImportData {
  players: ExtractedPlayerStats[]
  submissionId?: string | null
  statsStatus?: MatchStatsReviewStatus | null
  sourceLabel?: string
  mapName?: string | null
}

interface OCRStatsUploadProps {
  matchId: string
  matchPlayers: Array<{
    userId: string
    username: string
    teamId: string
    teamName: string
  }>
  mapOptions: MapOption[]
  defaultMapIndex?: number
  initialData?: InitialImportData | null
  onStatsExtracted: (payload: {
    mapIndex: number
    players: Array<{
      userId: string
      teamId: string
      stats: Omit<ExtractedPlayerStats, "username">
    }>
    submission?: {
      id: string | null
      status: MatchStatsReviewStatus | null
    } | null
    detectedMapName?: string | null
    sourceLabel?: string
  }) => void
  onClose: () => void
}

function autoMatchPlayers(
  players: ExtractedPlayerStats[],
  roster: OCRStatsUploadProps["matchPlayers"],
): Map<number, string> {
  const matches = new Map<number, string>()

  players.forEach((player, index) => {
    const expectedTeamName = player.team === "alpha" ? "Team Alpha" : "Team Bravo"
    const teamCandidates = roster.filter((p) => p.teamName === expectedTeamName)
    const candidateUsernames = teamCandidates.map((p) => p.username)
    let matched = candidateUsernames.length
      ? fuzzyMatchUsername(player.username, candidateUsernames)
      : null

    if (!matched) {
      matched = fuzzyMatchUsername(player.username, roster.map((p) => p.username))
    }

    if (matched) {
      const matchPlayer = roster.find((p) => p.username === matched)
      if (matchPlayer) {
        matches.set(index, matchPlayer.userId)
      }
    }
  })

  return matches
}

export function OCRStatsUpload({
  matchId,
  matchPlayers,
  mapOptions,
  defaultMapIndex,
  initialData,
  onStatsExtracted,
  onClose,
}: OCRStatsUploadProps) {
  const normalizedMapOptions = useMemo<MapOption[]>(() => {
    if (!mapOptions || mapOptions.length === 0) {
      return [{ index: 0, label: "Map 1" }]
    }
    return mapOptions
  }, [mapOptions])

  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(initialData?.sourceLabel ?? null)
  const [extractedPlayers, setExtractedPlayers] = useState<ExtractedPlayerStats[]>(initialData?.players ?? [])
  const [playerMatches, setPlayerMatches] = useState<Map<number, string>>(
    initialData?.players ? autoMatchPlayers(initialData.players, matchPlayers) : new Map(),
  )
  const [submissionId, setSubmissionId] = useState<string | null>(initialData?.submissionId ?? null)
  const [statsReviewStatus, setStatsReviewStatus] = useState<MatchStatsReviewStatus | null>(
    initialData?.statsStatus ?? null,
  )
  const [detectedMapName, setDetectedMapName] = useState<string | null>(initialData?.mapName ?? null)
  const [error, setError] = useState<string | null>(null)
  const [selectedMapIndex, setSelectedMapIndex] = useState<number>(
    () => defaultMapIndex ?? normalizedMapOptions[0]?.index ?? 0,
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (defaultMapIndex !== undefined) {
      setSelectedMapIndex(defaultMapIndex)
      return
    }

    setSelectedMapIndex((prev) => {
      const indices = normalizedMapOptions.map((option) => option.index)
      if (indices.includes(prev)) {
        return prev
      }
      return indices[0] ?? 0
    })
  }, [normalizedMapOptions, defaultMapIndex])

  useEffect(() => {
    if (initialData?.players && initialData.players.length > 0) {
      setExtractedPlayers(initialData.players)
      setUploadedFileName(initialData.sourceLabel ?? "tracker-bundle.html")
      setSubmissionId(initialData.submissionId ?? null)
      setStatsReviewStatus(initialData.statsStatus ?? null)
      setPlayerMatches(autoMatchPlayers(initialData.players, matchPlayers))
      setDetectedMapName(initialData.mapName ?? null)
    }
  }, [initialData, matchPlayers])

  const resetState = () => {
    setUploadedFileName(null)
    setExtractedPlayers([])
    setPlayerMatches(new Map())
    setSubmissionId(null)
    setStatsReviewStatus(null)
    setError(null)
    setDetectedMapName(null)
    setSelectedMapIndex(defaultMapIndex ?? normalizedMapOptions[0]?.index ?? 0)
  }

  const ingestPlayers = (players: ExtractedPlayerStats[], sourceLabel: string | null, mapName?: string | null) => {
    setExtractedPlayers(players)
    setUploadedFileName(sourceLabel)
    setPlayerMatches(autoMatchPlayers(players, matchPlayers))
    setDetectedMapName(mapName ?? null)
    if (mapName) {
      const normalised = mapName.toLowerCase()
      const matchedOption = normalizedMapOptions.find((option) =>
        option.label.toLowerCase().includes(normalised),
      )
      if (matchedOption) {
        setSelectedMapIndex(matchedOption.index)
      }
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)
    setIsProcessing(true)

    try {
      const { players, submissionId: newSubmissionId, statsStatus, mapName } = await extractStatsFromHtml(matchId, file)

      if (players.length === 0) {
        throw new Error(
          "No players detected in the uploaded HTML file. Please ensure the file is a valid tracker.gg scoreboard export.",
        )
      }

      setSubmissionId(newSubmissionId)
      setStatsReviewStatus(statsStatus)
      ingestPlayers(players, file.name, mapName ?? null)
    } catch (err: any) {
      console.error("Scoreboard import error:", err)
      setError(err.message || "Failed to process scoreboard HTML")
      resetState()
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePlayerMatch = (extractedIndex: number, userId: string) => {
    const newMatches = new Map(playerMatches)
    if (userId) {
      newMatches.set(extractedIndex, userId)
    } else {
      newMatches.delete(extractedIndex)
    }
    setPlayerMatches(newMatches)
  }

  const handleConfirm = () => {
    const stats = extractedPlayers
      .map((player, index) => {
        const userId = playerMatches.get(index)
        if (!userId) return null

        const matchPlayer = matchPlayers.find((p) => p.userId === userId)
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
          },
        }
      })
      .filter(Boolean) as Array<{
        userId: string
        teamId: string
        stats: Omit<ExtractedPlayerStats, "username">
      }>

    onStatsExtracted({
      mapIndex: selectedMapIndex,
      players: stats,
      submission:
        submissionId || statsReviewStatus
          ? {
              id: submissionId,
              status: statsReviewStatus ?? null,
            }
          : null,
      detectedMapName: detectedMapName ?? null,
      sourceLabel: uploadedFileName ?? undefined,
    })
  }

  const allPlayersMatched =
    extractedPlayers.length > 0 && extractedPlayers.every((_, index) => playerMatches.has(index))

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      style={{ pointerEvents: "auto" }}
    >
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto border-2 border-matrix-500 bg-terminal-bg">
        <CardHeader className="border-b border-terminal-border">
          <div className="flex items-center justify-between">
            <CardTitle className="font-mono uppercase text-matrix-500 flex items-center gap-2">
              <Upload className="h-5 w-5" />
              SCOREBOARD IMPORT
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="relative z-10"
              style={{ pointerEvents: "auto" }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {!uploadedFileName && (
            <div className="relative z-10" style={{ pointerEvents: "auto" }}>
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
                      CLICK OR DROP SCOREBOARD HTML
                    </span>
                    <span className="font-mono text-[10px] text-terminal-muted">
                      Use tracker.gg &gt; Scoreboard &gt; Export HTML
                    </span>
                  </div>
                )}
              </Button>
            </div>
          )}

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
                    resetState()
                  }}
                  className="mt-2"
                >
                  TRY AGAIN
                </Button>
              </div>
            </motion.div>
          )}

          {submissionId && extractedPlayers.length > 0 && (
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
                    Found {extractedPlayers.length} players • Submission ID:{" "}
                    <span className="font-semibold text-matrix-500">{submissionId}</span>
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

          {uploadedFileName && extractedPlayers.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="border border-terminal-border rounded p-3 bg-terminal-panel/60 font-mono text-xs text-terminal-muted">
                Source file: <span className="text-matrix-500 font-semibold">{uploadedFileName}</span>
              </div>

              <div className="rounded border border-terminal-border bg-terminal-panel/50 p-3 font-mono text-xs text-terminal-muted space-y-2">
                <p className="text-matrix-500 font-semibold uppercase text-sm">Assign players</p>
                <p>
                  Map each scoreboard row to a player in the match roster. Suggestions are pre-selected, but review every entry before importing.
                </p>
                {detectedMapName ? (
                  <p>
                    Detected map:{" "}
                    <span className="text-matrix-500 font-semibold uppercase">{detectedMapName}</span>
                  </p>
                ) : (
                  <p className="text-yellow-500">
                    Could not detect map name automatically — choose the correct map from the selector below.
                  </p>
                )}
                {extractedPlayers.length - playerMatches.size > 0 ? (
                  <p className="flex items-center gap-2 text-red-500">
                    <AlertCircle className="h-4 w-4" />
                    {extractedPlayers.length - playerMatches.size} player(s) still need assignment.
                  </p>
                ) : (
                  <p className="flex items-center gap-2 text-green-500">
                    <CheckCircle2 className="h-4 w-4" />
                    All players assigned. Ready to import.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3">
                <span className="font-mono text-xs text-terminal-muted uppercase">Apply to map</span>
                <select
                  value={selectedMapIndex}
                  onChange={(event) => setSelectedMapIndex(Number(event.target.value))}
                  className="font-mono text-xs border border-terminal-border bg-terminal-bg px-2 py-1 text-matrix-500"
                  style={{ pointerEvents: "auto" }}
                >
                  {normalizedMapOptions.map((option) => (
                    <option key={option.index} value={option.index}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <p className="font-mono text-sm text-matrix-500 uppercase">
                  MATCH PLAYERS ({playerMatches.size}/{extractedPlayers.length})
                </p>
                <div className="space-y-2">
                  {extractedPlayers.map((player, index) => {
                    const selectedUserId = playerMatches.get(index)
                    const isMatched = !!selectedUserId
                    const expectedTeamName = player.team === "alpha" ? "Team Alpha" : "Team Bravo"
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
                        key={`${player.username}-${index}`}
                        className={`p-3 border rounded transition-colors ${
                          isMatched
                            ? "border-matrix-500 bg-matrix-500/5 dark:bg-matrix-500/10"
                            : "border-red-500/60 bg-red-500/10"
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
                              Rank {player.rank || "—"} • ACS {player.acs ?? "—"} • K{player.kills ?? "—"} D
                              {player.deaths ?? "—"} A{player.assists ?? "—"} • {expectedTeamName}
                            </p>
                          </div>

                          <select
                            value={selectedUserId || ""}
                            onChange={(e) => handlePlayerMatch(index, e.target.value)}
                            className="font-mono text-xs bg-white dark:bg-terminal-bg border border-terminal-border rounded px-2 py-1.5 text-gray-900 dark:text-matrix-500"
                            style={{ pointerEvents: "auto" }}
                          >
                            <option value="">Select player...</option>
                            {candidateOptions.map((p) => (
                              <option key={p.userId} value={p.userId}>
                                {p.username} {p.teamName ? `(${p.teamName})` : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex gap-2 justify-end border-t border-terminal-border pt-4">
                <Button
                  variant="outline"
                  onClick={resetState}
                  style={{ pointerEvents: "auto" }}
                >
                  RESET
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={!allPlayersMatched}
                  className="bg-matrix-500 hover:bg-matrix-600 text-black font-mono"
                  style={{ pointerEvents: "auto" }}
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

