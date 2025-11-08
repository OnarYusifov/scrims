"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Upload, CheckCircle2, Info } from "lucide-react"
import { uploadMatchTrackerBundle, UploadTrackerBundleResponse } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

type TrackerFieldKey = "scoreboard" | "rounds" | "duels" | "economy" | "performance"

const TRACKER_FIELDS: Array<{
  key: TrackerFieldKey
  label: string
  description: string
  required?: boolean
}> = [
  {
    key: "scoreboard",
    label: "Scoreboard",
    description: "Main scoreboard export containing match summary per player.",
    required: true,
  },
  {
    key: "rounds",
    label: "Rounds",
    description: "Round-by-round breakdown with plants, defuses, and round outcomes.",
  },
  {
    key: "duels",
    label: "Duels",
    description: "First duel and clutch data (entry wins, clutches, survival).",
  },
  {
    key: "economy",
    label: "Economy",
    description: "Creds spent, loadouts, and economic impact per round.",
  },
  {
    key: "performance",
    label: "Performance",
    description: "Impact modifiers such as utility assists and multi-kill detail.",
  },
]

interface TrackerHtmlUploadProps {
  matchId: string
  onUploaded?: (result: UploadTrackerBundleResponse) => void
}

export function TrackerHtmlUpload({ matchId, onUploaded }: TrackerHtmlUploadProps) {
  const { toast } = useToast()
  const [files, setFiles] = useState<Partial<Record<TrackerFieldKey, File>>>({})
  const [isUploading, setIsUploading] = useState(false)
  const [lastResult, setLastResult] = useState<UploadTrackerBundleResponse | null>(null)

  const readyToUpload = useMemo(() => !!files.scoreboard, [files])

  const handleFileChange = (key: TrackerFieldKey, fileList: FileList | null) => {
    setFiles((prev) => ({
      ...prev,
      [key]: fileList && fileList.length > 0 ? fileList[0] : undefined,
    }))
  }

  const handleSubmit = async () => {
    if (!readyToUpload) {
      toast({
        title: "Scoreboard required",
        description: "Please provide at least the Scoreboard HTML export.",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    try {
      const response = await uploadMatchTrackerBundle(matchId, files)
      setLastResult(response)
      toast({
        title: "Tracker bundle received",
        description: `Stored ${response.receivedFiles.length} HTML file(s).`,
      })
      onUploaded?.(response)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not upload tracker HTML bundle."
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
        <CardDescription className="font-mono text-xs">
          Upload the exported HTML files from tracker.gg to feed the advanced Rating 2.0 pipeline.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded border border-terminal-border bg-terminal-panel/60 p-3 text-xs font-mono text-terminal-muted flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 text-matrix-500" />
          <span>
            Scoreboard is mandatory. Rounds, Duels, Economy, and Performance files unlock clutch,
            econ, and role-aware adjustments. Upload whichever files you have; the pipeline will
            fall back gracefully.
          </span>
        </div>

        <div className="space-y-4">
          {TRACKER_FIELDS.map((field) => {
            const file = files[field.key]
            return (
              <div
                key={field.key}
                className="rounded border border-dashed border-terminal-border bg-terminal-panel/30 p-4"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-mono text-sm text-gray-900 dark:text-white uppercase">
                      {field.label}
                    </p>
                    {field.required && (
                      <span className="ml-1 inline-flex items-center rounded border border-red-500 px-2 py-0.5 font-mono text-[10px] uppercase text-red-500">
                        required
                      </span>
                    )}
                    <p className="font-mono text-[11px] text-terminal-muted">{field.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {file && (
                      <span className="inline-flex items-center rounded border border-terminal-border bg-terminal-panel/40 px-2 py-1 font-mono text-[11px] text-terminal-muted">
                        {file.name}
                      </span>
                    )}
                    <Input
                      type="file"
                      accept=".html,.htm"
                      onChange={(event) => handleFileChange(field.key, event.target.files)}
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!readyToUpload || isUploading}
            className="font-mono"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Tracker Bundle
              </>
            )}
          </Button>
          {lastResult && (
            <div className="flex items-center gap-2 rounded border border-terminal-border bg-terminal-panel/50 px-3 py-2 font-mono text-xs text-matrix-500">
              <CheckCircle2 className="h-4 w-4" />
              <span>
                Stored files: {lastResult.receivedFiles.join(", ") || "none"}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

