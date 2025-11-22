# Admin Stats Module

## Overview

This module provides statistical endpoints for the admin dashboard. It aggregates data from matches, players, and ELO history to provide platform-wide analytics.

## Data Models

### Core Entities Used

- **Match**: Match records with outcomes, maps, duration
- **MatchPlayer**: Player performance in matches
- **PlayerEloHistory**: Historical ELO/rating snapshots
- **User**: Player counts and status

## Routes

### `GET /admin/stats/overview`

Platform-wide overview statistics.

**Query Parameters:**

- `game` (string, optional): Filter by game (valorant, cs2)
- `from` (ISO date-time, optional): Start date
- `to` (ISO date-time, optional): End date
- `hubId` (string, optional): Filter by hub

**Response:**

```json
{
  "timeframe": { "from": "...", "to": "...", "days": 30 },
  "players": {
    "total": 1000,
    "active": 800,
    "banned": 50,
    "newThisWeek": 25
  },
  "matches": {
    "matches": 500,
    "avgDurationMinutes": 45,
    "avgRounds": 24
  },
  "outcomes": {
    "alpha": 250,
    "bravo": 230,
    "draw": 20
  }
}
```

### `GET /admin/stats/match-analytics`

Detailed match analytics with trends and top performers.

**Query Parameters:** Same as overview

**Response:**

```json
{
  "timeframe": { ... },
  "totals": { ... },
  "outcomes": { ... },
  "maps": [
    {
      "map": "Bind",
      "matches": 50,
      "alphaWinRate": 0.52,
      "bravoWinRate": 0.48,
      "avgRounds": 24.5
    }
  ],
  "recentTrend": [
    {
      "date": "2025-01-01",
      "matches": 10,
      "avgRatingDelta": 12.5
    }
  ],
  "topPerformers": [
    {
      "playerId": "...",
      "username": "player1",
      "kills": 150,
      "acs": 250.5,
      "ratingDelta": 15.2
    }
  ]
}
```

### `GET /admin/stats/elo-distribution`

ELO distribution histogram data.

**Query Parameters:**

- `game` (string, required): Game to analyze (valorant, cs2)
- `hubId` (string, optional): Filter by hub

**Response:**

```json
{
  "summary": {
    "totalPlayers": 1000,
    "average": 1500,
    "median": 1480,
    "percentile95": 2000,
    "min": 800,
    "max": 2500
  },
  "buckets": [
    { "label": "800-1000", "count": 50 },
    { "label": "1000-1200", "count": 150 }
  ]
}
```

## Architecture

### Layer Structure

```
routes.ts          # Route definitions with Swagger schemas
controller.ts      # Request/response handling
service.ts         # Business logic and aggregation
repository.ts      # Database queries
```

### Key Components

- **Service**: Aggregates data from multiple sources, calculates statistics
- **Repository**: Efficient queries using Prisma selectors
- **Controller**: Handles HTTP requests and response formatting

## Performance Considerations

- Queries use efficient Prisma selectors to minimize data transfer
- Statistics are calculated on-demand (consider caching for Phase 2)
- Large date ranges may be slow; consider pagination or time limits

## Testing

Run tests with:

```bash
bun test apps/backend/src/modules/admin/stats
```

### Test Coverage

- Overview statistics calculation
- Match analytics aggregation
- ELO distribution histogram generation
- Date range filtering
- Hub-specific filtering

## Dependencies

- `@trayb/db`: Prisma client
- `@trayb/types`: Shared types and enums

## Future Improvements (Phase 2)

- Add Redis caching for expensive aggregations
- Background jobs for precomputed statistics
- Time-series database for historical data
- Real-time statistics via WebSocket
