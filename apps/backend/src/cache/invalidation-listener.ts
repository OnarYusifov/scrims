import { onRealtimeEvent } from '../events/app-events';
import {
  invalidateMatchLists,
  invalidateMatchSnapshot,
  refreshMatchSnapshot,
} from './match-cache';

let registered = false;

export function registerCacheInvalidationListeners() {
  if (registered) return;
  registered = true;

  onRealtimeEvent('match:created', async ({ matchId }) => {
    await invalidateMatchLists().catch(() => undefined);
    if (matchId) {
      await refreshMatchSnapshot(matchId).catch(() => undefined);
    }
  });

  onRealtimeEvent('match:updated', async ({ matchId }) => {
    await invalidateMatchLists().catch(() => undefined);
    if (matchId) {
      await refreshMatchSnapshot(matchId).catch(() => undefined);
    }
  });

  onRealtimeEvent('match:deleted', async ({ matchId }) => {
    await invalidateMatchLists().catch(() => undefined);
    if (matchId) {
      await invalidateMatchSnapshot(matchId).catch(() => undefined);
    }
  });
}




