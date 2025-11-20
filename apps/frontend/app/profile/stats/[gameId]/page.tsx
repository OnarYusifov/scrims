"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const conceptGames = {
  "counter-strike-2": {
    name: "Counter-Strike 2",
    provider: "Valve",
    genre: "Tactical Shooter",
    platform: "PC • Steam",
    releaseInfo: "Live since Sep 2023",
    summary:
      "Monitor your Premier climb, FACEIT-ready stats, and match history directly inside TRAYB.",
    coverImage: "/games/counter-strike-2-285x380.jpg",
    leaderboardPlacement: "", // No rank for new players
    eloRating: 800, // Default ELO for new players
    eloDelta: 0, // No change initially
    winRate: "0%", // No wins yet
    crownTier: "", // No rank/tier
    lastSync: "Not synced", // Not synced yet
    followers: 0,
    subscriptions: 0,
    friendsOnline: 0,
    currentForm: [] as Array<"W" | "L">, // Empty form array
    overviewStats: [
      { label: "Premier Rank", value: "—", description: "No rank yet" },
      { label: "Matches (30d)", value: "0", description: "0W / 0L" },
      { label: "Headshot %", value: "0%", description: "No matches played" },
    ],
    statsBreakdown: [
      { label: "Average KD", value: "0.00" },
      { label: "Utility Damage", value: "0" },
      { label: "Clutch Success", value: "0%" },
      { label: "Entry Success", value: "0%" },
    ],
  },
  valorant: {
    name: "Valorant",
    provider: "Riot Games",
    genre: "Hero Shooter",
    platform: "PC • Riot Client",
    releaseInfo: "Live since Jun 2020",
    summary:
      "Valorant metrics mirror FACEIT dashboards: detailed streaks, map stats, and party insights.",
    coverImage: "/games/valorant-285x380.jpg",
    leaderboardPlacement: "", // No rank for new players
    eloRating: 800, // Default ELO for new players
    eloDelta: 0, // No change initially
    winRate: "0%", // No wins yet
    crownTier: "", // No rank/tier
    lastSync: "Not synced", // Not synced yet
    followers: 0,
    subscriptions: 0,
    friendsOnline: 0,
    currentForm: [] as Array<"W" | "L">, // Empty form array
    overviewStats: [
      { label: "Competitive Rank", value: "—", description: "No rank yet" },
      { label: "Matches (30d)", value: "0", description: "0W / 0L" },
      { label: "First Blood Rate", value: "0%", description: "No matches played" },
    ],
    statsBreakdown: [
      { label: "Average Combat Score", value: "0" },
      { label: "Econ Rating", value: "0" },
      { label: "Clutch Success", value: "0%" },
      { label: "Ability Damage", value: "0" },
    ],
  },
} satisfies Record<
  string,
  {
    name: string;
    provider: string;
    genre: string;
    platform: string;
    releaseInfo: string;
    summary: string;
    coverImage: string;
    leaderboardPlacement: string;
    eloRating: number;
    eloDelta: number;
    winRate: string;
    crownTier: string;
    lastSync: string;
    followers: number;
    subscriptions: number;
    friendsOnline: number;
    currentForm: Array<"W" | "L">;
    overviewStats: Array<{ label: string; value: string; description: string }>;
    statsBreakdown: Array<{ label: string; value: string }>;
  }
>;

// Map game IDs to their data, including aliases
const gameIdMap: Record<string, keyof typeof conceptGames> = {
  cs2: "counter-strike-2",
};

const normalizeSlug = (slug: string) => decodeURIComponent(slug).trim().toLowerCase();

const isConceptGameSlug = (slug: string): slug is keyof typeof conceptGames =>
  Object.prototype.hasOwnProperty.call(conceptGames, slug);

const resolveConceptGame = (slug: string) => {
  const normalizedSlug = normalizeSlug(slug);
  const canonicalSlug = gameIdMap[normalizedSlug] ?? normalizedSlug;
  return isConceptGameSlug(canonicalSlug) ? conceptGames[canonicalSlug] : null;
};

const formatNumber = (value: number) => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
};

