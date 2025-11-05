import { PrismaClient, SeriesType } from '@prisma/client';

const prisma = new PrismaClient();

interface EloCalculationParams {
  userId: string;
  matchId: string;
  won: boolean;
  seriesType: SeriesType;
  opponentAvgElo: number;
}

interface EloResult {
  oldElo: number;
  newElo: number;
  change: number;
  kFactor: number;
}

export class EloService {
  // Configuration (can be moved to environment variables)
  private readonly START_RATING = parseInt(process.env.ELO_START_RATING || '800');
  private readonly CALIBRATION_MATCHES = parseInt(process.env.ELO_CALIBRATION_MATCHES || '10');
  private readonly CALIBRATION_K = parseInt(process.env.ELO_CALIBRATION_K_FACTOR || '48');
  private readonly NORMAL_K = parseInt(process.env.ELO_NORMAL_K_FACTOR || '32');
  private readonly HIGH_ELO_K = parseInt(process.env.ELO_HIGH_ELO_K_FACTOR || '24');
  private readonly HIGH_ELO_THRESHOLD = parseInt(process.env.ELO_HIGH_ELO_THRESHOLD || '1600');
  private readonly MAX_CHANGE_PER_SERIES = parseInt(process.env.ELO_MAX_CHANGE_PER_SERIES || '150');

  /**
   * Calculate the K-factor based on player's current state
   */
  private getKFactor(user: { elo: number; matchesPlayed: number; isCalibrating: boolean }): number {
    if (user.isCalibrating && user.matchesPlayed < this.CALIBRATION_MATCHES) {
      return this.CALIBRATION_K;
    }
    if (user.elo >= this.HIGH_ELO_THRESHOLD) {
      return this.HIGH_ELO_K;
    }
    return this.NORMAL_K;
  }

  /**
   * Get series multiplier based on match type
   */
  private getSeriesMultiplier(seriesType: SeriesType): number {
    switch (seriesType) {
      case 'BO1':
        return 1.0;
      case 'BO3':
        return 1.3;
      case 'BO5':
        return 1.5;
      default:
        return 1.0;
    }
  }

  /**
   * Calculate expected score using Elo formula
   * Expected = 1 / (1 + 10^((opponentElo - playerElo) / 400))
   */
  private getExpectedScore(playerElo: number, opponentElo: number): number {
    return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  }

  /**
   * Calculate new Elo rating for a player after a match
   */
  async calculateElo(params: EloCalculationParams): Promise<EloResult> {
    const { userId, matchId, won, seriesType, opponentAvgElo } = params;

    // Get user's current Elo and stats
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { elo: true, matchesPlayed: true, isCalibrating: true, peakElo: true },
    });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const oldElo = user.elo;
    const kFactor = this.getKFactor(user);
    const seriesMultiplier = this.getSeriesMultiplier(seriesType);
    
    // Calculate expected score
    const expected = this.getExpectedScore(oldElo, opponentAvgElo);
    const actual = won ? 1 : 0;
    
    // Calculate Elo change
    let eloChange = Math.round(kFactor * seriesMultiplier * (actual - expected));
    
    // Apply per-series cap
    if (Math.abs(eloChange) > this.MAX_CHANGE_PER_SERIES) {
      eloChange = Math.sign(eloChange) * this.MAX_CHANGE_PER_SERIES;
    }
    
    const newElo = Math.max(0, oldElo + eloChange); // Elo can't go below 0
    
    // Update user's Elo and stats
    await prisma.user.update({
      where: { id: userId },
      data: {
        elo: newElo,
        peakElo: Math.max(user.peakElo, newElo),
        matchesPlayed: { increment: 1 },
        isCalibrating: user.matchesPlayed + 1 < this.CALIBRATION_MATCHES,
      },
    });

    // Record Elo history
    await prisma.eloHistory.create({
      data: {
        userId,
        matchId,
        oldElo,
        newElo,
        change: eloChange,
        kFactor,
        won,
        seriesType,
      },
    });

    return {
      oldElo,
      newElo,
      change: eloChange,
      kFactor,
    };
  }

  /**
   * Calculate team average Elo
   */
  async getTeamAverageElo(userIds: string[]): Promise<number> {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { elo: true },
    });

    if (users.length === 0) return this.START_RATING;

    const totalElo = users.reduce((sum, user) => sum + user.elo, 0);
    return Math.round(totalElo / users.length);
  }

  /**
   * Calculate Elo for all players in a match
   */
  async calculateMatchElo(matchId: string, winnerTeamId: string): Promise<void> {
    // Get match with teams and players
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        teams: {
          include: {
            members: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!match) {
      throw new Error(`Match ${matchId} not found`);
    }

    const winnerTeam = match.teams.find(t => t.id === winnerTeamId);
    const loserTeam = match.teams.find(t => t.id !== winnerTeamId);

    if (!winnerTeam || !loserTeam) {
      throw new Error('Could not identify winner and loser teams');
    }

    // Calculate average Elos
    const winnerUserIds = winnerTeam.members.map(m => m.userId);
    const loserUserIds = loserTeam.members.map(m => m.userId);

    const winnerAvgElo = await this.getTeamAverageElo(winnerUserIds);
    const loserAvgElo = await this.getTeamAverageElo(loserUserIds);

    // Calculate Elo for winners
    for (const member of winnerTeam.members) {
      await this.calculateElo({
        userId: member.userId,
        matchId,
        won: true,
        seriesType: match.seriesType,
        opponentAvgElo: loserAvgElo,
      });
    }

    // Calculate Elo for losers
    for (const member of loserTeam.members) {
      await this.calculateElo({
        userId: member.userId,
        matchId,
        won: false,
        seriesType: match.seriesType,
        opponentAvgElo: winnerAvgElo,
      });
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        action: 'ELO_CALCULATED',
        entity: 'Match',
        entityId: matchId,
        matchId,
        details: {
          winnerTeamId,
          winnerAvgElo,
          loserAvgElo,
        },
      },
    });
  }

  /**
   * Get Elo rank badge based on Elo rating
   */
  getRankBadge(elo: number): { name: string; color: string; icon: string } {
    if (elo >= 2000) return { name: 'Godlike', color: '#ff4655', icon: '👑' };
    if (elo >= 1800) return { name: 'Ruby', color: '#e6194b', icon: '⚡' };
    if (elo >= 1600) return { name: 'Emerald', color: '#3cb44b', icon: '✨' };
    if (elo >= 1400) return { name: 'Diamond', color: '#4363d8', icon: '💎' };
    if (elo >= 1200) return { name: 'Platinum', color: '#f58231', icon: '🔷' };
    if (elo >= 1000) return { name: 'Gold', color: '#e6194b', icon: '🔶' };
    if (elo >= 800) return { name: 'Silver', color: '#ffe119', icon: '▪️' };
    return { name: 'Bronze', color: '#fabed4', icon: '▫️' };
  }
}

export const eloService = new EloService();

