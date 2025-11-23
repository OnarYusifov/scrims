"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Users, CheckCircle2, Clock, X } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiGet, apiPost } from "@/lib/api";
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

interface QueuePlayer {
  id: string;
  userId: string;
  username: string;
  game: "valorant" | "cs2";
  joinedAt: string;
  isReady: boolean;
  readyAt?: string;
  elo?: number;
}

interface ActiveQueue {
  id: string;
  game: "valorant" | "cs2";
  players: QueuePlayer[];
  status: "waiting" | "ready" | "matchmaking";
  createdAt: string;
  readyCount: number;
}

export default function ActiveQueuesPage() {
  const [queues, setQueues] = useState<ActiveQueue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveQueues();
    // Poll every 3 seconds for real-time updates
    const interval = setInterval(fetchActiveQueues, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchActiveQueues = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API endpoint when backend is ready
      // const data = await apiGet<{ queues: ActiveQueue[] }>("/admin/queue/active");
      // setQueues(data.queues);
      
      // Temporary mock data
      setQueues([
        {
          id: "1",
          game: "valorant",
          status: "ready",
          createdAt: new Date().toISOString(),
          readyCount: 10,
          players: Array.from({ length: 10 }, (_, i) => ({
            id: `p${i + 1}`,
            userId: `user${i + 1}`,
            username: `Player${i + 1}`,
            game: "valorant" as const,
            joinedAt: new Date(Date.now() - (i + 1) * 60000).toISOString(),
            isReady: i < 10,
            readyAt: i < 10 ? new Date().toISOString() : undefined,
            elo: 1500 + i * 50,
          })),
        },
        {
          id: "2",
          game: "cs2",
          status: "waiting",
          createdAt: new Date().toISOString(),
          readyCount: 3,
          players: Array.from({ length: 3 }, (_, i) => ({
            id: `p${i + 11}`,
            userId: `user${i + 11}`,
            username: `Player${i + 11}`,
            game: "cs2" as const,
            joinedAt: new Date(Date.now() - (i + 1) * 120000).toISOString(),
            isReady: false,
            elo: 1600 + i * 30,
          })),
        },
      ]);
    } catch (error) {
      console.error("Failed to fetch active queues:", error);
      toast.error("Failed to load active queues");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelQueue = async (queueId: string) => {
    try {
      // TODO: Replace with actual API endpoint
      // await apiPost(`/admin/queue/${queueId}/cancel`);
      setQueues((prev) => prev.filter((q) => q.id !== queueId));
      toast.success("Queue cancelled successfully");
    } catch (error) {
      console.error("Failed to cancel queue:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel queue"
      );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ready":
        return <Badge variant="default" className="bg-green-500">Ready</Badge>;
      case "matchmaking":
        return <Badge variant="default">Matchmaking</Badge>;
      default:
        return <Badge variant="secondary">Waiting</Badge>;
    }
  };

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
                <Link href="/admin/queues">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Back to queues</p>
            </TooltipContent>
          </Tooltip>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">Active Queues</h1>
            <p className="text-muted-foreground mt-2">
              Monitor players currently in queue
            </p>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading active queues...</p>
          </div>
        ) : queues.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card className="transition-all duration-200 hover:shadow-md">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No active queues</p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {queues.map((queue, queueIndex) => (
              <motion.div
                key={queue.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: queueIndex * 0.1 }}
              >
                <Card className="transition-all duration-200 hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {queue.game === "valorant" ? "Valorant" : "CS2"} Queue
                          {getStatusBadge(queue.status)}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {queue.players.length} players • {queue.readyCount} ready
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {queue.status === "ready" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="default"
                                onClick={async () => {
                                  // TODO: Call API to create match
                                  toast.success("Match created successfully!");
                                }}
                              >
                                Create Match
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Create match with ready players</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="icon">
                              <X className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogPopup>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancel Queue</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to cancel this queue? All players
                                will be removed.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleCancelQueue(queue.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Cancel Queue
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogPopup>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {queue.players.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">
                        No players in queue
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Player</TableHead>
                            <TableHead>ELO</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {queue.players.map((player, index) => (
                            <TableRow
                              key={player.id}
                              className="transition-all duration-200 hover:bg-muted/50"
                              style={{
                                animation: `fadeIn 0.3s ease-out ${index * 0.05}s both`,
                              }}
                            >
                              <TableCell className="font-medium">
                                {player.username}
                              </TableCell>
                              <TableCell>
                                {player.elo ? (
                                  <Badge variant="outline">{player.elo}</Badge>
                                ) : (
                                  <span className="text-muted-foreground">N/A</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {new Date(player.joinedAt).toLocaleTimeString()}
                                </div>
                              </TableCell>
                              <TableCell>
                                {player.isReady ? (
                                  <Badge variant="default" className="bg-green-500">
                                    <CheckCircle2 className="mr-1 h-3 w-3" />
                                    Ready
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">Waiting</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}

                    {queue.status === "ready" && (
                      <Alert className="mt-4 border-green-500 bg-green-50 dark:bg-green-950">
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <AlertTitle className="text-green-900 dark:text-green-100">
                          Match Ready
                        </AlertTitle>
                        <AlertDescription className="text-green-800 dark:text-green-200">
                          All {queue.players.length} players are ready. You can create
                          a match now.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </TooltipProvider>
  );
}

