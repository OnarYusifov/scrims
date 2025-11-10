import { prisma } from '../lib/prisma';
import { invalidateProfileSummaries } from '../cache/profile-cache';

export interface RecalculateUserTotalsOptions {
  invalidateCache?: boolean;
}

export async function recalculateUserTotals(
  userIds: string[],
  options: RecalculateUserTotalsOptions = { invalidateCache: true },
): Promise<void> {
  if (userIds.length === 0) return;

  await prisma.$transaction(async (tx) => {
    const totals = await tx.playerMatchStats.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds } },
      _sum: {
        kills: true,
        deaths: true,
        assists: true,
        acs: true,
        adr: true,
      },
    });

    const totalsMap = new Map<
      string,
      {
        kills?: number | null;
        deaths?: number | null;
        assists?: number | null;
        acs?: number | null;
        adr?: number | null;
      }
    >();

    for (const total of totals) {
      totalsMap.set(total.userId, total._sum);
    }

    for (const userId of userIds) {
      const sum = totalsMap.get(userId) ?? {};

      await tx.user.update({
        where: { id: userId },
        data: {
          totalKills: sum.kills ?? 0,
          totalDeaths: sum.deaths ?? 0,
          totalAssists: sum.assists ?? 0,
          totalACS: sum.acs ?? 0,
          totalADR: sum.adr ?? 0,
        },
      });
    }
  });

  if (options.invalidateCache) {
    await invalidateProfileSummaries(userIds);
  }
}




