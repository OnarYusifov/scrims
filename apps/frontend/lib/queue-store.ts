"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface UserQueueStatus {
  isInQueue: boolean;
  queueType?: "unranked" | "ranked_global" | "private_hub";
  game?: "valorant" | "cs2";
  position?: number;
  readyStatus?: "waiting" | "ready" | "declined";
  hubId?: string;
  hubName?: string;
}

interface QueueStore {
  queueStatus: UserQueueStatus;
  setQueueStatus: (status: UserQueueStatus) => void;
  clearQueueStatus: () => void;
}

export const useQueueStore = create<QueueStore>()(
  persist(
    (set) => ({
      queueStatus: {
        isInQueue: false,
      },
      setQueueStatus: (status) => set({ queueStatus: status }),
      clearQueueStatus: () =>
        set({
          queueStatus: {
            isInQueue: false,
          },
        }),
    }),
    {
      name: "queue-status-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

