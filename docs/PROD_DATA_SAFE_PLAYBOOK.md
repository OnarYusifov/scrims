# Production Data Safe-Use Playbook (2025-11)

This playbook defines how engineering teams safely consume production data for debugging, load testing, and local reproduction—without exposing PII or destabilizing live systems. It builds on the infrastructure roadmap already captured in `docs/SCALING_MONITORING_DR.md` and the risk register in `docs/OPEN_RISKS_ACTIONS.md`.

---

## 1. Topology & Roles

### 1.1 Replica Layout
- **Primary**: managed Postgres (production write node).
- **Read Replica**: managed read-only endpoint (`PROD_REPLICA_URL`) using the `trayb_readonly` login.
- **Shadow DB**: developer/staging database seeded with anonymized data (`SHADOW_DATABASE_URL`).

Replica creation and the read-only role are scripted in `scripts/db/replica-setup.sql`. Required infra actions:
1. Provision a managed replica (RDS read replica / Cloud SQL read replica).
2. Apply the SQL grants (superuser on primary required).
3. Store replica URL + credentials in your secret manager (`PROD_REPLICA_URL`).
4. Enforce read-only: `ALTER ROLE trayb_readonly SET default_transaction_read_only = on`.

### 1.2 Access Control
- Only platform/infra engineers receive direct replica credentials.
- Application and CI pipelines consume replica data via the anonymized sync scripts (never raw).
- Audit every credential checkout in the incident log (`/docs/incident-logs/`).

---

## 2. Sanitized Shadow Sync

### 2.1 Script Workflow
```
PROD_REPLICA_URL=postgres://readonly@replica/trayb_customs \
SHADOW_DATABASE_URL=postgres://dev@localhost/trayb_shadow \
./scripts/db/sync-anonymized.sh
```

Steps performed:
1. `pg_dump` from the read replica (no owners/privileges).
2. `pg_restore` into the target shadow DB (drops existing objects).
3. `scripts/db/anonymize.sql` masks user identifiers, emails, IPs, and submission payloads.
4. `scripts/db/verify_shadow.sql` ensures the mask succeeded (fails fast if sensitive values remain).
5. Logs land in `logs/data-sync/shadow-sync-<timestamp>.log` for auditing.

### 2.2 Anonymization Rules
- `User`: usernames -> `player_xxxx`, emails -> `player_x@example.com`, Discord IDs masked, avatars cleared.
- `AuditLog`: `userId` & `ipAddress` nulled, `details` removed.
- `MatchStatsSubmission.payload`: replaced with `{ "redacted": true }`.
- Timestamps jittered where necessary to avoid inference.

Add additional transforms in `scripts/db/anonymize.sql` as models evolve.

### 2.3 Guardrails
- Script refuses to run without both `PROD_REPLICA_URL` and `SHADOW_DATABASE_URL`.
- Output logged for review; store the directory in your backup plan.
- Optional allow-list: set `LOADTEST_ALLOWED_HOSTS` to limit load tests/shadow sync to staging hosts.

---

## 3. Load Testing Harness

### 3.1 Tooling
- Harness powered by [`autocannon`](https://github.com/mcollina/autocannon).
- Configuration: `loadtest/scenario.json`.
- Entry point: `npm run loadtest` (uses `scripts/loadtest/run-loadtest.cjs`).

Sample usage:
```
LOADTEST_BASE_URL=https://staging.api.customs.trayb.az \
LOADTEST_ALLOWED_HOSTS=staging.api.customs.trayb.az \
LOADTEST_BEARER=$(cat ~/.trayb/tokens/staging-api.txt) \
npm run loadtest
```

Safety checks:
- Blocks execution when `NODE_ENV=production` unless `LOADTEST_ALLOW_PROD=true`.
- Verifies hostname against `LOADTEST_ALLOWED_HOSTS` (comma-separated list).
- Persists results to `loadtest/results/autocannon-<timestamp>.json`.
- Supports assertions (e.g., no 5xx/timeout) defined in the scenario.

Customize the scenario per test plan; include high-frequency endpoints and mutation flows once safe service accounts are available.

### 3.2 Test Data Expectations
- Load tests should run against the sanitized shadow DB (or staging) to ensure PII safety.
- Before running, refresh the shadow DB via `sync-anonymized.sh` to align stats/leaderboards.
- For realistic match payloads, seed fixture data post-anonymization if needed (document in `loadtest/fixtures/`).

---

## 4. Config & Developer Workflow

### 4.1 Environment Vars
| Variable | Purpose | Location |
| --- | --- | --- |
| `PROD_REPLICA_URL` | Read-only replica connection string | secrets / CI |
| `SHADOW_DATABASE_URL` | Local/staging shadow DB target | local `.env`, CI |
| `LOADTEST_BASE_URL` | Base URL under test | local/CI |
| `LOADTEST_ALLOWED_HOSTS` | Host allow-list for load tests | local/CI |
| `LOADTEST_BEARER` | Optional bearer token for authenticated endpoints | local/CI |
| `LOADTEST_ALLOW_PROD` | Explicit override to hit prod (default blocked) | only when approved |

`setup-env.sh` forwards these variables into `apps/backend/.env` for local usage.

### 4.2 Developer Commands
| Task | Command |
| --- | --- |
| Refresh shadow DB | `PROD_REPLICA_URL=... SHADOW_DATABASE_URL=... ./scripts/db/sync-anonymized.sh` |
| Run load test | `npm run loadtest` |
| Inspect load test logs | `ls loadtest/results/` |
| Verify anonymization state manually | `psql $SHADOW_DATABASE_URL -f scripts/db/verify_shadow.sql` |

Make sure developers understand the data-handling policy; update onboarding docs accordingly.

---

## 5. Auditing & Reviews

| Cadence | Activity | Owner |
| --- | --- | --- |
| Weekly | Review `logs/data-sync/` for unexpected sync runs | Platform |
| Monthly | Verify shadow DB still anonymizes correctly (run verify script) | Backend |
| Quarterly | Conduct load test against staging before seasonal peaks | Platform + App teams |
| Quarterly | Update `docs/OPEN_RISKS_ACTIONS.md` with status of replica/backups | Platform |

During each audit, confirm:
- Replica credentials are rotated per security policy.
- Backup automation (PITR) remains operational (see open risk tracker).
- No developer machines store raw dumps (enforce auto-cleanup via script if needed).

---

## 6. Open Risks & Follow-ups

Refer to `docs/OPEN_RISKS_ACTIONS.md` (items: backup automation, PgBouncer/managed Redis, test coverage). Any change that alters replica usage or anonymization must update that tracker and this playbook.

If `sync-anonymized.sh` or load tests fail verification, stop immediately, escalate in `#infra-alerts`, and log the incident in `/docs/incident-logs/<date>.md`.

---

## 7. Operational Handoffs

- **Platform/Infra**: maintain replica endpoint, ensure `/metrics` protection before Prometheus rollout, manage backup automation.
- **Backend Team**: maintain anonymization SQL, extend verification checks as schema evolves.
- **App Teams**: provide load-test scenarios for new features, ensure auth tokens used in load tests are scoped minimally.
- **Security**: review anonymization rules annually and after major schema changes.

Keep this document in sync with architecture changes. PRs modifying scripts or env guardrails must update the playbook and ping @platform-team for review.


