-- CreateEnum
CREATE TYPE "PlayerRoleType" AS ENUM ('organizer', 'admin', 'moderator', 'competitor', 'viewer');

-- CreateEnum
CREATE TYPE "PlayerBanStatus" AS ENUM ('active', 'lifted', 'expired');

-- CreateEnum
CREATE TYPE "PlayerBanType" AS ENUM ('temporary', 'permanent');

-- CreateEnum
CREATE TYPE "PlayerAuditAction" AS ENUM ('role_change', 'ban', 'unban', 'note');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active';

-- CreateTable
CREATE TABLE "player_roles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "PlayerRoleType" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "assignedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_bans" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "PlayerBanStatus" NOT NULL DEFAULT 'active',
    "type" "PlayerBanType" NOT NULL,
    "reason" TEXT NOT NULL,
    "durationDays" INTEGER,
    "banFromAllHubs" BOOLEAN NOT NULL DEFAULT true,
    "banFromDiscord" BOOLEAN NOT NULL DEFAULT false,
    "bannedBy" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "liftedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_bans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "PlayerAuditAction" NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "player_roles_userId_role_key" ON "player_roles"("userId", "role");

-- CreateIndex
CREATE INDEX "player_bans_userId_status_idx" ON "player_bans"("userId", "status");

-- CreateIndex
CREATE INDEX "player_audit_logs_userId_createdAt_idx" ON "player_audit_logs"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "player_roles" ADD CONSTRAINT "player_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_roles" ADD CONSTRAINT "player_roles_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_bans" ADD CONSTRAINT "player_bans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_bans" ADD CONSTRAINT "player_bans_bannedBy_fkey" FOREIGN KEY ("bannedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_audit_logs" ADD CONSTRAINT "player_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_audit_logs" ADD CONSTRAINT "player_audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
