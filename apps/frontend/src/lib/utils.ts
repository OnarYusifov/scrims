import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number, decimals: number = 2): string {
  return num.toFixed(decimals)
}

export function formatKD(kills: number, deaths: number): string {
  if (deaths === 0) return kills.toFixed(2)
  return (kills / deaths).toFixed(2)
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

export function getEloColor(elo: number, isCalibrating: boolean = false): string {
  if (isCalibrating) return "text-terminal-muted" // Unranked
  if (elo >= 2000) return "text-purple-400" // Godlike
  if (elo >= 1800) return "text-red-400" // Legendary
  if (elo >= 1600) return "text-cyan-400" // Diamond
  if (elo >= 1400) return "text-blue-400" // Platinum
  if (elo >= 1200) return "text-yellow-400" // Gold
  if (elo >= 800) return "text-gray-400" // Silver
  return "text-orange-400" // Bronze (600 and below)
}

export function getEloRank(elo: number, isCalibrating: boolean = false): string {
  if (isCalibrating) return "UNRANKED"
  if (elo >= 2000) return "GODLIKE"
  if (elo >= 1800) return "LEGENDARY"
  if (elo >= 1600) return "DIAMOND"
  if (elo >= 1400) return "PLATINUM"
  if (elo >= 1200) return "GOLD"
  if (elo >= 800) return "SILVER"
  return "BRONZE" // 600 and below is Bronze
}

export function getEloDelta(change: number): { text: string; color: string } {
  const sign = change >= 0 ? "+" : ""
  const text = `${sign}${change}`
  const color = change >= 0 ? "text-matrix-500" : "text-red-500"
  return { text, color }
}

export function formatTimestamp(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 7) {
    return d.toLocaleDateString()
  }
  if (days > 0) {
    return `${days}d ago`
  }
  if (hours > 0) {
    return `${hours}h ago`
  }
  if (minutes > 0) {
    return `${minutes}m ago`
  }
  return "Just now"
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Re-export random functions from random.ts (which uses Random.org)
export { randomInt, shuffleArray, coinFlip, selectRandom } from './random'

// Legacy synchronous versions (fallback only - use async versions from random.ts)
export function randomIntSync(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function shuffleArraySync<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

