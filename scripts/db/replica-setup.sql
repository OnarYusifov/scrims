-- Replica & Read-Only Role Setup for TRAYB Customs
-- Run these statements on the PRIMARY database (with superuser privileges).

-- 1. Create a dedicated login role for read-only access.
CREATE ROLE trayb_readonly LOGIN PASSWORD 'replace-with-strong-password';

-- 2. Ensure the role never gains write permissions.
ALTER ROLE trayb_readonly SET default_transaction_read_only = on;
ALTER ROLE trayb_readonly SET statement_timeout = '60s';

-- 3. Grant access to the application database & schema.
GRANT CONNECT ON DATABASE trayb_customs TO trayb_readonly;
GRANT USAGE ON SCHEMA public TO trayb_readonly;

-- 4. Grant SELECT on all existing tables/views and future ones.
GRANT SELECT ON ALL TABLES IN SCHEMA public TO trayb_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO trayb_readonly;

-- 5. Prevent sequence misuse (read-only role can still SELECT next values if needed).
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO trayb_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO trayb_readonly;

-- 6. (Optional) Create a replication slot if managing streaming replication manually.
-- SELECT * FROM pg_create_physical_replication_slot('trayb_read_replica');

-- Configure your managed service (e.g., RDS read replica or Cloud SQL replica)
-- to expose a replica endpoint and bind it to the trayb_readonly credentials.

-- 7. Audit helper: list current grants for verification.
-- \du trayb_readonly
-- \z public.*



