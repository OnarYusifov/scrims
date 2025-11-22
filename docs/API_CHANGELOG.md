# API Changelog

This document tracks all changes to the backend API to help frontend developers and other API consumers stay in sync.

## Format

Each entry includes:

- **Date**: When the change was made
- **Type**: `added`, `changed`, `deprecated`, `removed`, `fixed`
- **Endpoint**: Affected route
- **Description**: What changed and why
- **Migration**: How to update client code (if applicable)

---

## 2025-01-XX

### Added

- **Environment Variable Validation**
  - All environment variables are now validated at startup using Zod
  - Missing or invalid variables cause the server to fail fast with clear error messages
  - See `apps/backend/src/config/env.ts` for schema

- **Pino Logging**
  - Standardized logging via Pino with child loggers per module
  - Development: Pretty-printed logs
  - Production: JSON logs for aggregation
  - See `apps/backend/src/config/logger.ts` for usage

- **Shared Prisma Selectors**
  - Consolidated repeated Prisma selectors into `utils/prisma-selectors.ts`
  - Ensures consistency across modules
  - No API changes, internal improvement only

### Changed

- **Admin Players Module**
  - Repository now uses shared Prisma selectors
  - No breaking changes to API responses

---

## Future Changes

This section will be updated as API changes are made. All breaking changes will be documented here with migration guides.

### Planned (Not Yet Implemented)

- Rate limiting on admin endpoints
- Cursor-based pagination (replacing offset pagination)
- WebSocket support for real-time statistics
- GraphQL API (optional, alongside REST)

---

## Versioning Strategy

Currently, we use date-based changelog entries. Future versions may adopt semantic versioning for the API.

### Breaking Changes

Breaking changes will be clearly marked and include:

1. What changed
2. Why it changed
3. Step-by-step migration guide
4. Deprecation timeline (if applicable)

### Non-Breaking Changes

- New optional query parameters
- New response fields (additive only)
- Performance improvements
- Bug fixes

---

## How to Use This Changelog

1. **Before updating frontend**: Check this changelog for recent changes
2. **When making API changes**: Update this file immediately
3. **For breaking changes**: Provide clear migration instructions
4. **For new features**: Document new endpoints and usage examples
