-- Verification script to ensure anonymization succeeded.
-- Exits with an error if any sensitive fields remain.

DO $$
DECLARE
  bad_email_count integer;
  bad_discord_count integer;
  ip_count integer;
  payload_count integer;
BEGIN
  SELECT COUNT(*) INTO bad_email_count
  FROM "User"
  WHERE "email" IS NOT NULL
    AND "email" NOT LIKE 'player_%@example.com';

  IF bad_email_count > 0 THEN
    RAISE EXCEPTION 'Verification failed: % unsanitized emails detected', bad_email_count;
  END IF;

  SELECT COUNT(*) INTO bad_discord_count
  FROM "User"
  WHERE "discordId" NOT LIKE 'discord_%';

  IF bad_discord_count > 0 THEN
    RAISE EXCEPTION 'Verification failed: % unsanitized discord IDs detected', bad_discord_count;
  END IF;

  SELECT COUNT(*) INTO ip_count
  FROM "AuditLog"
  WHERE "ipAddress" IS NOT NULL;

  IF ip_count > 0 THEN
    RAISE EXCEPTION 'Verification failed: % audit log IP addresses remain', ip_count;
  END IF;

  SELECT COUNT(*) INTO payload_count
  FROM "MatchStatsSubmission"
  WHERE COALESCE("payload"->>'redacted', 'false') <> 'true';

  IF payload_count > 0 THEN
    RAISE EXCEPTION 'Verification failed: % match submission payloads not redacted', payload_count;
  END IF;

  RAISE NOTICE 'All anonymization checks passed.';
END $$;


