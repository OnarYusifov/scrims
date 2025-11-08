"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { fetchProfileByDiscordId, ProfileData } from "@/lib/api"
import { UserProfileView } from "@/components/profile/user-profile-view"

export default function UserProfileByDiscordIdPage() {
  const params = useParams<{ discordId: string }>()
  const router = useRouter()
  const { user: currentUser, isAuthenticated, isLoading: authLoading } = useAuth()
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFullHistory, setIsFullHistory] = useState(false)

  const discordId = params?.discordId

  useEffect(() => {
    setIsFullHistory(false)
  }, [discordId])

  const loadProfile = useCallback(
    async (fullHistory = false) => {
      if (!discordId) return
      try {
        setIsLoading(true)
        setError(null)
        const data = await fetchProfileByDiscordId(
          discordId,
          fullHistory ? { fullHistory: true } : undefined
        )
        if (!data) {
          setError("Profile not found")
          setProfileData(null)
        } else {
          setProfileData(data)
        }
      } catch (err) {
        console.error("Failed to load profile:", err)
        setError(err instanceof Error ? err.message : "Failed to load profile")
      } finally {
        setIsLoading(false)
      }
    },
    [discordId]
  )

  useEffect(() => {
    if (authLoading) {
      return
    }

    if (!isAuthenticated) {
      router.push("/login")
      return
    }

    if (!discordId) {
      setError("Invalid profile ID")
      setIsLoading(false)
      return
    }

    // Redirect to own profile route for consistency
    if (currentUser?.discordId === discordId) {
      router.replace("/profile")
      return
    }

    loadProfile(isFullHistory)
  }, [authLoading, isAuthenticated, discordId, router, currentUser, loadProfile, isFullHistory])

  if (authLoading || isLoading) {
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

  if (!isAuthenticated) {
    return null
  }

  if (error || !profileData) {
    return (
      <div className="container relative py-10">
        <Card className="border-terminal-border bg-white/80 dark:bg-terminal-panel">
          <CardHeader className="space-y-3">
            <CardTitle className="font-mono text-lg text-gray-900 dark:text-matrix-500">
              PROFILE NOT AVAILABLE
            </CardTitle>
            <CardDescription className="font-mono text-sm text-terminal-muted">
              {error || "The requested player profile could not be found or is no longer accessible."}
            </CardDescription>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="font-mono">
                <Link href="/leaderboard">Back to Leaderboard</Link>
              </Button>
              <Button asChild variant="terminal" className="font-mono">
                <Link href="/matches">Browse Matches</Link>
              </Button>
            </div>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const canViewAllMatches =
    !isFullHistory &&
    !!profileData &&
    profileData.matchHistoryCount > profileData.matchHistory.length

  const handleViewAllMatches = () => {
    if (canViewAllMatches) {
      setIsFullHistory(true)
    }
  }

  return (
    <UserProfileView
      profile={profileData}
      onViewAllMatches={canViewAllMatches ? handleViewAllMatches : undefined}
      canViewAll={canViewAllMatches}
      isViewingAll={isFullHistory}
    />
  )
}


