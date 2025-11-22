# Admin Players Module

## Overview

This module provides administrative endpoints for managing players (users) in the Trayb.az platform. It handles player listing, detail views, role assignments, ban management, and audit logging.

## Data Models

### Core Entities

- **User**: Base user entity with profile information
- **PlayerRole**: RBAC roles assigned to players (organizer, admin, moderator, competitor, viewer)
- **PlayerBan**: Ban records for players (temporary or permanent)
- **PlayerAuditLog**: Audit trail of all admin actions on players

### Key Relationships

- User has many PlayerRoles (one primary, multiple secondary)
- User has many PlayerBans (only one active at a time)
- User has many PlayerAuditLog entries (audit trail)

## Routes

### `GET /admin/players`

List all players with pagination and filtering.

**Query Parameters:**

- `page` (number, default: 1): Page number
- `pageSize` (number, default: 25, max: 100): Items per page
- `search` (string, optional): Search by username, email, or Discord ID
- `role` (string, optional): Filter by role
- `status` (string, optional): Filter by status (active, banned, suspended)
- `game` (string, optional): Filter by game (valorant, cs2)
- `hubId` (string, optional): Filter by hub membership

**Response:** Paginated list of player summaries

### `GET /admin/players/:playerId`

Get detailed player information including stats, roles, bans, and audit log.

**Response:** Complete player detail object with:

- Profile information
- Game statistics (Valorant, CS2)
- Recent matches
- Rating history
- Badges
- Roles
- Active ban (if any)
- Audit log entries

### `PUT /admin/players/:playerId/roles`

Update player roles (RBAC system).

**Request Body:**

```json
{
  "roles": ["admin", "competitor"],
  "primaryRole": "admin",
  "reason": "Promoted to admin"
}
```

**Response:** Updated role information

### `POST /admin/players/:playerId/ban`

Ban a player.

**Request Body:**

```json
{
  "type": "temporary" | "permanent",
  "durationDays": 30, // Required for temporary bans
  "reason": "Violation of terms",
  "banFromAllHubs": true,
  "banFromDiscord": false
}
```

**Response:** Ban record

### `POST /admin/players/:playerId/unban`

Lift an active ban.

**Request Body:**

```json
{
  "reason": "Appeal accepted"
}
```

**Response:** Updated player status

## Architecture

### Layer Structure

```
routes.ts          # Route definitions with Swagger schemas
controller.ts      # Request/response handling
service.ts         # Business logic
repository.ts      # Database access
schema.ts          # Zod validation schemas
stats.ts           # Player statistics aggregation
```

### Key Components

- **Controller**: Handles HTTP requests, validates input, calls service
- **Service**: Contains business logic, orchestrates repository calls
- **Repository**: Database queries using Prisma, uses shared selectors
- **Schema**: Zod schemas for validation and type safety

## Testing

Run tests with:

```bash
bun test apps/backend/src/modules/admin/players
```

### Test Coverage

- Player listing with filters
- Player detail retrieval
- Role assignment and updates
- Ban creation and lifting
- Audit log creation
- Transaction handling

## Dependencies

- `@trayb/db`: Prisma client
- `@trayb/types`: Shared types and enums
- `zod`: Schema validation
- `../../../utils/prisma-selectors`: Shared Prisma selectors

## Notes

- All admin actions are logged to `PlayerAuditLog`
- Role changes update both `PlayerRole` table and `User.role` field
- Bans automatically expire temporary bans when `endsAt` is reached
- Player statistics are aggregated from `MatchPlayer` and `PlayerEloHistory` tables
