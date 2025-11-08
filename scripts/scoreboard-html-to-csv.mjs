#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { load } from 'cheerio'

const HEADERS = [
  'player',
  'team',
  'rank',
  'ACS',
  'K',
  'D',
  'A',
  '+/-',
  'K/D',
  'DDΔ',
  'ADR',
  'HS%',
  'KAST',
  'FK',
  'FD',
  'MK',
]

function normaliseValues(values) {
  const cleaned = values.map((value) => {
    const trimmed = value.trim()
    return trimmed.length === 0 ? '0' : trimmed
  })

  if (cleaned.length === 12) {
    cleaned.splice(4, 0, '0')
  }

  return cleaned
}

function extractRows(html) {
  const $ = load(html)
  const rows = []

  $('.st').each((_, teamContainer) => {
    const teamName = $(teamContainer).find('.st-header .label span').first().text().trim() || 'Unknown'

    $(teamContainer)
      .find('.st-content__item')
      .each((__, item) => {
        const username = $(item).find('.trn-ign__username').first().text().trim()
        const discriminator = $(item).find('.trn-ign__discriminator').first().text().trim()
        const rank = $(item).find('.st-entry-rank .value').first().text().trim()
        const values = normaliseValues(
          $(item)
            .find('.value')
            .map((___, el) => $(el).text())
            .get(),
        )

        if (!username) return

        const playerId = `${username}${discriminator}`
        rows.push([
          playerId,
          teamName,
          rank,
          ...values,
        ])
      })
  })

  return rows
}

function toCsv(rows) {
  const lines = [HEADERS.join(',')]
  rows.forEach((row) => lines.push(row.map((value) => value.replace(/,/g, '')).join(',')))
  return lines.join('\n')
}

async function main() {
  const sourcePath = process.argv[2]
  if (!sourcePath) {
    console.error('Usage: ./scoreboard-html-to-csv.mjs <path-to-html> [output.csv]')
    process.exit(1)
  }

  const html = await fs.readFile(sourcePath, 'utf-8')
  const rows = extractRows(html)

  if (!rows.length) {
    console.error('No scoreboard rows found. Ensure the HTML is exported from tracker.gg scoreboard view.')
    process.exit(1)
  }

  const outputPath =
    process.argv[3] || path.join(path.dirname(sourcePath), `${path.parse(sourcePath).name}-stats.csv`)

  await fs.writeFile(outputPath, toCsv(rows), 'utf-8')
  console.log(`Extracted ${rows.length} players to ${outputPath}`)
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch((error) => {
    console.error('Failed to parse scoreboard HTML:', error.message)
    process.exit(1)
  })
}
