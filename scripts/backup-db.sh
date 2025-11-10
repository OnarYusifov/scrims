#!/usr/bin/env bash

# Simple pg_dump wrapper for manual backups.
# Usage: ./scripts/backup-db.sh [output-directory]

set -euo pipefail

OUTPUT_DIR=${1:-backups}
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL must be set in the environment (e.g. export before running)."
  exit 1
fi

mkdir -p "${OUTPUT_DIR}"

FILE_PATH="${OUTPUT_DIR}/trayb_customs_${TIMESTAMP}.dump"

echo "Creating PostgreSQL backup at ${FILE_PATH}"
pg_dump \
  --format=custom \
  --no-owner \
  --file "${FILE_PATH}" \
  "${DATABASE_URL}"

echo "Backup complete."
echo "Tip: upload to object storage (e.g., aws s3 cp ${FILE_PATH} s3://trayb-backups/dev/)"



