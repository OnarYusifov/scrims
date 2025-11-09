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

export type MatchStatsSource = 'MANUAL' | 'OCR' | 'TRACKER'

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
  damageDelta: number
  rating20: number
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

export interface ScoreboardPlayerRow {
  team: 'alpha' | 'bravo'
  position: number
  playerName: string
  rank: string
  acs: string
  kills: string
  deaths: string
  assists: string
  plusMinus: string
  kd: string
  damageDelta: string
  adr: string
  hsPercent: string
  kastPercent: string
  firstKills: string
  firstDeaths: string
  multiKills: string
}

export interface RawScoreboardTeam {
  name: string
  players: Array<{
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
  }>
}

export interface ScoreboardExtractionPayload {
  alpha: ScoreboardPlayerRow[]
  bravo: ScoreboardPlayerRow[]
  teams: RawScoreboardTeam[]
  mapName?: string | null
}

export interface UploadMatchScoreboardResponse {
  message: string
  submissionId: string
  statsStatus: MatchStatsReviewStatus
  scoreboard: ScoreboardExtractionPayload
}
