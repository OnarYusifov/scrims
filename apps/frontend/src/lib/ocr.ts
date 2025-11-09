import { uploadMatchScoreboard } from '@/lib/api'
import type { MatchStatsReviewStatus, ScoreboardPlayerRow } from '@/types'

export interface ExtractedPlayerStats {
  team: 'alpha' | 'bravo'
  position: number
  username: string
  rank: string
  acs: number | null
  kills: number | null
  deaths: number | null
  assists: number | null
  plusMinus: number | null
  kd: number | null
  damageDelta: number | null
  adr: number | null
  headshotPercent: number | null
  kast: number | null
  firstKills: number | null
  firstDeaths: number | null
  multiKills: number | null
}

export interface ServerOcrResult {
  submissionId: string
  statsStatus: MatchStatsReviewStatus
  players: ExtractedPlayerStats[]
  mapName?: string | null
}

function parseNumeric(value: string): number | null {
  if (value === undefined || value === null) return null
  const cleaned = value.replace(/[%+]/g, '')
  if (cleaned.length === 0) return null
  const asNumber = Number.parseFloat(cleaned)
  return Number.isFinite(asNumber) ? asNumber : null
}

function mapRowToPlayer(row: ScoreboardPlayerRow): ExtractedPlayerStats {
  return {
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
  }
}

export async function extractStatsFromHtml(
  matchId: string,
  file: File,
): Promise<ServerOcrResult> {
  const response = await uploadMatchScoreboard(matchId, file)
  const players = [...response.scoreboard.alpha, ...response.scoreboard.bravo]
    .map(mapRowToPlayer)
    .sort((a, b) => {
      if (a.team === b.team) return a.position - b.position
      return a.team === 'alpha' ? -1 : 1
    })

  return {
    submissionId: response.submissionId,
    statsStatus: response.statsStatus,
    players,
    mapName: response.scoreboard?.mapName ?? null,
  }
}

export function cleanUsername(username: string): string {
  return username
    .replace(/\s+/g, ' ')
    .replace(/[#@]/g, '#')
    .trim()
}

export function fuzzyMatchUsername(
  extracted: string,
  candidates: string[],
): string | null {
  const cleanExtracted = cleanUsername(extracted).toLowerCase()

  for (const candidate of candidates) {
    if (cleanUsername(candidate).toLowerCase() === cleanExtracted) {
      return candidate
    }
  }

  const extractedBase = cleanExtracted.split('#')[0]
  for (const candidate of candidates) {
    const candidateBase = cleanUsername(candidate).toLowerCase().split('#')[0]
    if (candidateBase === extractedBase) {
      return candidate
    }
  }

  for (const candidate of candidates) {
    const cleanCandidate = cleanUsername(candidate).toLowerCase()
    if (
      cleanCandidate.includes(extractedBase) ||
      extractedBase.includes(cleanCandidate.split('#')[0])
    ) {
      return candidate
    }
  }

  return null
}
