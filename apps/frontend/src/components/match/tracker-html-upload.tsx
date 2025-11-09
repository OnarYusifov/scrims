"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Upload, CheckCircle2, Info, Trash2, FileText, AlertTriangle } from "lucide-react"
import { uploadMatchTrackerBundle, UploadTrackerBundleResponse } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type { MatchStatsReviewStatus, ScoreboardExtractionPayload } from "@/types"
import type { ExtractedPlayerStats } from "@/lib/ocr"

interface TrackerHtmlUploadProps {
  matchId: string
  onScoreboardReady?: (payload: {
    players: ExtractedPlayerStats[]
    submissionId: string
    statsStatus: MatchStatsReviewStatus
    rawScoreboard: ScoreboardExtractionPayload
    sourceLabel?: string
    mapName?: string | null
  }) => void
}

interface SelectedFileDescriptor {
  id: string
  file: File
}

function parseNumeric(value: string): number | null {
  const cleaned = value.replace(/[%+]/g, "").trim()
  if (!cleaned) return null
  const numeric = Number.parseFloat(cleaned)
  return Number.isFinite(numeric) ? numeric : null
}

function mapScoreboardToPlayers(scoreboard: ScoreboardExtractionPayload): ExtractedPlayerStats[] {
  const rows = [...scoreboard.alpha, ...scoreboard.bravo]
  return rows
    .map((row) => ({
      team: row.team,
      position: row.position,
      username: row.playerName,
      rank: row.rank,
      acs: parseNumeric(row.acs),
      kills: parseNumeric(row.kills),
      deaths: parseNumeric(row.deaths),
      assists: parseNumeric(row.assists),
      plusMinus: parseNumeric(row.plusMinus),
      kd: parseNumeric(row.kd),
      damageDelta: parseNumeric(row.damageDelta),
      adr: parseNumeric(row.adr),
      headshotPercent: parseNumeric(row.hsPercent),
      kast: parseNumeric(row.kastPercent),
      firstKills: parseNumeric(row.firstKills),
      firstDeaths: parseNumeric(row.firstDeaths),
      multiKills: parseNumeric(row.multiKills),
    }))
    .sort((a, b) => {
      if (a.team === b.team) return a.position - b.position
      return a.team === "alpha" ? -1 : 1
    })
}

const HINT_TEXT =
  "Choose the tracker.gg exports you downloaded (Scoreboard, Rounds, Duels, Economy, Performance). Upload one map at a time — after you confirm the assignments you can immediately add the next map."

