"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/hooks/use-auth"
import { fetchProfile, ProfileData } from "@/lib/api"
import { RadarChart } from "@/components/profile/radar-chart"
import { EloChart } from "@/components/profile/elo-chart"
import { RankBadge } from "@/components/profile/rank-badge"
import { MomentTags } from "@/components/profile/moment-tags"
import {
  Trophy,
  Target,
  TrendingUp,
  Activity,
  Zap,
  Shield,
  Clock,
  BarChart3,
  Swords,
} from "lucide-react"
import { useRouter } from "next/navigation"

export default function ProfilePage() {
  const { user: currentUser, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Wait for auth to finish loading before checking
    if (authLoading) {
      return // Still loading auth
    }

    // If auth finished loading and user is null, redirect to login
    if (!isAuthenticated || !currentUser) {
      router.push("/login")
      return
    }

    // User is authenticated, load profile
    async function loadProfile() {
      try {
        setIsLoading(true)
        const data = await fetchProfile()
        setProfileData(data)
      } catch (err) {
        console.error("Failed to load profile:", err)
        setError(err instanceof Error ? err.message : "Failed to load profile")
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [isAuthenticated, authLoading, currentUser, router])

  // Show loading state while auth is being checked
  if (authLoading) {
    return (
      <div className="container relative py-10">
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <div className="h-12 w-12 border-2 border-matrix-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-lg font-mono text-matrix-500">
              CHECKING_AUTH<span className="animate-terminal-blink">_</span>
            </p>
          </motion.div>
        </div>
      </div>
    )
  }

  // Redirect if not authenticated (handled by useEffect, but show loading during redirect)
  if (!isAuthenticated || !currentUser) {
    return null
  }

  if (isLoading) {
    return (
      <div className="container relative py-10">
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <div className="h-12 w-12 border-2 border-matrix-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-lg font-mono text-matrix-500">
              LOADING_PROFILE<span className="animate-terminal-blink">_</span>
            </p>
          </motion.div>
        </div>
      </div>
    )
  }

  if (error || !profileData) {
    return (
      <div className="container relative py-10">
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="text-red-500">ERROR</CardTitle>
            <CardDescription>{error || "Failed to load profile data"}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const user = profileData.user
  const eloHistory = profileData.eloHistory
  const recentStats = profileData.recentStats
  const previousElo = eloHistory.length > 1 ? eloHistory[eloHistory.length - 2].newElo : undefined

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
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-bold font-mono uppercase text-matrix-500 neon-text">
                      {user.username}
                    </h1>
                    <p className="text-terminal-muted font-mono text-sm mt-1">
                      {user.role} • {user.matchesPlayed} matches played
                    </p>
                  </div>
                  <RankBadge elo={user.elo} previousElo={previousElo} isCalibrating={user.isCalibrating} />
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

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {/* Radar Chart */}
        <motion.div variants={itemVariants}>
          <Card className="border-cyber-500 shadow-neon-cyan h-full">
            <CardHeader>
              <CardTitle className="text-cyber-500 neon-text-cyan flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                PERFORMANCE RADAR
              </CardTitle>
              <CardDescription className="font-mono">
                Core stats from last 10 matches
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadarChart stats={recentStats} />
            </CardContent>
          </Card>
        </motion.div>

        {/* Elo History */}
        <motion.div variants={itemVariants}>
          <Card className="border-matrix-500 shadow-neon-green h-full">
            <CardHeader>
              <CardTitle className="text-matrix-500 neon-text flex items-center gap-2">
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
            <div className="flex justify-between">
              <span className="text-terminal-muted">Last Login:</span>
              <span className="text-cyber-500">
                {user.lastLogin
                  ? new Date(user.lastLogin).toLocaleDateString()
                  : "Never"}
              </span>
            </div>
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
    </motion.div>
  )
}
