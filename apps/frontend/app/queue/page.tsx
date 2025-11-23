"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Clock,
  Users,
  Play,
  LogOut,
  Building2,
  Trophy,
  Gamepad2,
} from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { toast } from "sonner";
import { useQueueStore } from "@/lib/queue-store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface QueueInfo {
  type: "unranked" | "ranked_global" | "private_hub";
  game: "valorant" | "cs2";
  isOpen: boolean;
  playersInQueue: number;
  nextWindow?: {
    date: string;
    time: string;
    countdown: number;
  };
  hubId?: string;
  hubName?: string;
}

export default function QueuePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { queueStatus, setQueueStatus, clearQueueStatus } = useQueueStore();
  const [selectedGame, setSelectedGame] = useState<"valorant" | "cs2">("valorant");
  const [queues, setQueues] = useState<QueueInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const userQueueStatusRef = useRef(queueStatus);
  
  // Keep ref in sync with store
  useEffect(() => {
    console.log("[Queue] Store changed, updating ref", {
      oldRef: userQueueStatusRef.current,
      newState: queueStatus,
    });
    userQueueStatusRef.current = queueStatus;
  }, [queueStatus]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/queue");
      return;
    }
    if (status === "authenticated") {
      fetchQueueInfo();
      // Only fetch initial status if user is not already in queue
      if (!queueStatus.isInQueue) {
        fetchUserQueueStatus(true);
      }
      // Poll every 3 seconds for real-time updates
      const interval = setInterval(() => {
        console.log("[Queue] Polling interval - checking status", {
          isInQueue: userQueueStatusRef.current.isInQueue,
          currentStatus: userQueueStatusRef.current,
        });
        fetchQueueInfo();
        // Only fetch user status if they're not in queue (to check if they should be)
        // If they're in queue, we don't want to overwrite their status
        if (!queueStatus.isInQueue) {
          console.log("[Queue] User not in queue - fetching status");
          fetchUserQueueStatus();
        } else {
          console.log("[Queue] User is in queue - skipping status fetch");
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [status, selectedGame, router]);

  useEffect(() => {
    const rankedQueue = queues.find((q) => q.type === "ranked_global");
    if (rankedQueue?.nextWindow?.countdown) {
      const timer = setInterval(() => {
        setCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : null));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [queues]);

  const fetchQueueInfo = async () => {
    try {
      // TODO: Replace with actual API endpoint
      // const data = await apiGet<{ queues: QueueInfo[] }>(`/queue/info?game=${selectedGame}`);
      // setQueues(data.queues);
      
      // Temporary mock data
      setQueues([
        {
          type: "unranked",
          game: selectedGame,
          isOpen: true,
          playersInQueue: 5,
        },
        {
          type: "ranked_global",
          game: selectedGame,
          isOpen: false,
          playersInQueue: 0,
          nextWindow: {
            date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            time: "20:00",
            countdown: 172800,
          },
        },
        {
          type: "private_hub",
          game: selectedGame,
          isOpen: true,
          playersInQueue: 2,
          hubId: "1",
          hubName: "Elite Private Hub",
        },
      ]);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch queue info:", error);
      toast.error("Failed to load queue information");
      setLoading(false);
    }
  };

  const fetchUserQueueStatus = async (force = false) => {
    try {
      console.log("[Queue] fetchUserQueueStatus called", {
        force,
        currentStatus: queueStatus,
        isInQueue: queueStatus.isInQueue,
      });
      
      // TODO: Replace with actual API endpoint
      // const status = await apiGet<UserQueueStatus>("/queue/status");
      // setQueueStatus(status);
      
      // Temporary mock - only update if user is not in queue or if forced
      // This prevents overwriting the state when user has joined
      // In production, the API will return the actual status
      if (force || !queueStatus.isInQueue) {
        // Only set to false if we're forcing or they're not in queue
        if (!queueStatus.isInQueue) {
          console.log("[Queue] Setting user status to not in queue");
          setQueueStatus({ isInQueue: false });
        } else {
          console.log("[Queue] Skipping status update - user is in queue");
        }
      } else {
        console.log("[Queue] Skipping fetchUserQueueStatus - user is in queue and not forced");
      }
    } catch (error) {
      console.error("[Queue] Failed to fetch user queue status:", error);
    }
  };

  const handleJoinQueue = async (queueType: string) => {
    try {
      console.log("[Queue] handleJoinQueue called", { queueType, game: selectedGame });
      setJoining(true);
      // TODO: Replace with actual API endpoint
      // await apiPost("/queue/join", { queueType, game: selectedGame });
      
      // Temporary success - update global store
      const newStatus = {
        isInQueue: true,
        queueType: queueType as "unranked" | "ranked_global" | "private_hub",
        game: selectedGame,
        position: 1,
        readyStatus: "waiting" as const,
      };
      console.log("[Queue] Setting user status to in queue", newStatus);
      setQueueStatus(newStatus);
      console.log("[Queue] Store updated", queueStatus);
      
      toast.success("Joined queue successfully!");
      fetchQueueInfo();
    } catch (error) {
      console.error("Failed to join queue:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to join queue"
      );
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveQueue = async () => {
    try {
      console.log("[Queue] handleLeaveQueue called");
      setLeaving(true);
      // TODO: Replace with actual API endpoint
      // await apiDelete("/queue/leave");
      
      // Update global store
      console.log("[Queue] Clearing queue status");
      clearQueueStatus();
      console.log("[Queue] Store cleared");
      
      toast.success("Left queue");
      fetchQueueInfo();
    } catch (error) {
      console.error("Failed to leave queue:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to leave queue"
      );
    } finally {
      setLeaving(false);
    }
  };

  const formatCountdown = (seconds: number | null): string => {
    if (!seconds) return "N/A";
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const unrankedQueue = queues.find((q) => q.type === "unranked");
  const rankedQueue = queues.find((q) => q.type === "ranked_global");
  const privateQueue = queues.find((q) => q.type === "private_hub");

  if (status === "loading" || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading queues...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="container mx-auto px-4 py-8 max-w-6xl"
      >
        <div className="flex items-center justify-between mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <h1 className="text-4xl font-bold tracking-tight mb-2">Join Queue</h1>
            <p className="text-muted-foreground">
              Select a queue type and join to find a match
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Select value={selectedGame} onValueChange={(value: "valorant" | "cs2") => setSelectedGame(value)}>
              <SelectTrigger className="w-[140px]">
                <Gamepad2 className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="valorant">Valorant</SelectItem>
                <SelectItem value="cs2">CS2</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>
        </div>

        {queueStatus.isInQueue && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-6"
          >
            <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
              <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertTitle className="text-blue-900 dark:text-blue-100">
                You are in queue
              </AlertTitle>
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                <div className="flex items-center justify-between mt-2">
                  <span>
                    Queue: {queueStatus.queueType === "unranked" ? "Unranked" : 
                           queueStatus.queueType === "ranked_global" ? "Ranked Global" : 
                           "Private Hub"}
                    {queueStatus.position && ` • Position: ${queueStatus.position}`}
                  </span>
                  <AlertDialog>
                    <AlertDialogTrigger
                      className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3"
                      disabled={leaving}
                    >
                      {leaving ? "Leaving..." : (
                        <>
                          <LogOut className="h-4 w-4" />
                          Leave Queue
                        </>
                      )}
                    </AlertDialogTrigger>
                    <AlertDialogPopup>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Leave Queue</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to leave the queue? You will lose your position.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleLeaveQueue}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Leave Queue
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogPopup>
                  </AlertDialog>
                </div>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          {/* Unranked Queue */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card className="transition-all duration-200 hover:shadow-lg h-full flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Play className="h-5 w-5" />
                    Unranked
                  </CardTitle>
                  <Badge variant={unrankedQueue?.isOpen ? "default" : "secondary"}>
                    {unrankedQueue?.isOpen ? "Open" : "Closed"}
                  </Badge>
                </div>
                <CardDescription>
                  Casual matches with no ELO impact
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div className="space-y-4 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Players in queue</span>
                    <span className="text-2xl font-bold">{unrankedQueue?.playersInQueue || 0}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <ul className="list-disc list-inside space-y-1">
                      <li>No ELO impact</li>
                      <li>All draft options</li>
                      <li>Always available</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-auto pt-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className="w-full"
                        onClick={() => handleJoinQueue("unranked")}
                        disabled={!unrankedQueue?.isOpen || queueStatus.isInQueue || joining}
                      >
                        {joining ? "Joining..." : "Join Queue"}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {!unrankedQueue?.isOpen
                          ? "Queue is closed"
                          : queueStatus.isInQueue
                          ? "You are already in a queue"
                          : "Join unranked queue"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Ranked Global (Trayb Series) Queue */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <Card className="transition-all duration-200 hover:shadow-lg h-full flex flex-col border-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    Ranked Global
                  </CardTitle>
                  <Badge variant={rankedQueue?.isOpen ? "default" : "secondary"}>
                    {rankedQueue?.isOpen ? "Open" : "Closed"}
                  </Badge>
                </div>
                <CardDescription>
                  Trayb Series - Official ranked matches
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div className="space-y-4 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Players in queue</span>
                    <span className="text-2xl font-bold">{rankedQueue?.playersInQueue || 0}</span>
                  </div>
                  {rankedQueue?.nextWindow && !rankedQueue.isOpen && (
                    <div className="space-y-2 p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Next window:</span>
                      </div>
                      <div className="text-lg font-bold">
                        {formatCountdown(countdown ?? rankedQueue.nextWindow.countdown)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(rankedQueue.nextWindow.date).toLocaleDateString()} at{" "}
                        {rankedQueue.nextWindow.time}
                      </div>
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    <ul className="list-disc list-inside space-y-1">
                      <li>ELO impact</li>
                      <li>Captain draft only</li>
                      <li>Scheduled windows</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-auto pt-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className="w-full"
                        variant={rankedQueue?.isOpen ? "default" : "outline"}
                        onClick={() => handleJoinQueue("ranked_global")}
                        disabled={!rankedQueue?.isOpen || queueStatus.isInQueue || joining}
                      >
                        {joining ? "Joining..." : rankedQueue?.isOpen ? "Join Queue" : "Queue Closed"}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {!rankedQueue?.isOpen
                          ? `Next window in ${formatCountdown(countdown ?? rankedQueue?.nextWindow?.countdown ?? null)}`
                          : queueStatus.isInQueue
                          ? "You are already in a queue"
                          : "Join Trayb Series queue"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Private Hub Queue */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            <Card className="transition-all duration-200 hover:shadow-lg h-full flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Private Hub
                  </CardTitle>
                  <Badge variant={privateQueue?.isOpen ? "default" : "secondary"}>
                    {privateQueue?.isOpen ? "Open" : "Closed"}
                  </Badge>
                </div>
                <CardDescription>
                  {privateQueue?.hubName || "Private hub matches"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div className="space-y-4 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Players in queue</span>
                    <span className="text-2xl font-bold">{privateQueue?.playersInQueue || 0}</span>
                  </div>
                  {privateQueue?.hubName && (
                    <div className="text-sm">
                      <Badge variant="outline">{privateQueue.hubName}</Badge>
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    <ul className="list-disc list-inside space-y-1">
                      <li>Hub-specific ELO</li>
                      <li>Whitelist required</li>
                      <li>All draft options</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-auto pt-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className="w-full"
                        onClick={() => handleJoinQueue("private_hub")}
                        disabled={!privateQueue?.isOpen || queueStatus.isInQueue || joining}
                      >
                        {joining ? "Joining..." : "Join Queue"}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {!privateQueue?.isOpen
                          ? "Queue is closed"
                          : queueStatus.isInQueue
                          ? "You are already in a queue"
                          : "Join private hub queue"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </TooltipProvider>
  );
}

