"use client";

import { useEffect, useState, useRef } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  const [games, setGames] = useState<Array<{
    id: string;
    name: string;
    provider: string;
    icon?: string;
  }>>([]);


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
      <div className="container mx-auto px-4 sm:px-6 md:px-8 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Connected Games</CardTitle>
          </CardHeader>
          <CardContent>
            {games.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {games.map((game) => (
                  <div
                    key={game.id}
                    className="flex flex-col items-center justify-center p-4 rounded-lg border bg-card hover:bg-accent transition-colors cursor-pointer group"
                  >
                    <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">
                      {game.icon || "🎮"}
                    </div>
                    <span className="text-sm font-medium text-center">
                      {game.name}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No games connected yet</p>
                <p className="text-xs mt-1">Connect your game accounts to see them here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