const FormChips = ({ form }: { form: Array<"W" | "L"> }) => (
  <div className="flex gap-1.5">
    {form.map((entry, index) => (
      <span
        key={`${entry}-${index}`}
        className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-semibold ${
          entry === "W" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
        }`}
      >
        {entry}
      </span>
    ))}
  </div>
);

export default function ProfileGameStatsPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  type User = {
    id: string;
    username: string | null;
    email: string;
    role: string | null;
    createdAt: string;
  } | null;
  const [user, setUser] = useState<User>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [textColor, setTextColor] = useState<"light" | "dark">("light");
  const bannerImageRef = useRef<HTMLDivElement>(null);
  
  // Badges for user - will be fetched from API later
  const [badges, setBadges] = useState<Array<{
    id: string;
    label: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
    icon?: React.ReactNode;
  }>>([]);

  // All hooks must be called before any conditional returns
  useEffect(() => {
    const fetchUser = async () => {
      try {
        // Disable browser caching - always fetch fresh session
        const response = await fetch("/api/auth/me", {
          cache: 'no-store',
          credentials: 'include',
        });
        const data = await response.json();

        if (response.ok && data.authenticated) {
          setUser(data.user);
          setAuthenticated(true);
          
          // Fetch badges from API
          try {
            const badgesResponse = await fetch(`/api/user/badges?userId=${data.user.id}`);
            if (badgesResponse.ok) {
              const badgesData = await badgesResponse.json();
              setBadges(badgesData.badges || []);
            }
          } catch (error) {
            console.error("Failed to fetch badges:", error);
          }
        } else {
          router.push("/login");
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  const getInitials = (username: string) => {
    return username
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatMemberSince = (createdAt: string) => {
    const date = new Date(createdAt);
    return date.toLocaleDateString("en-US", { 
      year: "numeric", 
      month: "long" 
    });
  };

  const handleShareProfile = async () => {
    if (!user) return;
    
    const profileUrl = `${window.location.origin}/profile`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${user.username}'s Profile`,
          text: `Check out ${user.username}'s profile on Trayb`,
          url: profileUrl,
        });
      } else {
        await navigator.clipboard.writeText(profileUrl);
        toast.success("Profile link copied to clipboard!");
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        try {
          await navigator.clipboard.writeText(profileUrl);
          toast.success("Profile link copied to clipboard!");
        } catch (clipboardError) {
          console.error("Failed to copy to clipboard:", clipboardError);
          toast.error("Failed to copy profile link");
        }
      }
    }
  };

  const getBannerImage = (username: string) => {
    if (username.toLowerCase() === "yunar") {
      return "/banners/wallhaven-6dqjml.png";
    }
    return null;
  };

  // Detect if background is light or dark to determine text color
  useEffect(() => {
    if (!user?.username) {
      setTextColor("light");
      return;
    }

    const currentBannerImage = getBannerImage(user.username);
    if (!currentBannerImage) {
      setTextColor("light");
      return;
    }

    const detectTextColor = () => {
      if (!bannerImageRef.current) return;

      const img = bannerImageRef.current.querySelector("img") as HTMLImageElement;
      if (!img) return;

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      if (!ctx) return;

      canvas.width = Math.min(img.naturalWidth || 200, 200);
      canvas.height = Math.min(img.naturalHeight || 200, 200);
      
      try {
        ctx.drawImage(
          img,
          0,
          (img.naturalHeight || 0) * 0.4,
          canvas.width,
          canvas.height,
          0,
          0,
          canvas.width,
          canvas.height
        );

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        let totalBrightness = 0;
        let pixelCount = 0;

        for (let i = 0; i < data.length; i += 16) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (r !== undefined && g !== undefined && b !== undefined) {
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            totalBrightness += brightness;
            pixelCount++;
          }
        }

        const averageBrightness = totalBrightness / pixelCount;
        setTextColor(averageBrightness > 128 ? "dark" : "light");
      } catch (error) {
        console.error("Error detecting text color:", error);
        setTextColor("light");
      }
    };

    const img = bannerImageRef.current?.querySelector("img") as HTMLImageElement;
    if (img) {
      if (img.complete) {
        detectTextColor();
      } else {
        img.addEventListener("load", detectTextColor);
        return () => img.removeEventListener("load", detectTextColor);
      }
    }
  }, [user?.username, authenticated]);

  // Check game after all hooks are called
  const game = resolveConceptGame(resolvedParams.gameId);
  if (!game) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Game not found</h1>
          <Link href="/profile" className="text-primary hover:underline">
            ← Back to profile
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="relative w-full aspect-[8/3] max-h-[50vh] bg-gradient-to-br from-muted to-muted/50 flex items-center px-8">
          <Skeleton className="h-32 w-32 rounded-full border-4 border-background z-10" />
          <Skeleton className="ml-6 h-8 w-48" />
        </div>
      </div>
    );
  }

  if (!authenticated || !user) {
    return null;
  }

  const bannerImage = getBannerImage(user.username || "");

  return (
    <div className="min-h-screen bg-background">
      {/* Banner Section - Same as profile page */}
      <div className="relative w-full aspect-[8/3] max-h-[50vh] bg-gradient-to-br from-primary/20 via-primary/10 to-muted">
        <div className="absolute inset-0 overflow-hidden">
          {bannerImage ? (
            <>
              <div ref={bannerImageRef} className="absolute inset-0">
                <Image
                  src={bannerImage}
                  alt={`${user.username}'s banner`}
                  fill
                  className="object-cover"
                  priority
                  quality={90}
                />
              </div>
              <div className={`absolute inset-0 ${
                textColor === "light" 
                  ? "bg-gradient-to-t from-black/30 via-black/10 to-transparent" 
                  : "bg-gradient-to-t from-white/20 via-white/5 to-transparent"
              }`} />
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/20 to-transparent" />
            </>
          )}
        </div>
        
        <div className="relative h-full flex items-center px-4 sm:px-6 md:px-8 z-10">
          <Avatar className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 lg:h-32 lg:w-32 border-2 sm:border-[3px] md:border-4 border-background shadow-lg relative z-10 flex-shrink-0">
            <AvatarImage src={undefined} alt={user.username || ""} />
            <AvatarFallback className="text-lg sm:text-xl md:text-2xl lg:text-3xl bg-primary text-primary-foreground relative z-10">
              {getInitials(user.username || "")}
            </AvatarFallback>
          </Avatar>
          <div className="ml-3 sm:ml-4 md:ml-6 flex flex-col space-y-1 sm:space-y-2 relative z-10 min-w-0 flex-1">
            {badges.length > 0 && (
              <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center mb-1">
                {badges.slice(0, 3).map((badge, index) => {
                  if (index === 0) {
                    return (
                      <Badge
                        key={badge.id}
                        variant="outline"
                        className={`
                          text-xs sm:text-sm
                          px-2.5 py-1 sm:px-3 sm:py-1.5
                          font-semibold
                          bg-transparent
                          border-2
                          ${textColor === "light" 
                            ? "text-white border-white/60" 
                            : "text-black border-black/60"}
                          backdrop-blur-sm
                          shadow-lg
                        `}
                      >
                        {badge.icon && <span className="text-sm mr-1">{badge.icon}</span>}
                        {badge.label}
                      </Badge>
                    );
                  }
                  
                  if (index === 1) {
                    return (
                      <Badge
                        key={badge.id}
                        variant="outline"
                        className={`
                          text-xs sm:text-sm
                          px-2.5 py-1 sm:px-3 sm:py-1.5
                          font-semibold
                          bg-secondary
                          text-secondary-foreground
                          border-transparent
                          backdrop-blur-sm
                          shadow-lg
                        `}
                      >
                        {badge.icon && <span className="text-sm mr-1">{badge.icon}</span>}
                        {badge.label}
                      </Badge>
                    );
                  }
                  
                  return (
                    <Badge
                      key={badge.id}
                      variant="outline"
                      className={`
                        text-xs sm:text-sm
                        px-2.5 py-1 sm:px-3 sm:py-1.5
                        font-semibold
                        ${textColor === "light" 
                          ? "bg-white/95 text-black border-white/60" 
                          : "bg-black/90 text-white border-black/60"}
                        backdrop-blur-sm
                        shadow-lg
                      `}
                    >
                      {badge.icon && <span className="text-sm mr-1">{badge.icon}</span>}
                      {badge.label}
                    </Badge>
                  );
                })}
              </div>
            )}
            <h1 
              className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight drop-shadow-lg truncate ${
                textColor === "light" ? "text-white" : "text-black"
              }`}
            >
              {user.username}
            </h1>
            {user.createdAt && (
              <p 
                className={`text-xs sm:text-sm drop-shadow-md ${
                  textColor === "light" ? "text-white/90" : "text-black/80"
                }`}
              >
                Member since {formatMemberSince(user.createdAt)}
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleShareProfile}
              className={`w-fit text-xs sm:text-sm backdrop-blur-sm transition-all ${
                textColor === "light" 
                  ? "bg-black/60 text-white border-white/30 hover:bg-black/70 hover:border-white/50 hover:text-white hover:ring-2 hover:ring-white/20" 
                  : "bg-white/80 text-black border-black/30 hover:bg-white/90 hover:border-black/50 hover:text-black hover:ring-2 hover:ring-black/20"
              }`}
            >
              <Share2 className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Share Profile</span>
              <span className="sm:hidden">Share</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Game Stats Section - Below Banner */}
      <div className="mx-auto px-4 sm:px-6 md:px-8 py-6">

        <section className="relative rounded-3xl border border-white/10 bg-black/80 backdrop-blur-sm shadow-2xl">
          {(resolvedParams.gameId === "cs2" || resolvedParams.gameId === "counter-strike-2") && (
            <Image
              src="/logos/cs2-logo.png"
              alt="Counter-Strike 2 logo"
              width={36}
              height={36}
              className="absolute h-7 w-7 lg:h-9 lg:w-9 rounded-[2px] object-contain z-10"
              style={{ 
                top: '2rem', // Align with text line (p-8 = 2rem)
                right: '2rem' // Align with buttons (p-8 = 2rem)
              }}
              unoptimized
            />
          )}
          {(resolvedParams.gameId === "valorant") && (
            <Image
              src="/logos/valorant-logo.png"
              alt="Valorant logo"
              width={36}
              height={36}
              className="absolute h-7 w-7 lg:h-9 lg:w-9 rounded-[2px] object-contain z-10"
              style={{ 
                top: '2rem', // Align with text line (p-8 = 2rem)
                right: '2rem' // Align with buttons (p-8 = 2rem)
              }}
              unoptimized
            />
          )}
          <div className="flex flex-col gap-6 p-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-wide text-white/70">
                <span>{game.provider}</span>
                <span>•</span>
                <span>{game.genre}</span>
                <span>•</span>
                <span>{game.platform}</span>
                <span>•</span>
                <span>{game.releaseInfo}</span>
              </div>
              <div className="flex items-center gap-3 mb-3 sm:mb-4">
                <h1 className="text-4xl font-bold tracking-tight text-white lg:text-5xl">
                  {game.name}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-500/40">
                  Linked on TRAYB
                </Badge>
                {game.leaderboardPlacement && (
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                    {game.leaderboardPlacement}
                  </Badge>
                )}
                {game.crownTier && (
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                    {game.crownTier}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" className="bg-white/10 text-white hover:bg-white/20">
                Invite friends
              </Button>
              <Button className="bg-white text-black hover:bg-white/90">
                Launch on TRAYB
              </Button>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-lg">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full justify-start gap-1 overflow-x-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="statistics">Statistics</TabsTrigger>
              <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
              <TabsTrigger value="followers">Followers</TabsTrigger>
              <TabsTrigger value="friends">Friends</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="pt-6">
              <div className="grid gap-4 md:grid-cols-3">
                {game.overviewStats.map((stat: { label: string; value: string; description: string }) => (
                  <Card key={stat.label} className="border-border/50 bg-card dark:border-white/5 dark:bg-muted/20">
                    <CardHeader>
                      <CardTitle className="text-sm uppercase text-muted-foreground">
                        {stat.label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-semibold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <Card className="border-border/50 bg-card dark:border-white/5 dark:bg-muted/30">
                  <CardHeader>
                    <CardTitle className="text-sm uppercase text-muted-foreground">
                      Competitive snapshot
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-1">ELO</p>
                        <p className="text-lg font-semibold">
                          {game.eloRating.toLocaleString()}
                          {game.eloDelta !== 0 && (
                            <span
                              className={`ml-1 text-xs ${
                                game.eloDelta >= 0 ? "text-emerald-500" : "text-red-400"
                              }`}
                            >
                              {game.eloDelta >= 0 ? "+" : ""}
                              {game.eloDelta}
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Win rate</p>
                        <p className="text-lg font-semibold">{game.winRate}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Current form</p>
                        <FormChips form={game.currentForm} />
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Status</p>
                        <p className="text-lg font-semibold">{game.lastSync}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border/50 bg-card dark:border-white/5 dark:bg-muted/30">
                  <CardHeader>
                    <CardTitle className="text-sm uppercase text-muted-foreground">
                      Network
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">{formatNumber(game.followers)}</p>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Followers
                      </p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{game.subscriptions}</p>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Subscriptions
                      </p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{game.friendsOnline}</p>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Friends online
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="statistics" className="pt-6">
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                {game.statsBreakdown.map((stat: { label: string; value: string }) => (
                  <Card key={stat.label} className="border-border/50 bg-card dark:border-white/5 dark:bg-background/60">
                    <CardHeader>
                      <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
                        {stat.label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-semibold">{stat.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="mt-6 rounded-2xl border border-border/50 bg-muted/50 dark:border-white/5 dark:bg-background/40 p-6">
                <p className="text-sm uppercase tracking-wide text-muted-foreground mb-2">
                  Season insights
                </p>
                <p className="text-muted-foreground">
                  Detailed round-by-round data, map pool performance, and agent breakdowns will
                  appear here as soon as the TRAYB sync goes live.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="subscriptions" className="pt-6">
              <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-6">
                <h3 className="text-lg font-semibold">Premium match insights</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Unlock FACEIT-style match reviews, smoke lineups, and VOD bookmarks for every
                  session.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button>Subscribe for $4.99</Button>
                  <Button variant="outline">Share invite link</Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="followers" className="pt-6">
              <div className="rounded-2xl border border-border/50 bg-muted/50 dark:border-white/5 dark:bg-background/50 p-6">
                <p className="text-muted-foreground">
                  Followers from TRAYB and connected platforms will appear here once they opt into
                  visibility.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="friends" className="pt-6">
              <div className="rounded-2xl border border-border/50 bg-muted/50 dark:border-white/5 dark:bg-background/50 p-6">
                <p className="text-muted-foreground">
                  FACEIT-style party widgets and voice channel pins will appear once friends link
                  their accounts. Send invites from the overview tab.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </div>
  );
}


