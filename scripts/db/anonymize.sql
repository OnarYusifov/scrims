-- Data anonymization script for shadow databases.
-- Run after restoring a production dump into the SHADOW database.
-- Idempotent: safe to run multiple times.

DO $$
BEGIN
  RAISE NOTICE 'Starting anonymization at %', clock_timestamp();
END $$;

WITH anon_users AS (
  SELECT
    id,
    CONCAT('player_', SUBSTRING(id, 1, 8))                     AS new_username,
    CONCAT('discord_', SUBSTRING(md5(id), 1, 12))              AS new_discord_id,
    LPAD((ROW_NUMBER() OVER (ORDER BY id))::text, 4, '0')      AS new_discriminator,
    CONCAT('player_', SUBSTRING(md5(id), 9, 12), '@example.com') AS new_email
  FROM "User"
)
UPDATE "User" u
SET
  "username" = anon.new_username,
  "discordId" = anon.new_discord_id,
  "discriminator" = anon.new_discriminator,
  "email" = anon.new_email,
  "avatar" = NULL,
  "lastLogin" = NULL
FROM anon_users anon
WHERE u.id = anon.id;

-- Wipe audit log IP addresses & optional user IDs where not required.
UPDATE "AuditLog"
SET
  "ipAddress" = NULL,
  "userId" = NULL
WHERE TRUE;

-- Remove high-risk payloads from submissions (retain metadata only).
UPDATE "MatchStatsSubmission"
SET
  "payload" = jsonb_build_object('redacted', true),
  "notes" = NULL
WHERE "payload" IS NOT NULL;

-- Drop access tokens / sensitive Discord IDs from team members (if present).
UPDATE "TeamMember"
SET
  "joinedAt" = NOW() - INTERVAL '1 day' * (RANDOM() * 30);

-- Normalize audit log details to mitigate accidental leakage.
UPDATE "AuditLog"
SET
  "details" = NULL
WHERE "details" IS NOT NULL;

-- Repack analyze for better query plans on anonymized data.
ANALYZE;

DO $$
BEGIN
  RAISE NOTICE 'Anonymization complete at %', clock_timestamp();
END $$;


