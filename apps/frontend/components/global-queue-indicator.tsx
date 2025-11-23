"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { Users, LogOut, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQueueStore } from "@/lib/queue-store";
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
import { apiDelete } from "@/lib/api";
import { toast } from "sonner";

export function GlobalQueueIndicator() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { queueStatus, clearQueueStatus } = useQueueStore();
  const [leaving, setLeaving] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isAdminDomain, setIsAdminDomain] = useState(false);

  useEffect(() => {
    // Check if we're on admin subdomain
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      setIsAdminDomain(hostname.startsWith("admin.") || hostname === "admin.trayb.az");
    }
  }, []);

  useEffect(() => {
    // Don't show on admin pages or admin subdomain
    const isAdminPage = pathname?.startsWith("/admin");
    
    // Only show if user is authenticated, in queue, and not on admin domain/page
    if (
      status === "authenticated" &&
      queueStatus.isInQueue &&
      !isAdminDomain &&
      !isAdminPage
    ) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [status, queueStatus.isInQueue, isAdminDomain, pathname]);

  const handleLeaveQueue = async () => {
    try {
      setLeaving(true);
      // TODO: Replace with actual API endpoint
      // await apiDelete("/queue/leave");
      
      clearQueueStatus();
      toast.success("Left queue");
      setIsVisible(false);
    } catch (error) {
      console.error("Failed to leave queue:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to leave queue"
      );
    } finally {
      setLeaving(false);
    }
  };

  const handleClick = () => {
    router.push("/queue");
  };

  const getQueueTypeLabel = () => {
    switch (queueStatus.queueType) {
      case "unranked":
        return "Unranked";
      case "ranked_global":
        return "Trayb Series";
      case "private_hub":
        return queueStatus.hubName || "Private Hub";
      default:
        return "Queue";
    }
  };

  const getGameLabel = () => {
    return queueStatus.game === "valorant" ? "Valorant" : "CS2";
  };

  if (status !== "authenticated" || !isVisible) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: -100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-4 left-4 z-50"
        >
          <TooltipProvider>
            <Card
              className="w-64 shadow-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-xl"
              onClick={handleClick}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm font-medium truncate">
                          In Queue
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {getQueueTypeLabel()} • {getGameLabel()}
                      </div>
                      {queueStatus.position && (
                        <div className="text-xs text-muted-foreground">
                          Position: {queueStatus.position}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertDialog>
                          <AlertDialogTrigger
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 hover:bg-destructive hover:text-destructive-foreground h-7 w-7"
                          >
                            <X className="h-4 w-4" />
                          </AlertDialogTrigger>
                          <AlertDialogPopup>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Leave Queue</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to leave the queue? You
                                will lose your position.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLeaveQueue();
                                }}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Leave Queue
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogPopup>
                        </AlertDialog>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Leave queue</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                {queueStatus.readyStatus === "ready" && (
                  <div className="mt-2 pt-2 border-t">
                    <Badge variant="default" className="bg-green-500">
                      Ready
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </TooltipProvider>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

