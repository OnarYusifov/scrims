import { uploadMatchScoreboard } from '@/lib/api'
import type { MatchStatsReviewStatus, OcrPlayerRow } from '@/types'

export interface ExtractedPlayerStats {
  team: 'alpha' | 'bravo'
  position: number
  username: string
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
}

function mapRowToPlayer(row: OcrPlayerRow): ExtractedPlayerStats {
  return {
    team: row.team,
    position: row.position,
    username: row.playerName,
    acs: row.acs,
    kills: row.kills,
    deaths: row.deaths,
    assists: row.assists,
    plusMinus: row.plusMinus,
    kd: row.kd,
    damageDelta: row.damageDelta,
    adr: row.adr,
    headshotPercent: row.hsPercent,
    kast: row.kastPercent,
    firstKills: row.firstKills,
    firstDeaths: row.firstDeaths,
    multiKills: row.multiKills,
  }
}

export async function extractStatsFromImage(
  matchId: string,
  file: File,
): Promise<ServerOcrResult> {
  const response = await uploadMatchScoreboard(matchId, file)
  const players = [...response.ocr.alpha, ...response.ocr.bravo]
    .map(mapRowToPlayer)
    .sort((a, b) => {
      if (a.team === b.team) return a.position - b.position
      return a.team === 'alpha' ? -1 : 1
    })

  return {
    submissionId: response.submissionId,
    statsStatus: response.statsStatus,
    players,
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
