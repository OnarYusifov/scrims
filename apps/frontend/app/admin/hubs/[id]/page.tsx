"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, Trash2, Users, Settings } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TabsContents,
} from "@/components/animate-ui/components/animate/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { apiGet, apiDelete } from "@/lib/api";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/animate-ui/components/base/alert-dialog";

interface Hub {
  id: string;
  name: string;
  description?: string;
  game: "valorant" | "cs2";
  type: "global" | "private";
  memberCount?: number;
  activeMatches?: number;
  totalMatches?: number;
  createdAt: string;
  queueTypes?: string[];
  draftOptions?: string[];
  recordingPolicy?: string;
}

export default function HubDetailPage() {
  const params = useParams();
  const router = useRouter();
  const hubId = params.id as string;
  const [hub, setHub] = useState<Hub | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchHub();
  }, [hubId]);

  const fetchHub = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API endpoint when backend is ready
      // const data = await apiGet<Hub>(`/admin/hubs/${hubId}`);
      // setHub(data);
      
      // Temporary mock data
      setHub({
        id: hubId,
        name: "Global Trayb Series - Valorant",
        description: "The main competitive hub for Valorant players",
        game: "valorant",
        type: "global",
        memberCount: 150,
        activeMatches: 2,
        totalMatches: 450,
        createdAt: new Date().toISOString(),
        queueTypes: ["unranked", "ranked"],
        draftOptions: ["random", "elo_balanced", "captain"],
        recordingPolicy: "optional",
      });
    } catch (error) {
      console.error("Failed to fetch hub:", error);
      toast.error("Failed to load hub");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      // TODO: Replace with actual API endpoint when backend is ready
      // await apiDelete(`/admin/hubs/${hubId}`);
      
      // Temporary success
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      toast.success("Hub deleted successfully");
      router.push("/admin/hubs");
    } catch (error) {
      console.error("Failed to delete hub:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete hub"
      );
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading hub...</p>
      </div>
    );
  }

  if (!hub) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground mb-4">Hub not found</p>
        <Button variant="outline" asChild>
          <Link href="/admin/hubs">Back to Hubs</Link>
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex items-center gap-4"
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" asChild>
                <Link href="/admin/hubs">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Back to hubs</p>
            </TooltipContent>
          </Tooltip>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">{hub.name}</h1>
            <p className="text-muted-foreground mt-2">
              {hub.description || "No description"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" asChild>
                  <Link href={`/admin/hubs/${hubId}/settings`}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Hub settings</p>
              </TooltipContent>
            </Tooltip>
            <AlertDialog>
              <AlertDialogTrigger
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-ring/50 focus-visible:ring-[3px] h-9 px-4 py-2"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </AlertDialogTrigger>
              <AlertDialogPopup>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Hub</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete &quot;{hub.name}&quot;? This action cannot be
                    undone and will remove all associated data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={deleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting ? "Deleting..." : "Delete Hub"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogPopup>
            </AlertDialog>
          </div>
        </motion.div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="whitelist">
              Whitelist
              {hub.type === "private" && hub.memberCount && (
                <Badge variant="secondary" className="ml-2">
                  {hub.memberCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
          </TabsList>
          <TabsContents>

            <TabsContent value="overview" className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
              >
                <Card className="transition-all duration-200 hover:shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Game</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="outline" className="text-lg">
                      {hub.game === "valorant" ? "Valorant" : "CS2"}
                    </Badge>
                  </CardContent>
                </Card>
                <Card className="transition-all duration-200 hover:shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge
                      variant={hub.type === "global" ? "default" : "secondary"}
                      className="text-lg"
                    >
                      {hub.type === "global" ? "Global" : "Private"}
                    </Badge>
                  </CardContent>
                </Card>
                <Card className="transition-all duration-200 hover:shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Members</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{hub.memberCount || 0}</div>
                  </CardContent>
                </Card>
                <Card className="transition-all duration-200 hover:shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Matches</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{hub.totalMatches || 0}</div>
                  </CardContent>
                </Card>
              </motion.div>

          <Card>
            <CardHeader>
              <CardTitle>Hub Configuration</CardTitle>
              <CardDescription>Current settings for this hub</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Queue Types Allowed</p>
                <div className="flex gap-2">
                  {hub.queueTypes && hub.queueTypes.length > 0 ? (
                    hub.queueTypes.map((type) => (
                      <Badge key={type} variant="outline" className="capitalize">
                        {type}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">None configured</p>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Draft Options</p>
                <div className="flex gap-2">
                  {hub.draftOptions && hub.draftOptions.length > 0 ? (
                    hub.draftOptions.map((option) => (
                      <Badge key={option} variant="outline">
                        {option === "random"
                          ? "Random"
                          : option === "elo_balanced"
                          ? "ELO Balanced"
                          : "Captain Draft"}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">None configured</p>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Recording Policy</p>
                <Badge variant="outline" className="capitalize">
                  {hub.recordingPolicy || "optional"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

            <TabsContent value="whitelist">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <Card className="transition-all duration-200 hover:shadow-md">
                  <CardHeader>
                    <CardTitle>Whitelist Management</CardTitle>
                    <CardDescription>
                      {hub.type === "global"
                        ? "This is a global hub. Whitelist management is not available."
                        : "Manage the whitelist for this private hub"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {hub.type === "global" ? (
                      <p className="text-muted-foreground">
                        Global hubs are open to all players. No whitelist is needed.
                      </p>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button asChild>
                            <Link href={`/admin/hubs/${hubId}/whitelist`}>
                              <Users className="mr-2 h-4 w-4" />
                              Manage Whitelist
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Manage whitelist members</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="stats">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <Card className="transition-all duration-200 hover:shadow-md">
                  <CardHeader>
                    <CardTitle>Hub Statistics</CardTitle>
                    <CardDescription>Statistics and analytics for this hub</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Statistics dashboard coming soon...
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </TabsContents>
        </Tabs>
      </motion.div>
    </TooltipProvider>
  );
}

