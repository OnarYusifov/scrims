import { SeriesType } from '@prisma/client';
import { prisma } from '../index';

type MetricKey =
  | 'acs'
  | 'damageDelta'
  | 'kda'
  | 'firstKills'
  | 'kast'
  | 'adr'
  | 'multiKills'
  | 'firstDeaths'
  | 'headshotPercent'
  | 'kills';

interface BandMetrics {
  mean: Record<MetricKey, number>;
  std: Record<MetricKey, number>;
  sampleSize: number;
}

export interface EloPlayerStats {
  userId: string;
  teamId?: string;
  kills: number;
  deaths: number;
  assists: number;
  acs: number;
  adr: number;
  headshotPercent?: number | null;
  firstKills?: number | null;
  firstDeaths?: number | null;
  kast?: number | null;
  multiKills?: number | null;
  damageDelta?: number | null;
}

export interface PlayerSnapshot {
  id: string;
  elo: number;
  matchesPlayed: number;
  isCalibrating: boolean;
  peakElo: number;
}

export interface PerformanceEvaluation {
  rawPerformance: number;
  baseMultiplier: number;
  multiplier: number;
  penalties: string[];
}

export interface EloComputationParams {
  player: PlayerSnapshot;
  matchId: string;
  seriesType: SeriesType;
  won: boolean;
  opponentAverageElo: number;
  teamAverageElo: number;
  teamEloDiff: number;
  performanceMultiplier: number;
  rawPerformance: number;
  teamMultiplier: number;
  streakBonus?: number;
}

export interface EloComputationResult {
  oldElo: number;
  newElo: number;
  change: number;
  kFactor: number;
  expectedScore: number;
  actualScore: number;
  performanceMultiplier: number;
  teamMultiplier: number;
  rawPerformance: number;
  matchesPlayed: number;
}

const BAND_RANGE = 200;
const BAND_SAMPLE = 500;
const BAND_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const DEFAULT_METRICS: Record<MetricKey, number> = {
  acs: 250,
  damageDelta: 20,
  kda: 1.1,
  firstKills: 2,
  kast: 70,
  adr: 140,
  multiKills: 3,
  firstDeaths: 2,
  headshotPercent: 25,
  kills: 18,
};

const DEFAULT_STD: Record<MetricKey, number> = {
  acs: 35,
  damageDelta: 25,
  kda: 0.4,
  firstKills: 1.5,
  kast: 10,
  adr: 20,
  multiKills: 1,
  firstDeaths: 1.5,
  headshotPercent: 8,
  kills: 4,
};

const PERFORMANCE_MULTIPLIER_BANDS: Array<{ min: number; multiplier: number }> = [
  { min: 70, multiplier: 1.3 },
  { min: 55, multiplier: 1.15 },
  { min: 45, multiplier: 1.0 },
  { min: 30, multiplier: 0.85 },
  { min: 0, multiplier: 0.7 },
];

