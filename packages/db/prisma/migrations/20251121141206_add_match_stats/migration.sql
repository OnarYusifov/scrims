-- CreateEnum
CREATE TYPE "GameId" AS ENUM ('valorant', 'cs2');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('scheduled', 'live', 'completed', 'canceled');

-- CreateEnum
CREATE TYPE "MatchOutcome" AS ENUM ('alpha', 'bravo', 'draw');

-- CreateEnum
CREATE TYPE "MatchTeam" AS ENUM ('alpha', 'bravo');

-- CreateEnum
CREATE TYPE "MatchQueueType" AS ENUM ('ranked_global', 'ranked_private', 'unranked', 'scrim');

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "hubId" TEXT,
    "game" "GameId" NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'completed',
    "queueType" "MatchQueueType" NOT NULL DEFAULT 'ranked_global',
    "map" TEXT NOT NULL,
    "roundsPlayed" INTEGER NOT NULL DEFAULT 24,
    "winner" "MatchOutcome",
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchPlayer" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "team" "MatchTeam" NOT NULL,
    "ratingBefore" INTEGER,
    "ratingAfter" INTEGER,
    "ratingDelta" INTEGER,
    "kills" INTEGER,
    "deaths" INTEGER,
    "assists" INTEGER,
    "acs" INTEGER,
    "hsPercentage" DOUBLE PRECISION,
    "entryKills" INTEGER,
    "clutches" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerEloHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "game" "GameId" NOT NULL,
    "rating" INTEGER NOT NULL,
    "ratingDelta" INTEGER NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceMatchId" TEXT,

    CONSTRAINT "PlayerEloHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Match_externalId_key" ON "Match"("externalId");

-- CreateIndex
CREATE INDEX "Match_game_startedAt_idx" ON "Match"("game", "startedAt");

-- CreateIndex
CREATE INDEX "Match_hubId_idx" ON "Match"("hubId");

-- CreateIndex
CREATE INDEX "MatchPlayer_matchId_idx" ON "MatchPlayer"("matchId");

-- CreateIndex
CREATE INDEX "MatchPlayer_userId_matchId_idx" ON "MatchPlayer"("userId", "matchId");

-- CreateIndex
CREATE INDEX "PlayerEloHistory_userId_game_recordedAt_idx" ON "PlayerEloHistory"("userId", "game", "recordedAt");

-- AddForeignKey
ALTER TABLE "MatchPlayer" ADD CONSTRAINT "MatchPlayer_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchPlayer" ADD CONSTRAINT "MatchPlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerEloHistory" ADD CONSTRAINT "PlayerEloHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerEloHistory" ADD CONSTRAINT "PlayerEloHistory_sourceMatchId_fkey" FOREIGN KEY ("sourceMatchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;
