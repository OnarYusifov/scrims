#!/usr/bin/env bash

# Synchronize a sanitized snapshot of the production replica into a local shadow database.
# Requires:
#   PROD_REPLICA_URL - connection string for read-only production replica
#   SHADOW_DATABASE_URL - connection string for local/staging shadow database
#
# Optional:
#   OUTPUT_DIR - directory to store audit logs (default: loadtest/results)
#
# Usage:
#   PROD_REPLICA_URL=postgres://... SHADOW_DATABASE_URL=postgres://... ./scripts/db/sync-anonymized.sh

set -euo pipefail

if [[ -z "${PROD_REPLICA_URL:-}" ]]; then
  echo "❌ PROD_REPLICA_URL must be set before running this script." >&2
  exit 1
fi

if [[ -z "${SHADOW_DATABASE_URL:-}" ]]; then
  echo "❌ SHADOW_DATABASE_URL must be set before running this script." >&2
  exit 1
fi

OUTPUT_DIR=${OUTPUT_DIR:-"logs/data-sync"}
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
mkdir -p "${OUTPUT_DIR}"

LOG_FILE="${OUTPUT_DIR}/shadow-sync-${TIMESTAMP}.log"
touch "${LOG_FILE}"

echo "🌀 Starting sanitized sync at ${TIMESTAMP}" | tee -a "${LOG_FILE}"

WORK_DIR=$(mktemp -d)
cleanup() {
  rm -rf "${WORK_DIR}"
}
trap cleanup EXIT

DUMP_FILE="${WORK_DIR}/replica.dump"

echo "📥 Dumping replica (no owners/privileges)..." | tee -a "${LOG_FILE}"
pg_dump \
  --no-owner \
  --no-privileges \
  --format=custom \
  --file "${DUMP_FILE}" \
  "${PROD_REPLICA_URL}"

echo "🗑️ Dropping existing objects in shadow database..." | tee -a "${LOG_FILE}"
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --dbname="${SHADOW_DATABASE_URL}" \
  "${DUMP_FILE}"

ANON_SCRIPT="$(dirname "$0")/anonymize.sql"
VERIFY_SCRIPT="$(dirname "$0")/verify_shadow.sql"

echo "🛡️ Applying anonymization script..." | tee -a "${LOG_FILE}"
psql "${SHADOW_DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${ANON_SCRIPT}" | tee -a "${LOG_FILE}"

echo "🔍 Running verification checks..." | tee -a "${LOG_FILE}"
psql "${SHADOW_DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${VERIFY_SCRIPT}" | tee -a "${LOG_FILE}"

echo "✅ Shadow database refreshed and sanitized. Log: ${LOG_FILE}"