const MAX_CHANGE_BY_K: Record<number, number> = {
  50: 65,
  32: 42,
  24: 32,
  16: 26,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function calculateMean(values: number[]): number {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function calculateStd(values: number[], mean: number): number {
  if (!values.length) {
    return 0;
  }
  const variance =
    values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) /
    values.length;
  return Math.sqrt(variance);
}

export class EloService {
  private readonly CALIBRATION_MATCHES = 10;
  private readonly START_RATING = 800;

  private bandCache = new Map<
    string,
    { metrics: BandMetrics; expires: number }
  >();

  private getBandKey(elo: number): string {
    const min = Math.max(0, Math.floor(elo - BAND_RANGE));
    const max = Math.floor(elo + BAND_RANGE);
    return `${min}-${max}`;
  }

  private normalizeScore(
    value: number,
    mean: number,
    std: number,
  ): number {
    if (!Number.isFinite(value)) {
      return 50;
    }
    if (std <= 0.0001) {
      return 50;
    }
    const z = (value - mean) / std;
    return clamp(50 + z * 10, 0, 100);
  }

  private computeKda(kills: number, assists: number, deaths: number): number {
    const denominator = Math.max(1, deaths);
    const kda = (kills + assists * 0.5) / denominator;
    return Math.min(5, kda);
  }

  private async fetchBandMetrics(elo: number): Promise<BandMetrics> {
    const key = this.getBandKey(elo);
    const cached = this.bandCache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.metrics;
    }

    const minElo = Math.max(0, Math.floor(elo - BAND_RANGE));
    const maxElo = Math.floor(elo + BAND_RANGE);

    let records = await prisma.playerMatchStats.findMany({
      where: {
        user: {
          elo: {
            gte: minElo,
            lte: maxElo,
          },
        },
      },
      select: {
        kills: true,
        deaths: true,
        assists: true,
        acs: true,
        adr: true,
        headshotPercent: true,
        firstKills: true,
        firstDeaths: true,
        kast: true,
        multiKills: true,
        damageDelta: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: BAND_SAMPLE,
    });

    if (records.length < 25) {
      records = await prisma.playerMatchStats.findMany({
        select: {
          kills: true,
          deaths: true,
          assists: true,
          acs: true,
          adr: true,
          headshotPercent: true,
          firstKills: true,
          firstDeaths: true,
          kast: true,
          multiKills: true,
          damageDelta: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: BAND_SAMPLE,
      });
    }

    if (!records.length) {
      return {
        mean: { ...DEFAULT_METRICS },
        std: { ...DEFAULT_STD },
        sampleSize: 0,
      };
    }

    const metricsValues: Record<MetricKey, number[]> = {
      acs: [],
      damageDelta: [],
      kda: [],
      firstKills: [],
      kast: [],
      adr: [],
      multiKills: [],
      firstDeaths: [],
      headshotPercent: [],
      kills: [],
    };

    for (const record of records) {
      metricsValues.acs.push(record.acs ?? DEFAULT_METRICS.acs);
      metricsValues.damageDelta.push(record.damageDelta ?? DEFAULT_METRICS.damageDelta);
      metricsValues.kda.push(
        this.computeKda(record.kills ?? 0, record.assists ?? 0, record.deaths ?? 0),
      );
      metricsValues.firstKills.push(record.firstKills ?? DEFAULT_METRICS.firstKills);
      metricsValues.kast.push(record.kast ?? DEFAULT_METRICS.kast);
      metricsValues.adr.push(record.adr ?? DEFAULT_METRICS.adr);
      metricsValues.multiKills.push(record.multiKills ?? DEFAULT_METRICS.multiKills);
      metricsValues.firstDeaths.push(record.firstDeaths ?? DEFAULT_METRICS.firstDeaths);
      metricsValues.headshotPercent.push(
        record.headshotPercent ?? DEFAULT_METRICS.headshotPercent,
      );
      metricsValues.kills.push(record.kills ?? DEFAULT_METRICS.kills);
    }

    const mean: Record<MetricKey, number> = { ...DEFAULT_METRICS };
    const std: Record<MetricKey, number> = { ...DEFAULT_STD };

    (Object.keys(metricsValues) as MetricKey[]).forEach((metric) => {
      const meanValue = calculateMean(metricsValues[metric]);
      mean[metric] = Number.isFinite(meanValue) ? meanValue : DEFAULT_METRICS[metric];
      const stdValue = calculateStd(metricsValues[metric], mean[metric]);
      std[metric] = stdValue > 0 ? stdValue : DEFAULT_STD[metric];
    });

    const metrics: BandMetrics = {
      mean,
      std,
      sampleSize: records.length,
    };

    this.bandCache.set(key, {
      metrics,
      expires: Date.now() + BAND_CACHE_TTL,
    });

    return metrics;
  }

  async getBandMetrics(elo: number): Promise<BandMetrics> {
    return this.fetchBandMetrics(elo);
  }

  evaluatePerformance(
    stats: EloPlayerStats,
    band: BandMetrics,
    isTopTwoAcs: boolean,
  ): PerformanceEvaluation {
    const penalties: string[] = [];
    const kills = stats.kills ?? 0;
    const deaths = stats.deaths ?? 0;
    const assists = stats.assists ?? 0;
    const acs = stats.acs ?? band.mean.acs;
    const adr = stats.adr ?? band.mean.adr;
    const damageDelta = stats.damageDelta ?? band.mean.damageDelta;
    const kast = stats.kast ?? band.mean.kast;
    const firstKills = stats.firstKills ?? band.mean.firstKills;
    const firstDeaths = stats.firstDeaths ?? band.mean.firstDeaths;
    const multiKills = stats.multiKills ?? band.mean.multiKills;
    const headshotPercent = stats.headshotPercent ?? band.mean.headshotPercent;

    const kda = this.computeKda(kills, assists, deaths);

    const acsScore = this.normalizeScore(acs, band.mean.acs, band.std.acs);
    const damageDeltaScore = this.normalizeScore(
      damageDelta,
      band.mean.damageDelta,
      band.std.damageDelta,
    );
    const kdaScore = this.normalizeScore(kda, band.mean.kda, band.std.kda);
    const firstKillScore = this.normalizeScore(
      firstKills,
      band.mean.firstKills,
      band.std.firstKills,
    );
    const kastScore = this.normalizeScore(kast, band.mean.kast, band.std.kast);
    const adrScore = this.normalizeScore(adr, band.mean.adr, band.std.adr);
    const multiKillScore = this.normalizeScore(
      multiKills,
      band.mean.multiKills,
      band.std.multiKills,
    );

    let rawPerformance =
      acsScore * 0.2 +
      damageDeltaScore * 0.15 +
      kdaScore * 0.15 +
      firstKillScore * 0.1 +
      kastScore * 0.15 +
      adrScore * 0.1 +
      multiKillScore * 0.05;

    const firstDeathScore = this.normalizeScore(
      firstDeaths,
      band.mean.firstDeaths,
      band.std.firstDeaths,
    );

    if (firstDeathScore > 60) {
      rawPerformance -= 5;
      penalties.push('first-death');
    } else if (firstDeathScore > 50) {
      rawPerformance -= 2.5;
      penalties.push('first-death-light');
    }

    if (headshotPercent >= 30) {
      rawPerformance += 5;
      penalties.push('headshot-bonus');
    }

    rawPerformance = clamp(rawPerformance, 0, 100);

    const baseMultiplier =
      PERFORMANCE_MULTIPLIER_BANDS.find((bandDef) => rawPerformance >= bandDef.min)
        ?.multiplier ?? 1.0;

    let multiplier = baseMultiplier;

    if (isTopTwoAcs && kast < 60) {
      multiplier = Math.max(0.7, multiplier - 0.15);
      penalties.push('stat-padding');
    }

    if (damageDelta < 0 && kills >= band.mean.kills) {
      multiplier = Math.max(0.7, multiplier - 0.1);
      penalties.push('negative-damage');
    }

    return {
      rawPerformance,
      baseMultiplier,
      multiplier,
      penalties,
    };
  }

  getTeamMultiplier(teamEloDiff: number, won: boolean): number {
    if (won) {
      if (teamEloDiff > 100) return 0.85;
      if (teamEloDiff < -100) return 1.15;
      return 1.0;
    }

    if (teamEloDiff > 100) return 1.15;
    if (teamEloDiff < -100) return 0.85;
    return 1.0;
  }

  private getKFactor(player: PlayerSnapshot): number {
    if (player.matchesPlayed < this.CALIBRATION_MATCHES) {
      return 50;
    }
    if (player.elo < 1200) {
      return 32;
    }
    if (player.elo < 1800) {
      return 24;
    }
    return 16;
  }

  private getExpectedScore(playerElo: number, opponentAvgElo: number): number {
    return 1 / (1 + Math.pow(10, (opponentAvgElo - playerElo) / 400));
  }

  async calculateEloChange(params: EloComputationParams): Promise<EloComputationResult> {
    const {
      player,
      matchId,
      seriesType,
      won,
      opponentAverageElo,
      performanceMultiplier,
      rawPerformance,
      teamMultiplier,
      streakBonus = 0,
    } = params;

    const actualScore = won ? 1 : 0;
    const expectedScore = this.getExpectedScore(player.elo, opponentAverageElo);
    const kFactor = this.getKFactor(player);

    const baseChange =
      kFactor * (actualScore - expectedScore) * performanceMultiplier * teamMultiplier;

    const delta = baseChange + streakBonus;
    const maxDelta = MAX_CHANGE_BY_K[kFactor] ?? 42;
    const finalChange = clamp(Math.round(delta), -maxDelta, maxDelta);
    const newElo = Math.max(0, player.elo + finalChange);
    const newMatchesPlayed = player.matchesPlayed + 1;
    const stillCalibrating = newMatchesPlayed < this.CALIBRATION_MATCHES;

    await prisma.user.update({
      where: { id: player.id },
      data: {
        elo: newElo,
        peakElo: Math.max(player.peakElo, newElo),
        matchesPlayed: newMatchesPlayed,
        isCalibrating: stillCalibrating,
      },
    });

    await prisma.eloHistory.create({
      data: {
        userId: player.id,
        matchId,
        oldElo: player.elo,
        newElo,
        change: finalChange,
        kFactor,
        won,
        seriesType,
        expectedScore,
        actualScore,
        performanceMultiplier,
        teamMultiplier,
        rawPerformance,
      },
    });

    return {
      oldElo: player.elo,
      newElo,
      change: finalChange,
      kFactor,
      expectedScore,
      actualScore,
      performanceMultiplier,
      teamMultiplier,
      rawPerformance,
      matchesPlayed: newMatchesPlayed,
    };
  }

  calculateRating(
    rawPerformance: number,
    performanceMultiplier: number,
    teamMultiplier: number,
    eloChange?: number,
  ): number {
    const base = 1 + (rawPerformance - 50) / 150;
    const perfAdjust = base * (1 + (performanceMultiplier - 1) * 0.2);
    const teamAdjust = perfAdjust * (1 + (teamMultiplier - 1) * 0.15);
    const eloAdjust = eloChange !== undefined
      ? teamAdjust + clamp(eloChange / 120, -0.08, 0.08)
      : teamAdjust;
    return Number(clamp(Number(eloAdjust.toFixed(3)), 0.5, 1.6));
  }

  getRankBadge(elo: number): { name: string; color: string; icon: string } {
    if (elo >= 2000) return { name: 'God', color: '#ff4655', icon: '👑' };
    if (elo >= 1850) return { name: 'Ruby', color: '#e6194b', icon: '⚡' };
    if (elo >= 1700) return { name: 'Emerald', color: '#3cb44b', icon: '✨' };
    if (elo >= 1500) return { name: 'Diamond', color: '#4363d8', icon: '💎' };
    if (elo >= 1300) return { name: 'Platinum', color: '#f58231', icon: '🔷' };
    if (elo >= 1100) return { name: 'Gold', color: '#e6194b', icon: '🔶' };
    if (elo >= 800) return { name: 'Silver', color: '#ffe119', icon: '▪️' };
    if (elo >= 500) return { name: 'Bronze', color: '#fabed4', icon: '▫️' };
    return { name: 'Wood', color: '#b5651d', icon: '🪵' };
  }
}

export const eloService = new EloService();

