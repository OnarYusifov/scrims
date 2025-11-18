import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const gamesCatalog = {
  "counter-strike-2": {
    name: "Counter-Strike 2",
    provider: "Valve",
    genre: "Tactical Shooter",
    platform: "PC • Steam",
    releaseInfo: "Live since Sep 2023",
    summary:
      "Your Counter-Strike 2 account is linked to TRAYB. Track your Premier climb, match history, and party invites in one place.",
    coverImage: "/games/counter-strike-2-285x380.jpg",
    leaderboardPlacement: "#112 EU Premier",
    eloRating: 2748,
    eloDelta: +36,
    winRate: "68%",
    crownTier: "Diamond II",
    lastSync: "Synced 2h ago",
    followers: 12800,
    subscriptions: 42,
    friendsOnline: 12,
    currentForm: ["W", "W", "L", "W", "W"] as Array<"W" | "L">,
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
  },
  valorant: {
    name: "Valorant",
    provider: "Riot Games",
    genre: "Hero Shooter",
    platform: "PC • Riot Client",
    releaseInfo: "Live since Jun 2020",
    summary:
      "This Valorant profile mirrors your FACEIT-inspired stats: rating curve, streaks, and cross-region leaderboards.",
    coverImage: "/games/valorant-285x380.jpg",
    leaderboardPlacement: "#980 Global Competitive",
    eloRating: 2013,
    eloDelta: -12,
    winRate: "58%",
    crownTier: "Immortal I",
    lastSync: "Synced 47m ago",
    followers: 8200,
    subscriptions: 18,
    friendsOnline: 5,
    currentForm: ["L", "W", "W", "W", "L"] as Array<"W" | "L">,
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

export default function GameDetailPage({
  params,
}: {
  params: {
    gameId: string;
  };
}) {
  const game = gamesCatalog[params.gameId as keyof typeof gamesCatalog];

  if (!game) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 lg:py-10">
        <div className="mb-6 text-sm text-muted-foreground">
          <Link href="/profile" className="hover:text-foreground">
            ← Back to profile
          </Link>
        </div>

        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-card text-white shadow-2xl">
          <Image
            src={game.coverImage}
            alt={`${game.name} hero artwork`}
            fill
            priority
            className="object-cover"
            sizes="100vw"
            style={{ objectPosition: "left center" }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/30" />
          <div className="relative z-10 flex flex-col gap-6 p-8 lg:flex-row lg:items-end lg:justify-between">
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
              <h1 className="text-4xl font-bold tracking-tight text-white lg:text-5xl">
                {game.name}
              </h1>
              <p className="text-white/80 text-base max-w-xl">{game.summary}</p>
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-500/40">
                  Linked on TRAYB
                </Badge>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  {game.leaderboardPlacement}
                </Badge>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  {game.crownTier}
                </Badge>
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

        <section className="mt-8 rounded-2xl border border-border bg-card/80 p-6 shadow-lg">
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
                {game.overviewStats.map((stat) => (
                  <Card key={stat.label} className="border-white/5 bg-muted/20">
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
                <Card className="border-white/5 bg-muted/30">
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
                          {game.eloRating.toLocaleString()}{" "}
                          <span
                            className={`text-xs ${
                              game.eloDelta >= 0 ? "text-emerald-500" : "text-red-400"
                            }`}
                          >
                            {game.eloDelta >= 0 ? "+" : ""}
                            {game.eloDelta}
                          </span>
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
                <Card className="border-white/5 bg-muted/30">
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
                {game.statsBreakdown.map((stat) => (
                  <Card key={stat.label} className="border-white/5 bg-background/60">
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
              <div className="mt-6 rounded-2xl border border-white/5 bg-background/40 p-6">
                <p className="text-sm uppercase tracking-wide text-muted-foreground mb-2">
                  Season insights
                </p>
                <p className="text-muted-foreground">
                  Detailed round-by-round data, agent preferences, and map pool performance will
                  appear here as soon as we finish syncing your TRAYB profile with Riot and Valve
                  APIs.
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
              <div className="rounded-2xl border border-white/5 bg-background/50 p-6">
                <p className="text-muted-foreground">
                  Your followers from TRAYB and connected platforms will be listed here once they
                  opt into visibility.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="friends" className="pt-6">
              <div className="rounded-2xl border border-white/5 bg-background/50 p-6">
                <p className="text-muted-foreground">
                  FACEIT-style party widgets and voice channel pins will appear once friends link
                  their accounts. Send them your invite from the Overview tab.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </div>
  );
}


