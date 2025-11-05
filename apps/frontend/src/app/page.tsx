"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { 
  Swords, 
  BarChart3, 
  Trophy, 
  Target, 
  Zap, 
  Shield 
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

const features = [
  {
    icon: Swords,
    title: "Custom 5v5 Matches",
    description: "Create and join custom Valorant games with advanced pick/ban system and team balancing.",
  },
  {
    icon: BarChart3,
    title: "Deep Statistics",
    description: "Track ACS, K/D, ADR, KAST, HS%, first kills, clutches, and more. Every stat that matters.",
  },
  {
    icon: Trophy,
    title: "Competitive Elo",
    description: "Climb the ranks with our Elo-based ranking system. From Bronze to Godlike.",
  },
  {
    icon: Target,
    title: "WPR System",
    description: "Weighted Performance Rating evaluates your true impact beyond just kills.",
  },
  {
    icon: Zap,
    title: "Real-time Updates",
    description: "Live match tracking, instant stat updates, and real-time leaderboard changes.",
  },
  {
    icon: Shield,
    title: "Whitelist Only",
    description: "Exclusive access for crew members. Quality > quantity. Discord OAuth integration.",
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
    },
  },
}

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // If authenticated, redirect to dashboard
    if (!isLoading && isAuthenticated) {
      router.push("/dashboard")
    }
  }, [isAuthenticated, isLoading, router])

  // Show loading state while checking auth
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
              CHECKING_AUTH<span className="animate-terminal-blink">_</span>
            </p>
          </motion.div>
        </div>
      </div>
    )
  }

  // If authenticated, don't show homepage (redirect will happen)
  if (isAuthenticated) {
    return null
  }

  return (
    <div className="container relative py-10">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-auto flex max-w-[980px] flex-col items-center gap-4 py-8 md:py-12 md:pb-8 lg:py-24 lg:pb-20"
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="rounded-lg border-2 border-matrix-500 px-4 py-1.5 text-sm font-medium shadow-neon-green"
          >
            <span className="text-matrix-400">SYSTEM_STATUS:</span>{" "}
            <span className="text-matrix-500 font-bold animate-terminal-blink">ONLINE</span>
          </motion.div>

          <h1 className="text-3xl font-bold leading-tight tracking-tighter md:text-5xl lg:text-6xl lg:leading-[1.1]">
            <span className="text-matrix-500 neon-text">TRAYB</span>{" "}
            <span className="text-cyber-500 neon-text">CUSTOMS</span>
          </h1>

          <p className="max-w-[750px] text-lg text-terminal-muted sm:text-xl">
            Elite Valorant customs platform. Terminal-grade stats tracking.
            <br />
            <span className="text-matrix-500">Matrix-themed. Discord-integrated. Crew only.</span>
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex w-full items-center justify-center gap-4 py-4"
        >
          <Button asChild size="lg">
            <Link href="/login">
              <Zap className="mr-2 h-4 w-4" />
              INITIALIZE ACCESS
            </Link>
          </Button>

          <Button asChild variant="outline" size="lg">
            <Link href="/leaderboard">
              <Trophy className="mr-2 h-4 w-4" />
              VIEW LEADERBOARD
            </Link>
          </Button>
        </motion.div>
      </motion.div>

      {/* Features Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mx-auto grid max-w-[980px] gap-4 md:grid-cols-2 lg:grid-cols-3"
      >
        {features.map((feature, index) => (
          <motion.div key={index} variants={itemVariants}>
            <Card className="h-full hover:border-matrix-500 transition-all duration-300">
              <CardHeader>
                <feature.icon className="h-10 w-10 text-matrix-500 mb-2" />
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Stats Preview */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mx-auto mt-16 max-w-[980px]"
      >
        <Card className="border-cyber-500 shadow-neon-cyan">
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              <Target className="inline-block mr-2 h-6 w-6" />
              SYSTEM METRICS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="flex flex-col items-center gap-1">
                <span className="text-3xl font-bold text-matrix-500">0</span>
                <span className="text-sm text-terminal-muted uppercase">Total Matches</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-3xl font-bold text-matrix-500">0</span>
                <span className="text-sm text-terminal-muted uppercase">Active Players</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-3xl font-bold text-cyber-500">0</span>
                <span className="text-sm text-terminal-muted uppercase">Kills Tracked</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-3xl font-bold text-cyber-500">∞</span>
                <span className="text-sm text-terminal-muted uppercase">Uptime</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Terminal Footer Message */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mx-auto mt-8 max-w-[600px] text-center text-sm text-terminal-muted"
      >
        <p className="font-mono">
          <span className="text-matrix-500">&gt;</span> System initialized. Discord authentication required.
          <br />
          <span className="text-matrix-500">&gt;</span> Whitelist status: Enforced.
          <br />
          <span className="text-matrix-500">&gt;</span> Welcome to the Matrix.
          <span className="animate-terminal-blink ml-1">_</span>
        </p>
      </motion.div>
    </div>
  )
}

