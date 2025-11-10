import { MatchStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  readJsonCache,
  writeJsonCache,
  invalidateTag,
  invalidateKeys,
} from './cache-utils';

const MATCH_LIST_TTL = parseInt(process.env.CACHE_MATCH_LIST_TTL ?? '15', 10);
const MATCH_SNAPSHOT_TTL = parseInt(process.env.CACHE_MATCH_SNAPSHOT_TTL ?? '30', 10);

const LIST_METRIC = 'match.list';
const SNAPSHOT_METRIC = 'match.snapshot';

const listTagKey = 'cache:match:list:keys';
const snapshotTag = (matchId: string) => `cache:match:${matchId}:keys`;

interface MatchListCacheParams {
  page: number;
  limit: number;
  status?: string;
}

const matchListKey = ({ page, limit, status }: MatchListCacheParams) =>
  `cache:match:list:${status ? status.toLowerCase() : 'all'}:p${page}:l${limit}`;

const matchSnapshotKey = (matchId: string) => `cache:match:${matchId}:snapshot`;

export async function getMatchListFromCache<T>(
  params: MatchListCacheParams,
): Promise<T | null> {
  return readJsonCache<T>(matchListKey(params), LIST_METRIC);
}

export async function setMatchListCache(
  params: MatchListCacheParams,
  payload: unknown,
): Promise<void> {
  await writeJsonCache(matchListKey(params), payload, {
    ttlSeconds: MATCH_LIST_TTL,
    tags: [listTagKey],
    metricPrefix: LIST_METRIC,
  });
}

export async function invalidateMatchLists(): Promise<void> {
  await invalidateTag(listTagKey, LIST_METRIC).catch(() => undefined);
}

export async function getMatchSnapshotFromCache<T>(matchId: string): Promise<T | null> {
  return readJsonCache<T>(matchSnapshotKey(matchId), SNAPSHOT_METRIC);
}

export async function setMatchSnapshotCache(matchId: string, payload: unknown): Promise<void> {
  await writeJsonCache(matchSnapshotKey(matchId), payload, {
    ttlSeconds: MATCH_SNAPSHOT_TTL,
    tags: [snapshotTag(matchId)],
    metricPrefix: SNAPSHOT_METRIC,
  });
}

export async function invalidateMatchSnapshot(matchId: string): Promise<void> {
  await invalidateTag(snapshotTag(matchId), SNAPSHOT_METRIC).catch(() => undefined);
}

export async function invalidateMultipleMatchSnapshots(matchIds: string[]): Promise<void> {
  if (!matchIds.length) return;
  const keys = matchIds.map(matchSnapshotKey);
  await invalidateKeys(keys, SNAPSHOT_METRIC);
}

export async function buildMatchSnapshot(matchId: string) {
  return prisma.match.findUnique({
    where: { id: matchId },
    include: {
      teams: {
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  discordId: true,
                  avatar: true,
                  elo: true,
                },
              },
            },
          },
        },
      },
      playerStats: {
        select: {
          userId: true,
          kills: true,
          deaths: true,
          assists: true,
          acs: true,
          adr: true,
          rating20: true,
          wpr: true,
          plusMinus: true,
        },
      },
      maps: {
        orderBy: { order: 'asc' },
      },
      winnerTeam: true,
    },
  });
}

export async function refreshMatchSnapshot(matchId: string): Promise<void> {
  const snapshot = await buildMatchSnapshot(matchId);
  if (!snapshot) {
    await invalidateMatchSnapshot(matchId);
    return;
  }

  await setMatchSnapshotCache(matchId, snapshot);
}

export async function fetchMatchesForCache(params: MatchListCacheParams) {
  const { page, limit, status } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.MatchWhereInput = {};
  if (status) {
    const normalized = status.toUpperCase() as MatchStatus;
    if (Object.values(MatchStatus).includes(normalized)) {
      where.status = normalized;
    }
  }

  const [matches, total] = await Promise.all([
    prisma.match.findMany({
      where,
      include: {
        teams: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    discordId: true,
                    avatar: true,
                    elo: true,
                  },
                },
              },
            },
            captain: {
              select: {
                id: true,
                username: true,
                discordId: true,
                avatar: true,
              },
            },
          },
        },
        maps: {
          orderBy: { order: 'asc' },
        },
        winnerTeam: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.match.count({ where }),
  ]);

  return {
    matches,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}


