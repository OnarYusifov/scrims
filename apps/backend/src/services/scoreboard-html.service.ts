import { load } from 'cheerio'

export interface ParsedPlayerRow {
  playerId: string
  team: string
  rank: string
  acs: string
  kills: string
  deaths: string
  assists: string
  plusMinus: string
  kd: string
  damageDelta: string
  adr: string
  headshotPercent: string
  kast: string
  firstKills: string
  firstDeaths: string
  multiKills: string
}

export interface ParsedScoreboardResult {
  teams: Array<{
    name: string
    players: ParsedPlayerRow[]
  }>
  rawPlayerCount: number
  mapName?: string | null
}

const VALORANT_MAPS = [
  'Ascent',
  'Bind',
  'Haven',
  'Split',
  'Icebox',
  'Breeze',
  'Fracture',
  'Pearl',
  'Lotus',
  'Sunset',
  'Abyss',
  'District',
] as const

const VALUE_HEADERS = [
  'acs',
  'kills',
  'deaths',
  'assists',
  'plusMinus',
  'kd',
  'damageDelta',
  'adr',
  'headshotPercent',
  'kast',
  'firstKills',
  'firstDeaths',
  'multiKills',
] as const

type ValueKey = (typeof VALUE_HEADERS)[number]

function normaliseValues(values: string[]): Record<ValueKey, string> {
  const cleaned = values.map((value) => {
    const trimmed = value.trim()
    if (!trimmed) return '0'
    return trimmed
  })

  if (cleaned.length === 12) {
    cleaned.splice(4, 0, '0')
  }

  const result: Partial<Record<ValueKey, string>> = {}
  VALUE_HEADERS.forEach((key, index) => {
    result[key] = cleaned[index] ?? '0'
  })

  return result as Record<ValueKey, string>
}

export function parseScoreboardFromHtml(html: string): ParsedScoreboardResult {
  const $ = load(html)
  const teams: ParsedScoreboardResult['teams'] = []
  const findMapName = () => {
    const titleText = $('title').text().trim()
    for (const candidate of VALORANT_MAPS) {
      const regex = new RegExp(`\\b${candidate}\\b`, 'i')
      if (regex.test(titleText)) {
        return candidate
      }
    }

    const headerText = $('.trn-match-bar, .st-header, header, h1, h2')
      .map((_, el) => $(el).text())
      .get()
      .join(' ')
      .trim()
    for (const candidate of VALORANT_MAPS) {
      const regex = new RegExp(`\\b${candidate}\\b`, 'i')
      if (regex.test(headerText)) {
        return candidate
      }
    }

    const bodyText = $('body').text().trim()
    for (const candidate of VALORANT_MAPS) {
      const regex = new RegExp(`\\b${candidate}\\b`, 'i')
      if (regex.test(bodyText)) {
        return candidate
      }
    }

    return null
  }

  const detectedMapName = findMapName()

  $('.st').each((_, teamElement) => {
    const teamName = $(teamElement).find('.st-header .label span').first().text().trim() || 'Unknown'
    const players: ParsedPlayerRow[] = []

    $(teamElement)
      .find('.st-content__item')
      .each((__, playerElement) => {
        const username = $(playerElement).find('.trn-ign__username').first().text().trim()
        const discriminator = $(playerElement).find('.trn-ign__discriminator').first().text().trim()
        const rank = $(playerElement).find('.st-entry-rank .value').first().text().trim()

        if (!username) return

        const values = normaliseValues(
          $(playerElement)
            .find('.value')
            .map((___, valueElement) => $(valueElement).text())
            .get(),
        )

        players.push({
          playerId: `${username}${discriminator}`,
          team: teamName,
          rank,
          ...values,
        })
      })

    if (players.length) {
      teams.push({ name: teamName, players })
    }
  })

  return {
    teams,
    rawPlayerCount: teams.reduce((total, team) => total + team.players.length, 0),
    mapName: detectedMapName,
  }
}
