"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { X, Play, Users, Trophy, TrendingUp, Clock, Gamepad2 } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [, setLoading] = useState(true);
  const [queueStatus, setQueueStatus] = useState<{
    isOpen: boolean;
    game: "valorant" | "cs2" | null;
    playersInQueue: number;
    nextWindow?: { countdown: number; time: string };
  } | null>(null);

  // Initialize from localStorage directly to avoid setState in effect
  const [dismissedBanner, setDismissedBanner] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("registration-banner-dismissed") === "true";
    }
    return false;
  });

  const fetchQueueStatus = useCallback(async () => {
    try {
      // TODO: Replace with actual API endpoint
      // const data = await apiGet("/queue/status/global");
      // setQueueStatus(data);
      
      // Temporary mock data
      setQueueStatus({
        isOpen: false,
        game: null,
        playersInQueue: 0,
        nextWindow: {
          countdown: 172800, // 2 days
          time: "20:00",
        },
      });
    } catch (error) {
      console.error("Failed to fetch queue status:", error);
    }
  }, []);

  useEffect(() => {
    setLoading(status === "loading");
  }, [status]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchQueueStatus();
      const interval = setInterval(fetchQueueStatus, 10000); // Poll every 10 seconds
      return () => clearInterval(interval);
    }
  }, [status, fetchQueueStatus]);

  // Show toast notification when account is linked via social sign-in
  useEffect(() => {
    const linked = searchParams?.get("linked");
    if (linked === "google" || linked === "discord") {
      const providerName = linked === "google" ? "Google" : "Discord";
      toast.success(`Account linked successfully!`, {
        description: `Your ${providerName} account has been successfully linked to your account.`,
      });
      // Clean up URL by removing the query parameter
      router.replace("/", { scroll: false });
    }
  }, [searchParams, router]);

  const handleDismissBanner = () => {
    setDismissedBanner(true);
    localStorage.setItem("registration-banner-dismissed", "true");
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <Skeleton className="h-12 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const isGuest = !session?.user;

  return (
    <div className="min-h-screen bg-background">
      {/* Dismissible Registration Banner for Guests */}
      {isGuest && !dismissedBanner && (
        <div className="border-b bg-muted/50">
          <div className="container mx-auto px-4 py-3">
            <Alert className="relative border-0 bg-transparent p-0">
              <AlertTitle className="text-sm font-semibold">
                Recommended: Create an account
              </AlertTitle>
              <AlertDescription className="mt-1 text-sm">
                Register to follow teams, get match notifications, and access
                exclusive features.
              </AlertDescription>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 h-6 w-6"
                onClick={handleDismissBanner}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Dismiss</span>
              </Button>
              <div className="mt-3 flex gap-2">
                <Button asChild size="sm">
                  <Link href="/login?tab=register">Sign Up</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/login">Log In</Link>
                </Button>
              </div>
            </Alert>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            Welcome to TRAYB
          </h1>
          <p className="text-muted-foreground text-lg">
            Watch competitive matches, follow your favorite teams, and compete
            in tournaments.
          </p>
        </section>

        {/* Queue Status Banner */}
        {status === "authenticated" && queueStatus && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-6"
          >
            <Alert
              className={`border-2 ${
                queueStatus.isOpen
                  ? "border-green-500 bg-green-50 dark:bg-green-950"
                  : "border-blue-500 bg-blue-50 dark:bg-blue-950"
              }`}
            >
              <Gamepad2
                className={`h-4 w-4 ${
                  queueStatus.isOpen
                    ? "text-green-600 dark:text-green-400"
                    : "text-blue-600 dark:text-blue-400"
                }`}
              />
              <AlertTitle
                className={
                  queueStatus.isOpen
                    ? "text-green-900 dark:text-green-100"
                    : "text-blue-900 dark:text-blue-100"
                }
              >
                {queueStatus.isOpen
                  ? "Trayb Series Queue is Open!"
                  : "Trayb Series Queue"}
              </AlertTitle>
              <AlertDescription
                className={
                  queueStatus.isOpen
                    ? "text-green-800 dark:text-green-200"
                    : "text-blue-800 dark:text-blue-200"
                }
              >
                <div className="flex items-center justify-between mt-2">
                  <span>
                    {queueStatus.isOpen
                      ? `${queueStatus.playersInQueue} players in queue`
                      : `Next window: ${queueStatus.nextWindow?.time || "TBA"}`}
                  </span>
                  <Button size="sm" asChild>
                    <Link href="/queue">
                      {queueStatus.isOpen ? "Join Queue" : "View Schedule"}
                    </Link>
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Live Matches
              </CardTitle>
              <Play className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">
                Currently streaming
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Teams
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">247</div>
              <p className="text-xs text-muted-foreground">Registered teams</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tournaments</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-muted-foreground">Ongoing events</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Viewers</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1.2K</div>
              <p className="text-xs text-muted-foreground">Watching now</p>
            </CardContent>
          </Card>
        </div>

        {/* Featured Matches */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Featured Matches</h2>
            <Button variant="outline" asChild>
              <Link href="/matches">View All</Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((match) => (
              <Card
                key={match}
                className="hover:shadow-lg transition-shadow cursor-pointer"
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Team Alpha vs Team Beta
                    </CardTitle>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Live
                    </span>
                  </div>
                  <CardDescription>Series • Unranked</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Score: 2 - 1</p>
                      <p className="text-xs text-muted-foreground">Best of 5</p>
                    </div>
                    <Button size="sm" asChild>
                      <Link href={`/match/${match}`}>Watch</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Upcoming Tournaments */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Upcoming Tournaments</h2>
            <Button variant="outline" asChild>
              <Link href="/tournaments">View All</Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((tournament) => (
              <Card
                key={tournament}
                className="hover:shadow-lg transition-shadow cursor-pointer"
              >
                <CardHeader>
                  <CardTitle className="text-xl">
                    Championship Series Week 1
                  </CardTitle>
                  <CardDescription>Starts in 2 days • 16 teams</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Prize Pool: $10,000</p>
                      <p className="text-xs text-muted-foreground">
                        Registration open
                      </p>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/tournament/${tournament}`}>
                        {isGuest ? "View Details" : "Register"}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
