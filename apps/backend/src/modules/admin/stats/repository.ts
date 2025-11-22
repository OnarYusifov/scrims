import { prisma } from "@trayb/db";
import type { Prisma } from "@trayb/db";

const matchAnalyticsSelect = {
  id: true,
  map: true,
  winner: true,
  roundsPlayed: true,
  durationSeconds: true,
  startedAt: true,
  endedAt: true,
  createdAt: true,
  players: {
    select: {
      userId: true,
      ratingDelta: true,
      kills: true,
      acs: true,
      user: {
        select: {
          username: true,
        },
      },
    },
  },
} satisfies Prisma.MatchSelect;

export type MatchAnalyticsRow = Prisma.MatchGetPayload<{
  select: typeof matchAnalyticsSelect;
}>;

export interface AdminStatsRepository {
  findMatches(where: Prisma.MatchWhereInput): Promise<MatchAnalyticsRow[]>;
  findMatchPlayers(
    where: Prisma.MatchPlayerWhereInput
  ): Promise<Array<{ userId: string }>>;
  findEloSnapshots(
    where: Prisma.PlayerEloHistoryWhereInput
  ): Promise<Array<{ rating: number }>>;
  countUsers(where?: Prisma.UserWhereInput): Promise<number>;
  countPlayerBans(where: Prisma.PlayerBanWhereInput): Promise<number>;
}

export const adminStatsRepository: AdminStatsRepository = {
  findMatches(where) {
    return prisma.match.findMany({
      where,
      select: matchAnalyticsSelect,
      orderBy: { startedAt: "desc" },
    });
  },
  findMatchPlayers(where) {
    return prisma.matchPlayer.findMany({
      where,
      select: { userId: true },
      distinct: ["userId"],
    });
  },
  findEloSnapshots(where) {
    return prisma.playerEloHistory.findMany({
      where,
      orderBy: { recordedAt: "desc" },
      distinct: ["userId"],
      select: { rating: true },
    });
  },
  countUsers(where) {
    return prisma.user.count({ where });
  },
  countPlayerBans(where) {
    return prisma.playerBan.count({ where });
  },
};
