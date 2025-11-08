export type UserRole = 'USER' | 'MODERATOR' | 'ADMIN' | 'ROOT'

export type MatchStatus =
  | 'DRAFT'
  | 'CAPTAIN_VOTING'
  | 'TEAM_SELECTION'
  | 'MAP_PICK_BAN'
  | 'IN_PROGRESS'
  | 'VOTING'
  | 'COMPLETED'
  | 'CANCELLED'

export type SeriesType = 'BO1' | 'BO3' | 'BO5'

export type TeamSide = 'ATTACKER' | 'DEFENDER'

export type MapAction = 'PICK' | 'BAN' | 'DECIDER'

export type MatchStatsSource = 'MANUAL' | 'OCR'

export type MatchStatsReviewStatus =
  | 'NOT_STARTED'
  | 'PENDING_REVIEW'
  | 'CONFIRMED'
  | 'REJECTED'

export interface User {
  id: string
  discordId: string
  username: string
  discriminator?: string
  avatar?: string
  avatarUrl?: string // Computed from avatar hash
  email?: string
  role: UserRole
  isWhitelisted: boolean
  isBanned: boolean
  elo: number
  peakElo: number
  matchesPlayed: number
  isCalibrating: boolean
  totalKills: number
  totalDeaths: number
  totalAssists: number
  totalACS: number
  totalADR: number
  createdAt: Date
  updatedAt: Date
  lastLogin?: Date
}

export interface Match {
  id: string
  seriesType: SeriesType
  status: MatchStatus
  statsStatus: MatchStatsReviewStatus
  createdAt: Date
  updatedAt: Date
  startedAt?: Date
  completedAt?: Date
  winnerTeamId?: string
  teams: Team[]
  maps: MapSelection[]
  playerStats: PlayerMatchStats[]
  statsSubmissions?: MatchStatsSubmissionRecord[]
}

export interface Team {
  id: string
  matchId: string
  name: string
  side: TeamSide
  captainId?: string
  captain?: User
  roundsWon: number
  mapsWon: number
  members: TeamMember[]
}

export interface TeamMember {
  id: string
  teamId: string
  userId: string
  user: User
  joinedAt: Date
}

export interface MapSelection {
  id: string
  matchId: string
  mapName: string
  action: MapAction
  order: number
  teamId?: string
  wasPlayed: boolean
  winnerTeamId?: string
  createdAt: Date
}

export interface PlayerMatchStats {
  id: string
  matchId: string
  userId: string
  user: User
  teamId: string
  kills: number
  deaths: number
  assists: number
  acs: number
  adr: number
  headshotPercent: number
  firstKills: number
  firstDeaths: number
  kast: number
  clutches: number
  multiKills: number
  kd: number
  plusMinus: number
  wpr: number
  createdAt: Date
  updatedAt: Date
}

export interface EloHistory {
  id: string
  userId: string
  matchId: string
  oldElo: number
  newElo: number
  change: number
  kFactor: number
  won: boolean
  seriesType: SeriesType
  createdAt: Date
}

export interface LeaderboardEntry extends User {
  rank: number
  avgKD: number
  avgACS: number
  avgWPR: number
}

export interface MatchStatsSubmissionRecord {
  id: string
  source: MatchStatsSource
  status: MatchStatsReviewStatus
  createdAt: Date
  updatedAt: Date
  notes?: string | null
  uploader?: {
    id: string
    username: string
    discordId: string
    avatar?: string | null
  } | null
}

export interface ValorantMap {
  id: string
  name: string
  isActive: boolean
  order: number
  imageUrl?: string
}

export interface WeightProfile {
  id: string
  name: string
  isActive: boolean
  killWeight: number
  deathWeight: number
  assistWeight: number
  acsWeight: number
  adrWeight: number
  kastWeight: number
  firstKillWeight: number
  clutchWeight: number
  createdAt: Date
  updatedAt: Date
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface OcrPlayerRow {
  team: 'alpha' | 'bravo'
  position: number
  playerName: string
  acs: number | null
  kills: number | null
  deaths: number | null
  assists: number | null
  plusMinus: number | null
  kd: number | null
  damageDelta: number | null
  adr: number | null
  hsPercent: number | null
  kastPercent: number | null
  firstKills: number | null
  firstDeaths: number | null
  multiKills: number | null
}

export interface OcrExtractionPayload {
  alpha: OcrPlayerRow[]
  bravo: OcrPlayerRow[]
  width: number
  height: number
}

export interface UploadMatchOcrResponse {
  message: string
  submissionId: string
  statsStatus: MatchStatsReviewStatus
  ocr: OcrExtractionPayload
}