export function TrackerHtmlUpload({ matchId, onScoreboardReady }: TrackerHtmlUploadProps) {
  const { toast } = useToast()
  const [selectedFiles, setSelectedFiles] = useState<SelectedFileDescriptor[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [lastResult, setLastResult] = useState<UploadTrackerBundleResponse | null>(null)

  const hasScoreboardCandidate = useMemo(
    () => selectedFiles.some(({ file }) => /scoreboard/i.test(file.name)),
    [selectedFiles],
  )

  const recognisedSummary = useMemo(() => {
    if (!lastResult) return null
    return {
      recognised: lastResult.receivedFiles,
      unrecognised: lastResult.unrecognisedFiles ?? [],
    }
  }, [lastResult])

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const mapped: SelectedFileDescriptor[] = Array.from(files).map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
      file,
    }))

    setSelectedFiles((prev) => {
      const existingNames = new Set(prev.map((item) => item.file.name))
      const combined = [
        ...prev,
        ...mapped.filter((item) => !existingNames.has(item.file.name)),
      ]
      return combined
    })

    event.target.value = ""
  }

  const handleRemoveFile = (id: string) => {
    setSelectedFiles((prev) => prev.filter((item) => item.id !== id))
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Pick at least one tracker export to upload.",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    try {
      const filesToUpload = selectedFiles.map((item) => item.file)
      const response = await uploadMatchTrackerBundle(matchId, filesToUpload)
      setLastResult(response)

      toast({
        title: "Tracker bundle processed",
        description: `Detected ${response.receivedFiles.length} file(s).`,
      })

      if (response.scoreboard) {
        const players = mapScoreboardToPlayers(response.scoreboard)
        const scoreboardFile = selectedFiles.find(({ file }) => /scoreboard/i.test(file.name))?.file
        const fallbackLabel = filesToUpload[0]?.name ?? "tracker-bundle.html"
        onScoreboardReady?.({
          players,
          submissionId: response.submissionId,
          statsStatus: response.statsStatus,
          rawScoreboard: response.scoreboard,
          sourceLabel: scoreboardFile?.name ?? fallbackLabel,
          mapName: response.scoreboard.mapName ?? null,
        })
      }

      // Clear files so the next map bundle can be uploaded without removing manually
      setSelectedFiles([])
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to upload tracker HTML bundle."
      toast({
        title: "Upload failed",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Card className="border-terminal-border bg-terminal-panel/40 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-mono text-base uppercase text-gray-900 dark:text-matrix-500">
          <Upload className="h-5 w-5 text-matrix-500" />
          Tracker HTML Upload
        </CardTitle>
        <CardDescription className="font-mono text-xs">{HINT_TEXT}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <label className="block cursor-pointer rounded border-2 border-dashed border-matrix-500/60 bg-terminal-panel/40 p-6 text-center transition hover:border-matrix-500">
          <input
            type="file"
            accept=".html,.htm"
            multiple
            className="hidden"
            onChange={handleFileSelection}
          />
          <div className="flex flex-col items-center gap-3">
            <FileText className="h-8 w-8 text-matrix-500" />
            <p className="font-mono text-sm text-gray-900 dark:text-matrix-400">
              Click or drop to add tracker HTML files
            </p>
            <p className="font-mono text-[11px] text-terminal-muted">
              Filenames like <span className="text-matrix-500">scoreboard.html</span> help us
              auto-detect the correct slot.
            </p>
          </div>
        </label>

        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <p className="font-mono text-xs text-terminal-muted uppercase">
              Selected Files ({selectedFiles.length})
            </p>
            <div className="space-y-2">
              {selectedFiles.map(({ id, file }) => (
                <div
                  key={id}
                  className="flex items-center justify-between rounded border border-terminal-border bg-terminal-panel/30 px-3 py-2 font-mono text-xs"
                >
                  <span className="truncate text-gray-900 dark:text-matrix-400">{file.name}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveFile(id)}
                    className="h-7 px-2 text-xs"
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            {!hasScoreboardCandidate && (
              <div className="flex items-center gap-2 rounded border border-yellow-500/60 bg-yellow-500/10 px-3 py-2 font-mono text-[11px] text-yellow-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>No file name contains “scoreboard”. Make sure you include the scoreboard export.</span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Button
            onClick={handleUpload}
            disabled={isUploading || selectedFiles.length === 0}
            className="font-mono"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading bundle...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Tracker Bundle
              </>
            )}
          </Button>

          {recognisedSummary && (
            <div className="rounded border border-terminal-border bg-terminal-panel/50 p-3 font-mono text-xs text-matrix-500 space-y-1">
              <div className="flex items-center gap-2 text-matrix-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>Recognised: {recognisedSummary.recognised.join(", ") || "—"}</span>
              </div>
              {recognisedSummary.unrecognised.length > 0 && (
                <div className="flex items-start gap-2 text-terminal-muted">
                  <AlertTriangle className="h-4 w-4 mt-0.5" />
                  <span>
                    Ignored files: {recognisedSummary.unrecognised.join(", ")}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {lastResult?.scoreboard && (
          <div className="space-y-2 rounded border border-terminal-border bg-terminal-panel/50 p-3">
            <p className="font-mono text-xs uppercase text-terminal-muted">
              Preview • {lastResult.scoreboard.alpha.length + lastResult.scoreboard.bravo.length} players
              {lastResult.scoreboard.mapName ? ` • ${lastResult.scoreboard.mapName}` : ""}
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-terminal-border text-left text-xs font-mono">
                <thead className="bg-terminal-panel/40 text-terminal-muted">
                  <tr>
                    <th className="px-2 py-1">Team</th>
                    <th className="px-2 py-1">Player</th>
                    <th className="px-2 py-1">ACS</th>
                    <th className="px-2 py-1">K</th>
                    <th className="px-2 py-1">D</th>
                    <th className="px-2 py-1">A</th>
                    <th className="px-2 py-1">+/-</th>
                    <th className="px-2 py-1">ADR</th>
                    <th className="px-2 py-1">HS%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-terminal-border">
                  {[...lastResult.scoreboard.alpha, ...lastResult.scoreboard.bravo].map((row) => (
                    <tr key={`${row.team}-${row.position}-${row.playerName}`}>
                      <td className="px-2 py-1 text-terminal-muted uppercase">{row.team}</td>
                      <td className="px-2 py-1 text-gray-900 dark:text-white">{row.playerName}</td>
                      <td className="px-2 py-1 text-matrix-500">{row.acs}</td>
                      <td className="px-2 py-1">{row.kills}</td>
                      <td className="px-2 py-1">{row.deaths}</td>
                      <td className="px-2 py-1">{row.assists}</td>
                      <td className="px-2 py-1">{row.plusMinus}</td>
                      <td className="px-2 py-1">{row.adr}</td>
                      <td className="px-2 py-1">{row.hsPercent}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

 