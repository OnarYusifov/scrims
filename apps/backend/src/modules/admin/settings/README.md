# Admin Settings Module

## Overview

This module manages platform-wide settings including map pools, weight profiles for Rating 2.0 calculations, and system configuration. These settings affect match creation, ELO calculations, and platform behavior.

## Data Models

### Core Entities

- **MapPool**: Available maps per game with active/inactive status
- **WeightProfile**: Rating 2.0 calculation weights per game
- **SystemConfig**: System-wide configuration key-value pairs

## Routes

### `GET /admin/settings/maps`

Get map pool configuration.

**Query Parameters:**

- `game` (string, optional): Filter by game (valorant, cs2)

**Response:** Map pool configuration with active/inactive status

### `PUT /admin/settings/maps`

Update map pool configuration.

**Request Body:**

```json
{
  "game": "valorant",
  "maps": [
    {
      "id": "bind",
      "name": "Bind",
      "active": true,
      "order": 1
    }
  ]
}
```

### `GET /admin/settings/weight-profiles`

Get Rating 2.0 weight profiles.

**Query Parameters:**

- `game` (string, optional): Filter by game

**Response:** Weight profile configuration

### `PUT /admin/settings/weight-profiles`

Update Rating 2.0 weight profiles.

**Request Body:**

```json
{
  "game": "valorant",
  "weights": {
    "killContribution": 0.3,
    "deathContribution": 0.2,
    "apr": 0.2,
    "adra": 0.15,
    "survivalRating": 0.15
  }
}
```

### `GET /admin/settings/system`

Get system configuration.

**Response:** System configuration key-value pairs

### `PUT /admin/settings/system`

Update system configuration.

**Request Body:**

```json
{
  "discord": {
    "botToken": "...",
    "recorderBot1Token": "...",
    "recorderBot2Token": "...",
    "serverId": "...",
    "lobbyChannelId": "..."
  },
  "recording": {
    "enabled": true,
    "quality": "high",
    "autoDeleteDays": 30
  },
  "elo": {
    "defaultStartingElo": 1500,
    "kFactor": 32,
    "calibrationMatches": 10
  }
}
```

## Architecture

### Layer Structure

```
routes.ts          # Route definitions with Swagger schemas
schema.ts          # Zod validation schemas
```

Settings are stored in the database and cached for performance.

## Usage Notes

- Map pool changes affect match creation immediately
- Weight profile changes affect future Rating 2.0 calculations only
- System config changes may require server restart for some settings
- All settings changes should be logged to audit log (future enhancement)

## Testing

Run tests with:

```bash
bun test apps/backend/src/modules/admin/settings
```

### Test Coverage

- Map pool CRUD operations
- Weight profile validation
- System config updates
- Game-specific filtering

## Dependencies

- `@trayb/db`: Prisma client
- `@trayb/types`: Shared types and enums
- `zod`: Schema validation
