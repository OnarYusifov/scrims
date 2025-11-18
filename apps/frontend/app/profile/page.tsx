"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
} from "@/components/animate-ui/components/radix/dialog";
import { XIcon } from "lucide-react";

export default function ProfilePage() {
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
  // Structure: { id: string, label: string, variant: "default" | "secondary" | "destructive" | "outline", icon?: ReactNode }
  const [badges, setBadges] = useState<Array<{
    id: string;
    label: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
    icon?: ReactNode;
  }>>([]);

  // Games for user - will be fetched from API later
  type ConnectedGame = {
    id: string;
    slug: string;
    name: string;
    provider: string;
    icon?: string;
    imageUrl?: string;
    imageWidth?: number;
    imageHeight?: number;
    leaderboardPlacement?: string;
    eloRating?: number;
    eloDelta?: number;
    currentForm?: Array<"W" | "L">;
    winRate?: string;
    crownTier?: string;
    lastSync?: string;
  };

  const [games, setGames] = useState<ConnectedGame[]>([]);
  type AvailableGame = {
    id: string;
    slug: string;
    name: string;
    description: string;
    provider: string;
    imageUrl: string;
    infoUrl: string;
    imageWidth: number;
    imageHeight: number;
    summary: string;
    genre: string;
    platform: string;
    releaseInfo: string;
    followers: number;
    subscriptions: number;
    friendsOnline: number;
    overviewStats: Array<{ label: string; value: string; description: string }>;
    statsBreakdown: Array<{ label: string; value: string }>;
    starterStats: {
      leaderboardPlacement: string;
      eloRating: number;
      eloDelta: number;
      currentForm: Array<"W" | "L">;
      winRate: string;
      crownTier: string;
      lastSync: string;
    };
  };
  const [showGameSelector, setShowGameSelector] = useState(false);
  const availableGames: AvailableGame[] = [
    {
      id: "counter-strike-2",
      slug: "counter-strike-2",
      name: "Counter-Strike 2",
      description: "Free-to-play tactical shooter developed by Valve on Source 2.",
      provider: "Valve",
      imageUrl: "/games/counter-strike-2-285x380.jpg",
      infoUrl: "https://en.wikipedia.org/wiki/Counter-Strike_2",
      imageWidth: 285,
      imageHeight: 380,
      summary:
        "Monitor your Premier climb, FACEIT-ready stats, and match history directly inside TRAYB.",
      genre: "Tactical Shooter",
      platform: "PC • Steam",
      releaseInfo: "Live since Sep 2023",
      followers: 12800,
      subscriptions: 42,
      friendsOnline: 12,
      overviewStats: [
        { label: "Premier Rank", value: "Diamond II", description: "Top 3% EU" },
        { label: "Matches (30d)", value: "54", description: "36W / 18L" },
        { label: "Headshot %", value: "51%", description: "Average this season" },
      ],
      statsBreakdown: [
        { label: "Average KD", value: "1.29" },
        { label: "Utility Damage", value: "79" },
        { label: "Clutch Success", value: "34%" },
        { label: "Entry Success", value: "57%" },
      ],
      starterStats: {
        leaderboardPlacement: "#112 EU Premier",
        eloRating: 2748,
        eloDelta: +36,
        currentForm: ["W", "W", "L", "W", "W"],
        winRate: "68%",
        crownTier: "Diamond II",
        lastSync: "Synced 2h ago",
      },
    },
    {
      id: "valorant",
      slug: "valorant",
      name: "Valorant",
      description: "Character-based 5v5 tactical shooter from Riot Games.",
      provider: "Riot Games",
      imageUrl: "/games/valorant-285x380.jpg",
      infoUrl: "https://en.wikipedia.org/wiki/Valorant",
      imageWidth: 285,
      imageHeight: 380,
      summary:
        "Valorant metrics mirror FACEIT dashboards: detailed streaks, map stats, and party insights.",
      genre: "Hero Shooter",
      platform: "PC • Riot Client",
      releaseInfo: "Live since Jun 2020",
      followers: 8200,
      subscriptions: 18,
      friendsOnline: 5,
      overviewStats: [
        { label: "Competitive Rank", value: "Immortal I", description: "Top 1% LATAM" },
        { label: "Matches (30d)", value: "38", description: "22W / 16L" },
        { label: "First Blood Rate", value: "44%", description: "Controller / Duelist hybrid" },
      ],
      statsBreakdown: [
        { label: "Average Combat Score", value: "261" },
        { label: "Econ Rating", value: "67" },
        { label: "Clutch Success", value: "28%" },
        { label: "Ability Damage", value: "54" },
      ],
      starterStats: {
        leaderboardPlacement: "#980 Global Competitive",
        eloRating: 2013,
        eloDelta: -12,
        currentForm: ["L", "W", "W", "W", "L"],
        winRate: "58%",
        crownTier: "Immortal I",
        lastSync: "Synced 47m ago",
      },
    },
  ];

  const sampleConnectedGameCards: ConnectedGame[] = availableGames.map((game) => ({
    id: `${game.id}-concept`,
    slug: game.slug,
    name: game.name,
    provider: game.provider,
    imageUrl: game.imageUrl,
    imageWidth: game.imageWidth,
    imageHeight: game.imageHeight,
    leaderboardPlacement: game.starterStats.leaderboardPlacement,
    eloRating: game.starterStats.eloRating,
    eloDelta: game.starterStats.eloDelta,
    currentForm: game.starterStats.currentForm,
    winRate: game.starterStats.winRate,
    crownTier: game.starterStats.crownTier,
    lastSync: game.starterStats.lastSync,
  }));

  const displayedGames = games.length > 0 ? games : sampleConnectedGameCards;

  const isGameConnected = (gameId: string) => games.some((game) => game.id === gameId);

  const handleConnectGame = (game: AvailableGame) => {
    if (isGameConnected(game.id)) {
      toast.info(`${game.name} is already connected`);
      setShowGameSelector(false);
      return;
    }
    setGames((prev) => [
      ...prev,
      {
        id: game.id,
        slug: game.slug,
        name: game.name,
        provider: game.provider,
        imageUrl: game.imageUrl,
        imageWidth: game.imageWidth,
        imageHeight: game.imageHeight,
        leaderboardPlacement: game.starterStats.leaderboardPlacement,
        eloRating: game.starterStats.eloRating,
        eloDelta: game.starterStats.eloDelta,
        currentForm: game.starterStats.currentForm,
        winRate: game.starterStats.winRate,
        crownTier: game.starterStats.crownTier,
        lastSync: game.starterStats.lastSync,
      },
    ]);
    toast.success(`${game.name} connected`);
    setShowGameSelector(false);
  };


  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/auth/me");
        const data = await response.json();

        if (response.ok && data.authenticated) {
          setUser(data.user);
          setAuthenticated(true);
          
          // Fetch badges from API
          try {
            const badgesResponse = await fetch(`/api/user/badges?userId=${data.user.id}`);
            if (badgesResponse.ok) {
              const badgesData = await badgesResponse.json();
              console.log("Badges fetched:", badgesData);
              setBadges(badgesData.badges || []);
            } else {
              const errorData = await badgesResponse.json().catch(() => ({}));
              console.error("Failed to fetch badges:", badgesResponse.status, errorData);
              // Log the full error for debugging
              if (errorData.details) {
                console.error("Error details:", errorData.details);
              }
            }
          } catch (error) {
            console.error("Failed to fetch badges:", error);
            if (error instanceof Error) {
              console.error("Error message:", error.message);
              console.error("Error stack:", error.stack);
            }
          }
        } else {
          // Not authenticated, redirect to login
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
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(profileUrl);
        toast.success("Profile link copied to clipboard!");
      }
    } catch (error) {
      // User cancelled or error occurred
      if (error instanceof Error && error.name !== "AbortError") {
        // Fallback: copy to clipboard
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

  // Get banner image for user
  const getBannerImage = (username: string) => {
    if (username.toLowerCase() === "yunar") {
      return "/banners/wallhaven-6dqjml.png";
    }
    return null;
  };

  const getImageDisplayHeight = (imageWidth?: number, imageHeight?: number, targetWidth = 96) => {
    if (!imageWidth || !imageHeight || imageWidth === 0) {
      return 115;
    }
    return Math.round((imageHeight / imageWidth) * targetWidth);
  };

  const formatFormLetters = (form?: Array<"W" | "L">) => {
    if (!form || form.length === 0) return null;
    return (
      <div className="flex gap-1.5">
        {form.map((entry, index) => (
          <span
            key={`${entry}-${index}`}
            className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-semibold ${
              entry === "W"
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-red-500/15 text-red-400"
            }`}
          >
            {entry}
          </span>
        ))}
      </div>
    );
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

      // Sample a region where the text will be (left side, middle)
      canvas.width = Math.min(img.naturalWidth || 200, 200);
      canvas.height = Math.min(img.naturalHeight || 200, 200);
      
      try {
        ctx.drawImage(
          img,
          0,
          (img.naturalHeight || 0) * 0.4, // Middle of image vertically
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

        // Calculate average brightness
        for (let i = 0; i < data.length; i += 16) { // Sample every 4th pixel for performance
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // Calculate relative luminance (r, g, b are guaranteed to exist in ImageData)
          if (r !== undefined && g !== undefined && b !== undefined) {
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            totalBrightness += brightness;
            pixelCount++;
          }
        }

        const averageBrightness = totalBrightness / pixelCount;
        // If average brightness is above 128, use dark text, otherwise light text
        setTextColor(averageBrightness > 128 ? "dark" : "light");
      } catch (error) {
        // Fallback to light text if detection fails
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Banner Skeleton */}
        <div className="relative w-full aspect-[8/3] max-h-[50vh] bg-gradient-to-br from-muted to-muted/50 flex items-center px-8">
          <Skeleton className="h-32 w-32 rounded-full border-4 border-background z-10" />
          <Skeleton className="ml-6 h-8 w-48" />
        </div>
      </div>
    );
  }

  if (!authenticated || !user) {
    return null; // Will redirect
  }

  const bannerImage = getBannerImage(user.username || "");

  return (
    <div className="min-h-screen bg-background">
      {/* Banner Section - 8:3 Aspect Ratio, Height reduced by 2x */}
      <div className="relative w-full aspect-[8/3] max-h-[50vh] bg-gradient-to-br from-primary/20 via-primary/10 to-muted">
        {/* Banner Image Container with overflow-hidden */}
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
              {/* Subtle overlay for better text contrast */}
              <div className={`absolute inset-0 ${
                textColor === "light" 
                  ? "bg-gradient-to-t from-black/30 via-black/10 to-transparent" 
                  : "bg-gradient-to-t from-white/20 via-white/5 to-transparent"
              }`} />
            </>
          ) : (
            <>
              {/* Pattern overlay for default banner */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
              {/* Dark overlay for default banner */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/20 to-transparent" />
            </>
          )}
        </div>
        
        {/* Profile Picture and Username - Left middle of banner */}
        <div className="relative h-full flex items-center px-4 sm:px-6 md:px-8 z-10">
          <Avatar className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 lg:h-32 lg:w-32 border-2 sm:border-[3px] md:border-4 border-background shadow-lg relative z-10 flex-shrink-0">
            <AvatarImage src={undefined} alt={user.username || ""} />
            <AvatarFallback className="text-lg sm:text-xl md:text-2xl lg:text-3xl bg-primary text-primary-foreground relative z-10">
              {getInitials(user.username || "")}
            </AvatarFallback>
          </Avatar>
          <div className="ml-3 sm:ml-4 md:ml-6 flex flex-col space-y-1 sm:space-y-2 relative z-10 min-w-0 flex-1">
            {/* Badges - Max 3 badges side by side */}
            {badges.length > 0 && (
              <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center mb-1">
                {badges.slice(0, 3).map((badge, index) => {
                  // First badge: transparent fill, only stroke
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
                  
                  // Second badge: secondary color (cyberpunk magenta from login page)
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
                  
                  // Other badges: default white/black fill
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

      {/* Games Card Section - Below Banner */}
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 md:px-8 py-6">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Connected Games</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Showcase the games linked to your TRAYB profile.
              </p>
            </div>
            <Dialog open={showGameSelector} onOpenChange={setShowGameSelector}>
              <DialogTrigger asChild>
                <Button size="sm">Add game</Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl p-0" showCloseButton={false}>
                <DialogHeader>
                  <div>
                    <DialogTitle>Connect a game</DialogTitle>
                    <DialogDescription>
                      Choose a title to showcase on your profile.
                    </DialogDescription>
                  </div>
                  <DialogClose asChild>
                    <Button variant="ghost" size="icon">
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </DialogClose>
                </DialogHeader>
                <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5">
                  {availableGames.map((game) => {
                    const connected = isGameConnected(game.id);
                    const imageDisplayHeight = getImageDisplayHeight(game.imageWidth, game.imageHeight);
                    return (
                      <div
                        key={game.id}
                        className="relative flex overflow-hidden rounded-2xl border bg-muted/30 p-4"
                        style={game.imageUrl ? { minHeight: `${imageDisplayHeight}px` } : undefined}
                      >
                        {game.imageUrl && (
                          <Image
                            src={game.imageUrl}
                            alt={`${game.name} cover art`}
                            width={96}
                            height={imageDisplayHeight}
                            className="absolute inset-y-0 left-0 h-full w-24 object-cover"
                          />
                        )}
                        <div className={`relative z-10 flex flex-1 flex-col justify-between ${game.imageUrl ? "pl-24" : ""}`}>
                          <div>
                            <p className="font-semibold">{game.name}</p>
                            <p className="text-xs text-muted-foreground">by {game.provider}</p>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-3">
                            <Button
                              size="sm"
                              onClick={() => handleConnectGame(game)}
                              disabled={connected}
                            >
                              {connected ? "Connected" : "Connect"}
                            </Button>
                            <a
                              className="text-sm text-primary underline-offset-4 hover:underline"
                              href={game.infoUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Learn more
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <p className="text-xs text-muted-foreground">
                    More titles coming soon. Have a request? Let us know!
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-6">
              {displayedGames.map((game) => {
                // Use 'cs2' as the URL slug for Counter-Strike 2
                const urlSlug = game.slug === "counter-strike-2" ? "cs2" : game.slug;
                return (
                  <Link
                    key={game.id}
                    href={`/profile/stats/${urlSlug}`}
                    className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  >
                    <div
                      className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-lg transition-all group-hover:border-primary/40"
                    >
                      <div className="flex flex-col gap-4 p-5">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-lg font-semibold">{game.name}</p>
                            <p className="text-sm text-muted-foreground">via {game.provider}</p>
                          </div>
                          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-400">
                              Linked
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                          <div className="rounded-xl border border-white/5 bg-gradient-to-br from-background to-background/30 p-3">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                              Leaderboard placement
                            </p>
                            <p className="text-base font-semibold">
                              {game.leaderboardPlacement || "—"}
                            </p>
                          </div>
                          <div className="rounded-xl border border-white/5 bg-gradient-to-br from-background to-background/30 p-3">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">ELO</p>
                            <p className="text-base font-semibold">
                              {game.eloRating ? game.eloRating.toLocaleString() : "—"}
                              {typeof game.eloDelta === "number" && (
                                <span
                                  className={`ml-2 text-xs font-medium ${
                                    game.eloDelta >= 0 ? "text-emerald-400" : "text-red-400"
                                  }`}
                                >
                                  {game.eloDelta >= 0 ? "+" : ""}
                                  {game.eloDelta}
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="rounded-xl border border-white/5 bg-gradient-to-br from-background to-background/30 p-3">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                              Current form
                            </p>
                            {formatFormLetters(game.currentForm) || <p className="text-base font-semibold">—</p>}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                          <div className="rounded-xl border border-white/5 bg-background/40 p-3">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              Win rate
                            </p>
                            <p className="text-base font-semibold">{game.winRate || "—"}</p>
                          </div>
                          <div className="rounded-xl border border-white/5 bg-background/40 p-3">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              Competitive tier
                            </p>
                            <p className="text-base font-semibold">{game.crownTier || "—"}</p>
                          </div>
                          <div className="rounded-xl border border-white/5 bg-background/40 p-3">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              Status
                            </p>
                            <p className="text-base font-semibold">{game.lastSync || "Awaiting sync"}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

