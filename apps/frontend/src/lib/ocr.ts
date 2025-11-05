import Tesseract from 'tesseract.js'

export interface ExtractedPlayerStats {
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
  rawText?: string // For debugging
}

/**
 * Preprocess image for better OCR results
 * - Convert to grayscale (saturation = 0)
 * - Increase contrast
 * - Sharpen text
 */
async function preprocessImage(imageFile: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()

    reader.onload = (e) => {
      img.src = e.target?.result as string
      
      img.onload = () => {
        // Create canvas
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        canvas.width = img.width
        canvas.height = img.height

        // Draw image
        ctx.drawImage(img, 0, 0)

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data

        // Process each pixel
        for (let i = 0; i < data.length; i += 4) {
          // Convert to grayscale (saturation = 0)
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3
          
          // Increase contrast (adjust the multiplier and threshold)
          const contrast = 1.5
          let value = ((avg - 128) * contrast) + 128
          
          // Clamp values
          value = Math.max(0, Math.min(255, value))

          // Apply to all channels
          data[i] = value     // R
          data[i + 1] = value // G
          data[i + 2] = value // B
          // Alpha stays the same
        }

        // Put processed image data back
        ctx.putImageData(imageData, 0, 0)

        // Convert to data URL
        resolve(canvas.toDataURL('image/png'))
      }

      img.onerror = () => reject(new Error('Failed to load image'))
    }

    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(imageFile)
  })
}

/**
 * Extract stats from a Valorant stats screenshot using OCR
 */
export async function extractStatsFromImage(
  imageFile: File
): Promise<{ players: ExtractedPlayerStats[]; rawText: string }> {
  try {
    // Preprocess image
    console.log('Preprocessing image...')
    const preprocessedImageUrl = await preprocessImage(imageFile)
    
    // Perform OCR on the preprocessed image
    const result = await Tesseract.recognize(preprocessedImageUrl, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`)
        }
      },
    })

    const rawText = result.data.text
    console.log('OCR Raw Text:', rawText)

    // Parse the text to extract player stats
    const players = parseStatsText(rawText)

    return { players, rawText }
  } catch (error) {
    console.error('OCR Error:', error)
    throw new Error('Failed to process image with OCR')
  }
}

/**
 * Parse OCR text to extract player stats
 * This looks for patterns like:
 * username #tag ACS K D A +/- K/D DDΔ ADR HS% KAST FK FD MK
 */
function parseStatsText(text: string): ExtractedPlayerStats[] {
  const players: ExtractedPlayerStats[] = []
  const lines = text.split('\n')

  // Build a multi-line buffer to handle wrapped text
  let buffer: string[] = []
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) {
      if (buffer.length > 0) {
        tryExtractPlayer(buffer, players)
        buffer = []
      }
      continue
    }

    buffer.push(line)
    
    // Try to extract if we have enough data
    if (buffer.length >= 1) {
      const combined = buffer.join(' ')
      const hasUsername = /([A-Za-z0-9\s]+?)\s*[#@]([A-Za-z0-9]+)/.test(combined)
      const numbers = extractNumbers(combined)
      
      // If we have a username and enough numbers, try to extract
      if (hasUsername && numbers.length >= 11) {
        tryExtractPlayer(buffer, players)
        buffer = []
      }
      // If buffer is getting too long without success, reset
      else if (buffer.length > 3) {
        buffer = buffer.slice(-1)
      }
    }
  }

  // Process any remaining buffer
  if (buffer.length > 0) {
    tryExtractPlayer(buffer, players)
  }

  return players
}

/**
 * Try to extract a player from buffered lines
 */
function tryExtractPlayer(lines: string[], players: ExtractedPlayerStats[]): void {
  const combined = lines.join(' ')
  
  // Look for username pattern
  const playerMatch = combined.match(/([A-Za-z0-9\s]+?)\s*[#@]([A-Za-z0-9]+)/)
  
  if (!playerMatch) return

  const username = `${playerMatch[1].trim()}#${playerMatch[2]}`
  
  // Extract all numbers from combined text
  const allNumbers = extractNumbers(combined)

  if (allNumbers.length >= 11) {
    // Expected order: ACS, K, D, A, +/-, K/D, DDΔ, ADR, HS%, KAST%, FK, FD, MK
    const player: ExtractedPlayerStats = {
      username,
      acs: allNumbers[0] ?? null,
      kills: allNumbers[1] ?? null,
      deaths: allNumbers[2] ?? null,
      assists: allNumbers[3] ?? null,
      plusMinus: allNumbers[4] ?? null,
      kd: allNumbers[5] ?? null,
      damageDelta: allNumbers[6] ?? null,
      adr: allNumbers[7] ?? null,
      headshotPercent: allNumbers[8] ?? null,
      kast: allNumbers[9] ?? null,
      firstKills: allNumbers[10] ?? null,
      firstDeaths: allNumbers[11] ?? null,
      multiKills: allNumbers[12] ?? null,
      rawText: combined,
    }

    // Validate stats are reasonable
    if (validateStats(player)) {
      players.push(player)
      console.log('Extracted player:', player)
    }
  }
}

/**
 * Validate extracted stats are reasonable
 */
function validateStats(player: ExtractedPlayerStats): boolean {
  // ACS should be between 0-500
  if (player.acs !== null && (player.acs < 0 || player.acs > 600)) return false
  
  // Kills should be reasonable (0-50)
  if (player.kills !== null && (player.kills < 0 || player.kills > 50)) return false
  
  // Deaths should be reasonable (0-30)
  if (player.deaths !== null && (player.deaths < 0 || player.deaths > 30)) return false
  
  return true
}

/**
 * Extract all numbers from a text string, including decimals and negative numbers
 */
function extractNumbers(text: string): number[] {
  const numbers: number[] = []
  
  // Match patterns like: 377, 33, 15, +18, -6, 2.2, 231.7, 31%, etc.
  const patterns = [
    /([+-]?\d+\.?\d*)/g,
  ]

  for (const pattern of patterns) {
    const matches = text.matchAll(pattern)
    for (const match of matches) {
      const numStr = match[1].replace(/[+%]/g, '') // Remove + and % signs
      const num = parseFloat(numStr)
      if (!isNaN(num)) {
        numbers.push(num)
      }
    }
  }

  return numbers
}

/**
 * Clean username to match format in database
 */
export function cleanUsername(username: string): string {
  return username
    .replace(/\s+/g, ' ') // Normalize spaces
    .replace(/[#@]/g, '#') // Normalize tag separator
    .trim()
}

/**
 * Fuzzy match username against a list of possible usernames
 */
export function fuzzyMatchUsername(
  extracted: string,
  candidates: string[]
): string | null {
  const cleanExtracted = cleanUsername(extracted).toLowerCase()
  
  // Try exact match first
  for (const candidate of candidates) {
    if (cleanUsername(candidate).toLowerCase() === cleanExtracted) {
      return candidate
    }
  }

  // Try partial match (username without tag)
  const extractedBase = cleanExtracted.split('#')[0]
  for (const candidate of candidates) {
    const candidateBase = cleanUsername(candidate).toLowerCase().split('#')[0]
    if (candidateBase === extractedBase) {
      return candidate
    }
  }

  // Try contains match
  for (const candidate of candidates) {
    const cleanCandidate = cleanUsername(candidate).toLowerCase()
    if (cleanCandidate.includes(extractedBase) || extractedBase.includes(cleanCandidate.split('#')[0])) {
      return candidate
    }
  }

  return null
}

