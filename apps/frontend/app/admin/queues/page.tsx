"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Clock, Calendar, Users, Play, AlertCircle } from "lucide-react";
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
// Progress component - simple implementation
const Progress = ({ value, className }: { value: number; className?: string }) => (
  <div className={`w-full bg-muted rounded-full h-2 ${className}`}>
    <div
      className="bg-primary h-2 rounded-full transition-all duration-300"
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiGet } from "@/lib/api";
import { toast } from "sonner";

interface QueueStatus {
  isOpen: boolean;
  game: "valorant" | "cs2" | null;
  playersInQueue: number;
  playersReady: number;
  nextWindow?: {
    date: string;
    time: string;
    game: "valorant" | "cs2";
  };
  countdown?: number; // seconds until next window
}

export default function QueuesPage() {
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({
    isOpen: false,
    game: null,
    playersInQueue: 0,
    playersReady: 0,
  });
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    fetchQueueStatus();
    // Poll every 5 seconds for real-time updates
    const interval = setInterval(fetchQueueStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (queueStatus.countdown && queueStatus.countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : null));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [queueStatus.countdown]);

  const fetchQueueStatus = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API endpoint when backend is ready
      // const data = await apiGet<QueueStatus>("/admin/queue/status");
      // setQueueStatus(data);
      
      // Temporary mock data
      setQueueStatus({
        isOpen: false,
        game: null,
        playersInQueue: 0,
        playersReady: 0,
        nextWindow: {
          date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          time: "20:00",
          game: "valorant",
        },
        countdown: 172800, // 2 days in seconds
      });
      setCountdown(172800);
    } catch (error) {
      console.error("Failed to fetch queue status:", error);
      toast.error("Failed to load queue status");
    } finally {
      setLoading(false);
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

  const readyPercentage = queueStatus.playersInQueue > 0
    ? (queueStatus.playersReady / queueStatus.playersInQueue) * 100
    : 0;

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <h1 className="text-3xl font-bold tracking-tight">Queue Management</h1>
            <p className="text-muted-foreground mt-2">
              Monitor and manage Trayb Series queues
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="flex items-center gap-2"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" asChild>
                  <Link href="/admin/queues/schedule">
                    <Calendar className="mr-2 h-4 w-4" />
                    Schedule
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Manage queue schedule</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" asChild>
                  <Link href="/admin/queues/active">
                    <Users className="mr-2 h-4 w-4" />
                    Active Queues
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View active queues</p>
              </TooltipContent>
            </Tooltip>
          </motion.div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card className="transition-all duration-200 hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Queue Status</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <Badge
                    variant={queueStatus.isOpen ? "default" : "secondary"}
                    className="text-lg"
                  >
                    {queueStatus.isOpen ? "Open" : "Closed"}
                  </Badge>
                </div>
                {queueStatus.game && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {queueStatus.game === "valorant" ? "Valorant" : "CS2"}
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <Card className="transition-all duration-200 hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Players in Queue</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{queueStatus.playersInQueue}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  {queueStatus.playersReady} ready
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            <Card className="transition-all duration-200 hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Match Ready</CardTitle>
                <Play className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {queueStatus.playersReady >= 10 ? "Yes" : `${10 - queueStatus.playersReady} needed`}
                </div>
                <Progress
                  value={readyPercentage}
                  className="mt-2 h-2"
                />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 }}
          >
            <Card className="transition-all duration-200 hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Next Window</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {queueStatus.nextWindow ? (
                  <>
                    <div className="text-lg font-bold">
                      {formatCountdown(countdown ?? queueStatus.countdown ?? null)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(queueStatus.nextWindow.date).toLocaleDateString()} at{" "}
                      {queueStatus.nextWindow.time}
                    </p>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {queueStatus.nextWindow.game === "valorant" ? "Valorant" : "CS2"}
                    </Badge>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No upcoming windows</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {queueStatus.playersReady >= 10 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <AlertCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertTitle className="text-green-900 dark:text-green-100">
                Match Ready to Create
              </AlertTitle>
              <AlertDescription className="text-green-800 dark:text-green-200">
                {queueStatus.playersReady} players are ready. A match can be created automatically
                or manually.
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card className="transition-all duration-200 hover:shadow-md">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Manage queue operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={queueStatus.isOpen ? "destructive" : "default"}
                      onClick={async () => {
                        // TODO: Call API to toggle queue
                        toast.success(
                          queueStatus.isOpen
                            ? "Queue closed"
                            : "Queue opened"
                        );
                        setQueueStatus((prev) => ({
                          ...prev,
                          isOpen: !prev.isOpen,
                        }));
                      }}
                    >
                      {queueStatus.isOpen ? "Close Queue" : "Open Queue"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {queueStatus.isOpen
                        ? "Close the current queue"
                        : "Open the queue manually"}
                    </p>
                  </TooltipContent>
                </Tooltip>
                {queueStatus.playersReady >= 10 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="default"
                        onClick={async () => {
                          // TODO: Call API to create match
                          toast.success("Match created successfully!");
                        }}
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Create Match
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Manually create a match with ready players</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        // TODO: Call API to clear queue
                        toast.success("Queue cleared");
                        setQueueStatus((prev) => ({
                          ...prev,
                          playersInQueue: 0,
                          playersReady: 0,
                        }));
                      }}
                    >
                      Clear Queue
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Remove all players from the queue</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </TooltipProvider>
  );
}

