"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Clock, Users } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { apiPost } from "@/lib/api";
import { toast } from "sonner";

interface ReadyUpProps {
  open: boolean;
  onClose: () => void;
  matchId?: string;
  playersReady: number;
  totalPlayers: number;
  countdown: number; // seconds
  onAccept: () => void;
  onDecline: () => void;
}

// Simple Progress component
const ProgressBar = ({ value, className }: { value: number; className?: string }) => (
  <div className={`w-full bg-muted rounded-full h-2 ${className}`}>
    <div
      className="bg-primary h-2 rounded-full transition-all duration-300"
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);

export function QueueReadyUp({
  open,
  onClose,
  matchId,
  playersReady,
  totalPlayers,
  countdown: initialCountdown,
  onAccept,
  onDecline,
}: ReadyUpProps) {
  const [countdown, setCountdown] = useState(initialCountdown);
  const [userResponse, setUserResponse] = useState<"accepted" | "declined" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            // Timeout - auto decline
            if (!userResponse) {
              handleDecline();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [open, countdown, userResponse]);

  const handleAccept = async () => {
    try {
      setSubmitting(true);
      // TODO: Replace with actual API endpoint
      // await apiPost(`/queue/match/${matchId}/accept`);
      
      setUserResponse("accepted");
      onAccept();
      toast.success("Match accepted! Preparing match...");
    } catch (error) {
      console.error("Failed to accept match:", error);
      toast.error("Failed to accept match");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    try {
      setSubmitting(true);
      // TODO: Replace with actual API endpoint
      // await apiPost(`/queue/match/${matchId}/decline`);
      
      setUserResponse("declined");
      onDecline();
      toast.info("Match declined");
      onClose();
    } catch (error) {
      console.error("Failed to decline match:", error);
      toast.error("Failed to decline match");
    } finally {
      setSubmitting(false);
    }
  };

  const readyPercentage = (playersReady / totalPlayers) * 100;
  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Match Found!
          </DialogTitle>
          <DialogDescription>
            A match has been found. Please accept or decline within the time limit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Countdown Timer */}
          <div className="flex items-center justify-center">
            <motion.div
              key={countdown}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="text-center"
            >
              <div className="flex items-center gap-2 text-4xl font-bold">
                <Clock className="h-8 w-8 text-primary" />
                {String(minutes).padStart(2, "0")}:
                {String(seconds).padStart(2, "0")}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Time remaining to accept
              </p>
            </motion.div>
          </div>

          {/* Players Ready Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Players Ready</span>
              <span className="font-medium">
                {playersReady} / {totalPlayers}
              </span>
            </div>
            <ProgressBar value={readyPercentage} />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {playersReady === totalPlayers ? (
                <>
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  <span>All players ready!</span>
                </>
              ) : (
                <>
                  <Clock className="h-3 w-3" />
                  <span>Waiting for {totalPlayers - playersReady} more players...</span>
                </>
              )}
            </div>
          </div>

          {/* User Response Status */}
          <AnimatePresence>
            {userResponse && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center justify-center gap-2 p-4 rounded-lg bg-muted"
              >
                {userResponse === "accepted" ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="font-medium">You accepted the match</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-destructive" />
                    <span className="font-medium">You declined the match</span>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleDecline}
              disabled={submitting || userResponse !== null || countdown === 0}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Decline
            </Button>
            <Button
              className="flex-1"
              onClick={handleAccept}
              disabled={submitting || userResponse !== null || countdown === 0}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {userResponse === "accepted" ? "Accepted" : "Accept Match"}
            </Button>
          </div>

          {/* Match Info */}
          {matchId && (
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Match ID</span>
                <Badge variant="outline">{matchId}</Badge>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

