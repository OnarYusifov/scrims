"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { EloChart } from "@/components/profile/elo-chart"
import { RankBadge } from "@/components/profile/rank-badge"
import { MomentTags } from "@/components/profile/moment-tags"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Trophy,
  Target,
  Activity,
  Zap,
  TrendingUp,
  Swords,
  Clock,
  Shield,
  Gauge,
} from "lucide-react"
import { ProfileData } from "@/lib/api"

interface UserProfileViewProps {
  profile: ProfileData
  isOwnProfile?: boolean
  onViewAllMatches?: () => void
  canViewAll?: boolean
  isViewingAll?: boolean
}

export function UserProfileView({
  profile,
  onViewAllMatches,
  canViewAll = false,
  isViewingAll = false,
}: UserProfileViewProps) {
  const { user, eloHistory, recentStats, summary, careerStats } = profile
  const matchHistory = profile.matchHistory ?? []
  const [showStatsDialog, setShowStatsDialog] = useState(false)
  const previousElo = eloHistory.length > 1 ? eloHistory[eloHistory.length - 2].newElo : undefined
  const totalMatches = profile.matchHistoryCount ?? matchHistory.length
  const showingMatches = matchHistory.length
  const isShowingAllMatches = isViewingAll || showingMatches >= totalMatches
  const ratingSamples = matchHistory.map((match) => match.userStats.rating20 ?? 1)
  const averageRating =
    ratingSamples.length > 0
      ? ratingSamples.reduce((sum, value) => sum + value, 0) / ratingSamples.length
      : recentStats.rating20 ?? 1
  const lastMatchRating =
    ratingSamples.length > 0 ? ratingSamples[0] ?? averageRating : recentStats.rating20 ?? averageRating
  const previousMatchRating =
    ratingSamples.length > 1 ? ratingSamples[1] ?? averageRating : averageRating
  const ratingTrend = lastMatchRating - previousMatchRating
  const formatRating = (value: number | null | undefined) =>
    (value ?? 1).toFixed(2)
  const ratingTrendClass =
    ratingTrend > 0 ? "text-green-500" : ratingTrend < 0 ? "text-red-500" : "text-terminal-muted"
  const winRateDisplay = `${summary.winRate.toFixed(1)}%`
  const currentStreakLabel = summary.currentStreak
    ? `${summary.currentStreak.type === 'WIN' ? 'W' : 'L'}${summary.currentStreak.length}`
    : "—"
  const longestWinLabel = summary.longestWinStreak > 0 ? `W${summary.longestWinStreak}` : "—"
  const longestLossLabel = summary.longestLossStreak > 0 ? `L${summary.longestLossStreak}` : "—"
  const careerKDDisplay = Number.isFinite(careerStats.kd) ? careerStats.kd.toFixed(2) : "0.00"
  const getResultColor = (result: 'WIN' | 'LOSS' | 'PENDING') => {
    switch (result) {
      case 'WIN':
        return 'text-green-500'
      case 'LOSS':
        return 'text-red-500'
      default:
        return 'text-yellow-500'
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  return (
    <motion.div
      className="container relative py-10"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Profile Header */}
      <motion.div variants={itemVariants} className="mb-8">
        <Card className="border-matrix-500 shadow-neon-green">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Avatar */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
              >
                <Avatar className="h-24 w-24 border-4 border-matrix-500">
                  {user.avatarUrl ? (
                    <AvatarImage src={user.avatarUrl} alt={user.username} />
                  ) : (
                    <AvatarFallback className="bg-terminal-panel text-matrix-500 text-2xl">
                      {user.username?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  )}
                </Avatar>
              </motion.div>

              {/* User Info */}
              <div className="flex-1 text-center md:text-left w-full">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-bold font-mono uppercase text-gray-900 dark:text-matrix-500">
                      {user.username}
                    </h1>
                    <p className="text-terminal-muted font-mono text-sm mt-1">
                      {user.rankName} • {user.matchesPlayed} matches played
                    </p>
                  </div>
                  <RankBadge elo={user.elo} previousElo={previousElo} isCalibrating={user.isCalibrating} />
                  <Button
                    variant="outline"
                    onClick={() => setShowStatsDialog(true)}
                    className="font-mono uppercase"
                  >
                    Stats
                  </Button>
                </div>

                {/* Moment Tags */}
                <div className="mt-4">
                  <MomentTags user={user} eloHistory={eloHistory} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Summary Card */}
      <motion.div variants={itemVariants} className="mb-8">
        <Card className="border-terminal-border bg-white/80 dark:bg-terminal-panel">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-gray-900 dark:text-matrix-500 font-mono uppercase text-sm">
                Performance Summary
              </CardTitle>
              <CardDescription className="font-mono text-xs text-terminal-muted">
                {summary.completedMatches} completed matches recorded for {user.username}.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowStatsDialog(true)}
              className="font-mono uppercase"
            >
              View Detailed Stats
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryMetric label="Wins" value={summary.wins} accent="text-green-500" />
              <SummaryMetric label="Losses" value={summary.losses} accent="text-red-500" />
              <SummaryMetric
                label="Win Rate"
                value={winRateDisplay}
                description="Across completed matches"
              />
              <SummaryMetric
                label="Current Streak"
                value={currentStreakLabel}
                description="Most recent run"
              />
              <SummaryMetric
                label="Longest Win Streak"
                value={longestWinLabel}
                description="Career best run"
              />
              <SummaryMetric
                label="Longest Loss Streak"
                value={longestLossLabel}
                description="Toughest stretch"
              />
              <SummaryMetric
                label="Rating 2.0 Avg"
                value={careerStats.rating20.toFixed(2)}
                description="Lifetime rating"
              />
              <SummaryMetric
                label="Damage Delta"
                value={careerStats.damageDelta.toLocaleString()}
                description="Net damage over career"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        variants={itemVariants}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8"
      >
        <Card className="hover:border-matrix-500 transition-all">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-mono uppercase text-terminal-muted">
                Current Elo
              </CardTitle>
              <Trophy className="h-5 w-5 text-matrix-500" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-matrix-500">{user.elo}</p>
            <p className="text-xs text-terminal-muted font-mono mt-1">
              Peak: {user.peakElo}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-cyber-500 transition-all">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-mono uppercase text-terminal-muted">
                Avg K/D
              </CardTitle>
              <Target className="h-5 w-5 text-cyber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-cyber-500">
              {user.avgKD.toFixed(2)}
            </p>
            <p className="text-xs text-terminal-muted font-mono mt-1">
              {user.totalKills}K / {user.totalDeaths}D / {user.totalAssists}A
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-matrix-500 transition-all">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-mono uppercase text-terminal-muted">
                Avg ACS
              </CardTitle>
              <Activity className="h-5 w-5 text-matrix-500" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-matrix-500">
              {Math.round(user.avgACS)}
            </p>
            <p className="text-xs text-terminal-muted font-mono mt-1">
              Combat Score
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-cyber-500 transition-all">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-mono uppercase text-terminal-muted">
                Avg ADR
              </CardTitle>
              <Zap className="h-5 w-5 text-cyber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-cyber-500">
              {Math.round(user.avgADR)}
            </p>
            <p className="text-xs text-terminal-muted font-mono mt-1">
              Damage/Round
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={showStatsDialog} onOpenChange={setShowStatsDialog}>
        <DialogContent className="max-w-3xl border-terminal-border bg-terminal-panel text-terminal-foreground">
          <DialogHeader>
            <DialogTitle className="font-mono text-matrix-500">
              Detailed Stats · {user.username}
            </DialogTitle>
            <DialogDescription className="font-mono text-terminal-muted">
              Lifetime performance metrics across all recorded matches.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <DetailMetric label="Matches Recorded" value={careerStats.matchesRecorded} />
            <DetailMetric label="Win Rate" value={winRateDisplay} />
            <DetailMetric label="K/D Ratio" value={careerKDDisplay} />
            <DetailMetric
              label="Average Rating 2.0"
              value={careerStats.rating20.toFixed(2)}
            />
            <DetailMetric label="Kills" value={careerStats.kills.toLocaleString()} />
            <DetailMetric label="Deaths" value={careerStats.deaths.toLocaleString()} />
            <DetailMetric label="Assists" value={careerStats.assists.toLocaleString()} />
            <DetailMetric
              label="Damage Delta"
              value={careerStats.damageDelta.toLocaleString()}
            />
            <DetailMetric
              label="Average ACS"
              value={Math.round(careerStats.acs).toString()}
              helper="Lifetime avg combat score"
            />
            <DetailMetric
              label="Average ADR"
              value={Math.round(careerStats.adr).toString()}
              helper="Average damage per round"
            />
            <DetailMetric
              label="Average KAST"
              value={`${careerStats.kast.toFixed(1)}%`}
            />
            <DetailMetric
              label="Average HS%"
              value={`${careerStats.headshotPercent.toFixed(1)}%`}
            />
            <DetailMetric
              label="Average WPR"
              value={careerStats.wpr.toFixed(2)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Rating & Elo Row */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {/* Rating Summary */}
        <motion.div variants={itemVariants}>
          <Card className="border-cyber-500 shadow-neon-cyan h-full">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-cyber-500 flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                RATING 2.0 SNAPSHOT
              </CardTitle>
              <CardDescription className="font-mono">
                Weighted impact across recent matches (mean 1.00)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-xs font-mono uppercase text-terminal-muted">Last Match Rating</p>
                <div className="flex items-end gap-3">
                  <p className="text-4xl font-bold text-cyber-500">
                    {formatRating(lastMatchRating)}
                  </p>
                  <span className={`font-mono text-sm ${ratingTrendClass}`}>
                    {ratingTrend > 0 ? "+" : ""}
                    {ratingTrend.toFixed(2)} vs previous
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3 text-sm font-mono">
                <div className="rounded border border-terminal-border bg-terminal-panel/40 p-3">
                  <p className="text-terminal-muted text-xs uppercase">Recent Average (10)</p>
                  <p className="text-matrix-500 text-xl">{formatRating(recentStats.rating20)}</p>
                </div>
                <div className="rounded border border-terminal-border bg-terminal-panel/40 p-3">
                  <p className="text-terminal-muted text-xs uppercase">Match History Avg</p>
                  <p className="text-matrix-500 text-xl">{formatRating(averageRating)}</p>
                </div>
                <div className="rounded border border-terminal-border bg-terminal-panel/40 p-3">
                  <p className="text-terminal-muted text-xs uppercase">Peak Elo Delta</p>
                  <p className="text-matrix-500 text-xl">
                    {profile.user.peakElo - profile.user.elo >= 0 ? "+" : ""}
                    {(profile.user.peakElo - profile.user.elo).toFixed(0)}
                  </p>
                </div>
              </div>
              <div className="rounded border border-terminal-border bg-terminal-panel/40 p-3 text-xs leading-relaxed text-terminal-muted">
                Rating 2.0 blends mechanical output (kills, ADR, multi-kills) with tactical impact
                (KAST, entry duels, eco value) and normalizes against your Elo band. Clamp range is
                0.70 – 1.30 with extreme outliers reaching ±0.1 additional swing.
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Elo History */}
        <motion.div variants={itemVariants}>
          <Card className="border-matrix-500 shadow-neon-green h-full">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-matrix-500 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                ELO HISTORY
              </CardTitle>
              <CardDescription className="font-mono">
                Rating progression over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EloChart history={eloHistory} />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Additional Stats */}
      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Swords className="h-5 w-5 text-matrix-500" />
              <CardTitle className="text-sm font-mono uppercase">Recent Performance</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 font-mono text-sm">
            <div className="flex justify-between">
              <span className="text-terminal-muted">Rating 2.0:</span>
              <span className="text-cyber-500">{formatRating(recentStats.rating20)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-terminal-muted">ACS:</span>
              <span className="text-matrix-500">{Math.round(recentStats.acs)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-terminal-muted">ADR:</span>
              <span className="text-cyber-500">{Math.round(recentStats.adr)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-terminal-muted">KAST:</span>
              <span className="text-matrix-500">{Math.round(recentStats.kast)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-terminal-muted">HS%:</span>
              <span className="text-cyber-500">{Math.round(recentStats.headshotPercent)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-terminal-muted">K/D:</span>
              <span className="text-matrix-500">{recentStats.kd.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-terminal-muted">WPR:</span>
              <span className="text-cyber-500">{Math.round(recentStats.wpr)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-matrix-500" />
              <CardTitle className="text-sm font-mono uppercase">Account Info</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 font-mono text-sm">
            <div className="flex justify-between">
              <span className="text-terminal-muted">Joined:</span>
              <span className="text-matrix-500">
                {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </div>
            {user.lastLogin && (
              <div className="flex justify-between">
                <span className="text-terminal-muted">Last Login:</span>
                <span className="text-cyber-500">
                  {new Date(user.lastLogin).toLocaleDateString()}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-terminal-muted">Status:</span>
              <span className={user.isCalibrating ? "text-yellow-500" : "text-green-500"}>
                {user.isCalibrating ? "Calibrating" : "Ranked"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-matrix-500" />
              <CardTitle className="text-sm font-mono uppercase">Role & Permissions</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 font-mono text-sm">
            <div className="flex justify-between">
              <span className="text-terminal-muted">Role:</span>
              <span className="text-matrix-500 uppercase">{user.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-terminal-muted">Whitelisted:</span>
              <span className="text-green-500">Yes</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Match History */}
      <motion.div variants={itemVariants} className="mt-8">
        <Card className="border-terminal-border bg-white/80 dark:bg-terminal-panel">
          <CardHeader>
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-matrix-500">
                  <Swords className="h-5 w-5" />
                  Match History
                </CardTitle>
                <CardDescription className="font-mono">
                  {totalMatches === 0
                    ? `No matches recorded for ${user.username}`
                    : isShowingAllMatches
                      ? `Showing all ${totalMatches} matches`
                      : `Showing latest ${showingMatches} of ${totalMatches} matches`}
                </CardDescription>
              </div>
              {isShowingAllMatches ? (
                <span className="font-mono text-xs text-terminal-muted">
                  Displaying full history
                </span>
              ) : canViewAll && onViewAllMatches ? (
                <Button variant="outline" size="sm" onClick={onViewAllMatches}>
                  View All
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {!matchHistory || matchHistory.length === 0 ? (
              <div className="py-10 text-center font-mono text-sm text-terminal-muted">
                No matches recorded yet.
              </div>
            ) : (
              <div className="space-y-4">
                {matchHistory.map((match) => {
                  const matchDate = new Date(match.createdAt)
                  const eloChange = match.eloChange ?? 0
                  const eloClass =
                    eloChange > 0
                      ? "text-green-500"
                      : eloChange < 0
                      ? "text-red-500"
                      : "text-terminal-muted"
                  return (
                    <div
                      key={match.id}
                      className="rounded-lg border border-terminal-border bg-terminal-panel/40 p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="font-mono text-sm text-matrix-500">
                            {match.seriesType} • {matchDate.toLocaleDateString()} •{" "}
                            {matchDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                          <p className="font-mono text-xs text-terminal-muted">
                            {match.userTeamName} vs {match.opponentTeamName}
                          </p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`font-mono text-sm font-semibold ${getResultColor(match.result)}`}
                          >
                            {match.result}
                          </span>
                          <p className="font-mono text-lg text-gray-900 dark:text-white">
                            {match.score.user} - {match.score.opponent}
                          </p>
                          {match.newElo !== null && (
                            <p className="font-mono text-xs text-terminal-muted">
                              {match.newElo} Elo
                            </p>
                          )}
                          {match.eloChange !== null && (
                            <p className={`font-mono text-xs ${eloClass}`}>
                              {eloChange > 0 ? "+" : ""}{eloChange} Elo
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs text-terminal-muted">
                        <span>
                          K/D/A:{" "}
                          <span className="text-gray-900 dark:text-white">
                            {match.userStats.kills}/{match.userStats.deaths}/{match.userStats.assists}
                          </span>
                        </span>
                        <span>
                          ACS:{" "}
                          <span className="text-gray-900 dark:text-white">
                            {Math.round(match.userStats.acs)}
                          </span>
                        </span>
                        <span>
                          ADR:{" "}
                          <span className="text-gray-900 dark:text-white">
                            {Math.round(match.userStats.adr)}
                          </span>
                        </span>
                        <span>
                          KAST:{" "}
                          <span className="text-gray-900 dark:text-white">
                            {Math.round(match.userStats.kast ?? 0)}%
                          </span>
                        </span>
                        <span>
                          HS%:{" "}
                          <span className="text-gray-900 dark:text-white">
                            {Math.round(match.userStats.headshotPercent ?? 0)}%
                          </span>
                        </span>
                        <span>
                          First Kills:{" "}
                          <span className="text-gray-900 dark:text-white">
                            {match.userStats.firstKills ?? 0}
                          </span>
                        </span>
                        <span>
                          Rating 2.0:{" "}
                          <span className="text-gray-900 dark:text-white">
                            {formatRating(match.userStats.rating20)}
                          </span>
                        </span>
                        <span>
                          Dmg Δ:{" "}
                          <span className="text-gray-900 dark:text-white">
                            {match.userStats.damageDelta ?? 0}
                          </span>
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}

function SummaryMetric({
  label,
  value,
  description,
  accent,
}: {
  label: string
  value: string | number
  description?: string
  accent?: string
}) {
  return (
    <div className="space-y-1 rounded border border-terminal-border bg-terminal-panel/40 p-3">
      <p className="text-xs font-mono uppercase text-terminal-muted">{label}</p>
      <p className={`font-mono text-2xl font-bold text-gray-900 dark:text-white ${accent ?? ""}`}>
        {value}
      </p>
      {description && (
        <p className="text-[11px] font-mono text-terminal-muted leading-tight">{description}</p>
      )}
    </div>
  )
}

function DetailMetric({
  label,
  value,
  helper,
}: {
  label: string
  value: string | number
  helper?: string
}) {
  return (
    <div className="rounded border border-terminal-border/60 bg-terminal-panel/40 p-4">
      <p className="text-xs font-mono uppercase text-terminal-muted">{label}</p>
      <p className="mt-1 font-mono text-xl font-bold text-gray-900 dark:text-white">{value}</p>
      {helper && (
        <p className="mt-1 text-[11px] font-mono text-terminal-muted leading-tight">{helper}</p>
      )}
    </div>
  )
}


