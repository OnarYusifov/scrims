# Trayb.az v3 Implementation Tasks

**Document Version:** 1.0  
**Generated:** November 12, 2025  
**Purpose:** Comprehensive breakdown of tasks required to implement v3 specification

---

## Executive Summary

This document provides a detailed analysis of the current codebase compared to the v3 specification. The platform currently operates as "Trayb Customs" with a single Valorant queue system. The v3 specification requires significant architectural changes to support multi-game (Valorant + CS2), queue types (Unranked, Ranked Global, Private Hub Ranked), and enhanced features.

**Current State:** Custom match system with ELO, Discord integration, and stats tracking  
**Target State:** Full esports platform with modular game support, queue types, private hubs, tournaments, dual rating systems, and separated recorder bots

---

## 1. Architecture & Infrastructure Tasks

### 1.1 Monorepo Restructuring

**Current Structure:**
```
/apps
  /frontend          # Next.js (both public + admin combined)
  /backend           # Fastify API with embedded Discord bot
```

**Required Structure:**
```
/apps
  /frontend          # Next.js (trayb.az + admin.trayb.az)
  /backend           # API server
  /controlbot        # Discord VC management bot (NEW)
  /recorderbot1      # Team 1 audio recorder (NEW)
  /recorderbot2      # Team 2 audio recorder (NEW)
/packages
  /shared            # Shared types, utilities, constants (NEW)
```

**Tasks:**
- Extract shared types from frontend and backend into `/packages/shared`
- Create separate package.json for shared package with proper TypeScript configuration
- Update turbo.json to include shared package in dependency graph
- Configure path aliases for shared package imports across all apps
- Set up TypeScript project references for monorepo optimization

### 1.2 Bot Architecture Separation ✅

**Current:** Single Discord bot embedded in backend (`/apps/backend/src/bot/discordBot.ts`)

**Required Changes:**
- Create `/apps/controlbot` as standalone application
  - Voice channel management (lobby, team VCs)
  - Player movement automation
  - Anticheat enforcement (VC locking)
  - API client to communicate with backend
  - WebSocket or REST API to trigger recorder bots
  
- Create `/apps/recorderbot1` as standalone application
  - Join Team 1 VC on signal from ControlBot
  - Record individual audio streams using discord.js voice
  - Generate combined team audio file
  - Upload recordings to backend storage endpoint
  - Handle cleanup on match end
  
- Create `/apps/recorderbot2` (identical to recorderbot1 for Team 2)

**Bot Communication Pattern:**
```
Backend API → ControlBot (moves players) → RecorderBot1/2 (via internal API)
                    ↓
              Backend Storage ← RecorderBot1/2 (upload recordings)
```

### 1.3 Domain Structure Implementation ✅

**Current:** Single domain serving both public and admin

**Required:**
- Configure Next.js frontend to handle subdomain routing:
  - `trayb.az` → public player/viewer experience
  - `admin.trayb.az` → administrative dashboard
  
- Implement middleware to enforce role-based subdomain access
- Update environment variables to support multi-domain configuration
- Configure reverse proxy (if using Dokploy) for subdomain routing

### 1.4 Configuration Management

**Current:** Environment variables with setup-env.sh script

**Specification Requirement:** "No local .env files - production-ready config management"

**Tasks:**
- Evaluate migration to centralized config service (e.g., HashiCorp Vault, AWS Secrets Manager)
- Implement runtime configuration fetching instead of build-time .env
- Create configuration validation layer in each application
- Update deployment scripts to inject secrets at runtime
- Document new configuration approach in deployment guide

---

## 2. Database Schema & Migration Tasks

### 2.1 Core Schema Extensions ✅

**Current Schema Gaps (compared to v3 spec):**

#### Missing Tables:
- `games` - Multi-game support (Valorant, CS2)
- `hubs` - Private hub and global queue management
- `hub_whitelist` - Hub access control
- `tournaments` - Tournament system (Phase 2)
- `tournament_registrations` - Team registration (Phase 2)
- `match_recordings` - Audio recording metadata

#### Missing Columns in Existing Tables:

**User Table:**
- Game-specific ELO separation (current: single ELO field)
- Hub-specific ratings
- CS2 statistics fields
- League ELO for Power Score calculation

**Match Table:**
- `hub_id` - Associate match with hub or global queue
- `game_id` - Multi-game support
- `queue_type` - Distinguish unranked/ranked_global/private_ranked
- `draft_mode` - Track random/elo/captain draft method
- `discord_lobby_id` - Track Discord voice channel
- `discord_team1_vc_id`, `discord_team2_vc_id` - Team voice channels

**PlayerMatchStats Table:**
- CS2-specific fields: `impact_score`, `opening_kills`, `trade_kills`
- Valorant-specific fields: `plants`, `defuses`, `survival_rounds`
- Enhanced `rating_2_0` calculation fields

### 2.2 Role System Restructuring ✅

**Current:** 4-level enum (USER, MODERATOR, ADMIN, ROOT)

**V3 Spec Required:** 5-level modular RBAC with permissions

**Migration Tasks:**
- Create `roles` table with level hierarchy (1=Organizer, 2=Admin, 3=Moderator, 4=Competitor, 5=Viewer)
- Create `permissions` table with resource + action structure
- Create `role_permissions` junction table
- Create `user_roles` junction table (support multiple roles per user)
- Migrate existing UserRole enum to new roles table
- Add "Viewer/Spectator" role for non-competitors
- Rename "USER" to "Competitor" for clarity
- Add "Organizer/Owner" as top-level role with full control

**Permission Examples:**
```
{ resource: 'matches', action: 'create' } → Admins + Organizers
{ resource: 'recordings', action: 'view' } → Admins + Organizers only
{ resource: 'tournaments', action: 'manage' } → Organizers only
{ resource: 'hubs', action: 'create' } → Admins + Organizers
```

### 2.3 Multi-Game ELO System ✅

**Current:** Single ELO field per user

**Required:** Game-specific + Hub-specific ELO tracking

**New Structure:**
```sql
CREATE TABLE player_ratings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  game_id INTEGER REFERENCES games(id),
  hub_id INTEGER REFERENCES hubs(id),  -- NULL for global
  elo INTEGER DEFAULT 1000,
  rating_2_0 FLOAT DEFAULT 1.0,
  league_elo INTEGER DEFAULT 1000,  -- For Power Score (Valorant only)
  matches_played INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  is_calibrating BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, game_id, hub_id)
);
```

**Migration Strategy:**
1. Create `player_ratings` table
2. Migrate existing user ELO to Valorant global ratings
3. Update ELO service to query/update player_ratings instead of user.elo
4. Add CS2 rating initialization logic
5. Implement hub-specific ELO isolation

### 2.4 Prisma Migration Scripts ✅

**Tasks:**
- ✅ Write Prisma migration for new tables (games, hubs, player_ratings, tournaments, match_recordings)
- ✅ Write migration to add missing columns to existing tables
- ✅ Create seed script for default data:
  - ✅ Games: Valorant, CS2
  - ✅ Hubs: Global Trayb Series (is_global=true)
  - ✅ Roles: Organizer, Admin, Moderator, Competitor, Viewer
  - ✅ Permissions: Full permission matrix
  - ✅ Role_Permissions: Default permission assignments
  - ✅ MapPool: Valorant maps, CS2 maps
- ⚠️ Test migrations on development database (manual testing required)
- ✅ Create rollback scripts for all migrations (documented in MIGRATION_NOTES.md)
- ✅ Document breaking changes in migration notes

---

## 3. Rating Systems Implementation

### 3.1 ELO System Enhancements ✅

**Current Implementation:** Basic ELO with K-factor scaling and performance multipliers

**Required Changes:**

#### Game-Specific ELO Logic:
- **Valorant:** Implement Power Score formula  
  `Power Score = 0.8 × Team ELO + 0.2 × League ELO`
  
- **CS2:** Implement Premier-style rating (0-15,000 scale with conversion)
  - Research CS2 Premier rating system
  - Create conversion functions between 0-15,000 scale and traditional ELO
  - Optional: Map-specific ELO tracking

#### Hub Isolation:
- Ensure private hub ELO does NOT affect global ELO
- League ELO = 0 for private hubs (per spec)
- Separate leaderboards per hub per game

#### Queue-Specific Persistence:
- Unranked matches: No ELO change (performance shown only)
- Ranked Global (Trayb Series): Global ELO updated
- Private Hub Ranked: Hub-specific ELO updated

**Implementation Files to Modify:**
- `apps/backend/src/services/elo.service.ts` - Add game-specific calculation methods
- Create `apps/backend/src/services/elo-valorant.service.ts` - Valorant-specific logic
- Create `apps/backend/src/services/elo-cs2.service.ts` - CS2-specific logic
- Update `apps/backend/src/routes/matches.ts` - Pass game_id and hub_id to ELO service

### 3.2 Rating 2.0 Implementation ✅

**Current State:** `rating20` field exists in PlayerMatchStats but calculation is placeholder (WPR-based)

**Required:** Full VLR-style (Valorant) and HLTV-style (CS2) Rating 2.0

#### Valorant Rating 2.0 (VLR-based):

**Components:**
1. **Kill Contribution** - Weighted by fight context
   - 5v5 kill worth more than 5v1
   - Turning 4v5 → 4v4 valued equally to 5v5 → 5v4
   
2. **Death Contribution** - Negative weight, context-sensitive

3. **Assists Per Round (APR)**

4. **Adjusted ADR (ADRa)** - Damage not already counted in kills
   - Requires round-by-round data parsing

5. **Survival Rating**

**Formula:**
```
Rating 2.0 = w1×KillContrib + w2×DeathContrib + w3×APR + w4×ADRa + w5×SurvivalRating
Mean = 1.0, Std Dev = 0.33
```

**Implementation Tasks:**
- Create `apps/backend/src/services/rating20-valorant.service.ts`
- Implement round-by-round analysis parser (requires GRID API or tracker.gg extended data)
- Implement fight context weighting algorithm
- Calculate adjusted ADR (subtract damage from kills)
- Normalize to 1.0 mean, 0.33 std dev
- Store calculation breakdown in JSON field for transparency

#### CS2 Rating 2.0 (HLTV-based):

**Formula (reverse-engineered):**
```
Rating 2.0 = 0.0073×KAST + 0.3591×KPR - 0.5329×DPR + 0.2372×Impact + 0.0032×ADR + 0.1587
```

**Impact Sub-Formula:**
```
Impact ≈ 2.13×KPR + 0.42×APR - 0.41
```

**Variables:**
- **KAST:** % of rounds with Kill, Assist, Survived, or Traded
- **KPR:** Kills Per Round
- **DPR:** Deaths Per Round
- **Impact:** Multi-kills + opening kills + clutches
- **ADR:** Average Damage Per Round

**Implementation Tasks:**
- Create `apps/backend/src/services/rating20-cs2.service.ts`
- Implement KAST calculation (requires round-by-round survival data)
- Implement Impact calculation from multi-kills, first kills, clutches
- Apply HLTV formula coefficients
- Store calculation breakdown for transparency

#### Shared Rating 2.0 Infrastructure:

**Tasks:**
- Create abstract `Rating20Service` interface
- Implement factory pattern to select game-specific service
- Update `PlayerMatchStats` table to include calculation breakdown JSON
- Create UI components to display Rating 2.0 with tooltips explaining components
- Add Rating 2.0 to leaderboard sorting (secondary to ELO)
- Create Rating 2.0 history tracking

---

## 4. Queue Types & Matchmaking

### 4.1 Queue System Architecture ✅

**Current State:** Single custom match creation (no automated matchmaking)

**Required:** Three distinct queue types with different behaviors

#### Queue Type Enum:
```typescript
enum QueueType {
  UNRANKED = 'unranked',
  RANKED_GLOBAL = 'ranked_global',
  PRIVATE_HUB_RANKED = 'private_ranked'
}
```

#### Feature Matrix Implementation:

| Feature | Unranked | Ranked Global | Private Hub |
|---------|----------|---------------|-------------|
| ELO Impact | ❌ No | ✅ Global | ✅ Hub-specific |
| Draft Options | ✅ All | ✅ Captains only | ✅ All |
| Pick/Bans | ✅ Optional | ✅ Yes | ✅ Optional |
| Scheduling | ❌ Always available | ✅ Scheduled | ❌ Whitelist only |
| Captain Draft | ✅ Yes | ✅ Yes | ✅ Yes |

### 4.2 Ranked Global (Trayb Series) Implementation ✅

**Requirements:**
- Scheduled queue times (e.g., Fridays 8-10 PM)
- Automated matchmaking when 10+ players queue
- Official statistics tracking with Rating 2.0
- Global leaderboards

**Implementation Tasks:**
- ✅ Create `TraybSeriesSchedule` and `QueueEntry` models with time windows
- ✅ Implement queue status check (open/closed based on schedule)
- ✅ Implement ready-up system (like Faceit accept match)
- ✅ Implement auto-match creation when 10 players ready
- ✅ Create queue management routes (join, leave, ready, status)
- [ ] Create queue UI with countdown to next window
- [ ] Display "Queue Open" indicator on dashboard
- [ ] Add notification system (Discord + in-app) for queue openings
- This queue system for TRAYB Series and scheduling is similar to faceit hubs

### 4.3 Private Hub System ✅

The user sees 3 selectors
- Experience mode - Competitor/viewer
- Hub - unranked or ranked
- this one i forgot but consider that something will be added because nevertheless this project should be modular

**Requirements:**
- Invitation-only access via whitelist
- Separate ELO/ratings per hub
- Isolated leaderboards
- Custom draft options available
- Admin can create multiple hubs

**Implementation Tasks:**
- ✅ Create hub management service (CRUD operations)
- ✅ Create hub management routes (create, update, delete, list)
- ✅ Create hub whitelist management routes (add, remove users)
- ✅ Create hub discovery routes (list accessible hubs for user)
- ✅ Create hub-specific leaderboard routes
- ✅ Create hub statistics routes (admin view)
- ✅ Enforce whitelist checks (already implemented in queue service)
- [ ] Create hub management UI (admin panel)
  - [ ] Create hub form (name, game, whitelist toggle)
  - [ ] Edit hub settings
  - [ ] Manage whitelist (add/remove users)
- [ ] Implement hub discovery page (show accessible hubs to user)
- [ ] Add hub selection to match creation flow
- [ ] Create hub-specific leaderboard pages (frontend)
- [ ] Implement hub statistics dashboard (admin view - frontend)
- [ ] Add hub filtering to match history

### 4.4 Draft Phase Enhancements ✅

**Current:** Captain draft implemented, random assignment via Random.org

**Required Additions:**
- ELO-based balancing (snake draft by ELO)
- Captain selection improvements:
  - Option to skip captain voting
  - Admin override for captain selection
  - Random captain assignment option
  
- Draft mode configuration per queue type
- UI indicator showing which draft mode is active

**Implementation Tasks:**
- ✅ Draft mode field exists in Match model
- ✅ Create draft service with ELO balancing algorithm
- ✅ Implement captain selection improvements (skip voting, admin override, random)
- ✅ Add draft history tracking (who picked when)
- ✅ Create draft phase event logging for audit trail
- ✅ Create draft mode update endpoint
- ✅ Integrate ELO balancing with assign-teams endpoint
- [ ] Create draft mode selector component (admin/creator only - frontend)
- [ ] Add UI indicator showing which draft mode is active (frontend)
- [ ] Integrate captain selection improvements in frontend

---

## 5. Multi-Game Support (Valorant + CS2)

### 5.1 Game Abstraction Layer ✅

**Current:** Hardcoded Valorant assumptions throughout codebase

**Required:** Modular game-specific logic with shared interfaces

**Architecture:**
```typescript
interface GameService {
  calculateRating20(stats: PlayerMatchStats): number;
  calculateELO(params: ELOParams): ELOResult;
  getMapPool(): Map[];
  parseStats(source: StatsSource): ParsedStats;
  validateTeamComposition(team: Team): ValidationResult;
}

class ValorantService implements GameService { ... }
class CS2Service implements GameService { ... }
```

**Tasks:**
- ✅ Create game service factory pattern
- ✅ Extract Valorant-specific logic into `ValorantService`
- ✅ Create `CS2Service` with CS2-specific rules
- ✅ Implement game-specific validation rules
- ✅ Create GameService interface with all required methods
- [ ] Update stats parsing to support both games (CS2 parsing needs implementation)
- [ ] Integrate game service factory into existing routes/services
- [ ] Add game selection to match creation UI
- [ ] Create game filter for leaderboards and match history

### 5.2 CS2-Specific Features ✅

**Tasks:**
- ✅ Add CS2 map pool to database (Dust2, Mirage, Inferno, Nuke, Overpass, Vertigo, Ancient, Anubis)
- ✅ Create CS2 demo parsing service (placeholder for future implementation)
- ✅ Create CS2 Faceit rating display utilities (1-10 level system)
- ✅ Implement CS2 Rating 2.0 (HLTV formula) - Already completed in 3.2
- ✅ Add CS2-specific stat fields (KAST, Impact, Opening Kills) - Already in schema
- ✅ Create CS2 leaderboard with Faceit-style level display
- [ ] Implement CS2 demo parsing (GOTV demo files) - Requires demofile library integration
  - [ ] Research and integrate demofile library
  - [ ] Create demo upload endpoint
  - [ ] Extract player stats from demo
  - [ ] Map CS2 stats to PlayerMatchStats schema

### 5.3 Game-Specific UI Components

**Tasks:**
- [ ] Create game selection component (dropdown with icons) - Frontend
- [ ] Design Valorant-specific match card (agent icons, ability usage) - Frontend
- [ ] Design CS2-specific match card (weapon stats, economy) - Frontend
- [ ] Implement game-specific stats display - Frontend
- [ ] Add game filter to leaderboard page - Frontend
- [ ] Create game-specific profile tabs (separate Valorant/CS2 stats) - Frontend
- [ ] Design game-specific badges and achievements - Frontend

---

## 6. Statistics & Data Management

### 6.1 Stats Import Enhancement (Phase 1) ✅

**Current:** tracker.gg HTML upload with Puppeteer parsing

**Required Enhancements:**
- Support html files from tracker gg for each stat and other stats in detail
- Improve HTML parsing reliability
- Add validation before import
- Preview stats before confirming import
- Error handling for missing/invalid data

**Implementation Tasks:**
- ✅ Implement batch HTML parsing service
- ✅ Add stats preview endpoint before confirming
- ✅ Create validation rules:
  - ✅ 10 players total
  - ✅ Stats sum correctly (team kills = enemy deaths)
  - ✅ No duplicate players
  - ✅ All required fields present
- ✅ Add rollback functionality for bad imports
- ✅ Create import history log with transaction tracking
- ✅ Improve error messages with specific field issues
- [ ] Create multi-file upload UI (admin panel - frontend)
- [ ] Add stats preview table component (frontend)
- [ ] Improve HTML parsing reliability (extract scores, rounds from HTML)
- [ ] Add re-import capability (store import data for re-import)

### 6.2 Stats Import (Phase 2 - Future)

**Specification Requirements:**
- **Valorant:** GRID Esports API integration
- **CS2:** GOTV demo parsing

**GRID API Tasks (Phase 2):**
- Research GRID API documentation
- Obtain API credentials
- Implement match data fetching by match ID
- Map GRID API response to database schema
- Handle round-by-round data for Rating 2.0
- Implement automatic polling for match completion

**GOTV Demo Parsing Tasks (Phase 2):**
- Research demofile Node.js library
- Create demo file upload endpoint
- Implement demo parsing service
- Extract player stats, round outcomes, economy data
- Map to CS2 stats schema
- Store demo file for replay analysis (future feature)

### 6.3 Statistics Service Refactoring ✅

**Current:** `statistics.service.ts` with basic calculations

**Required:**
- Split into game-specific services
- Add Rating 2.0 calculation
- Implement performance percentile calculations
- Add statistical outlier detection
- Create stats caching layer (Redis)

**Tasks:**
- ✅ Create `StatisticsService` abstract interface and `BaseStatisticsService` class
- ✅ Implement `ValorantStatisticsService` with agent-specific metrics
- ✅ Implement `CS2StatisticsService` with weapon-specific metrics
- ✅ Add percentile ranking (e.g., top 10% ACS)
- ✅ Implement trend analysis (last 5/10/20 matches)
- ✅ Add Redis caching for frequently accessed stats
- ✅ Create stats aggregation service (daily/weekly summaries)
- [ ] Create statistics API routes
- [ ] Integrate aggregation jobs with job queue
- [ ] Add agent/weapon data to schema for detailed metrics

---

## 7. Discord Bot & Audio Recording

### 7.1 ControlBot Implementation

**Current:** Single bot handles all Discord interactions

**Required:** Dedicated ControlBot for voice management

**Features:**
- Lobby presence enforcement (only lobby members can ready)
- Team VC creation and player movement
- Anticheat mode (prevent channel hopping during match)
- Trigger recorder bots via internal API
- Return players to lobby on match end

**Implementation Tasks:**
- Create `/apps/controlbot` package
- Implement Discord.js voice connection handling
- Create REST API client to communicate with backend
- Implement voice state tracking
- Create VC creation/deletion logic
- Implement player movement commands
- Add anticheat enforcement:
  - Lock team VCs (only assigned players can join)
  - Detect unauthorized VC switches
  - Auto-disconnect rule violators
  
- Create internal API to trigger recorder bots
- Add error handling and reconnection logic
- Implement graceful shutdown on match cancellation

### 7.2 RecorderBot Implementation

**Current:** No recording functionality

**Required:** Two separate bots for Team 1 and Team 2

**Features:**
- Join team VC on ControlBot signal
- Record individual player audio streams
- Generate combined team audio file
- Upload recordings to backend storage
- Only activate for tournament/ranked hub matches (configurable)

**Implementation Tasks (per bot):**
- Create `/apps/recorderbot1` and `/apps/recorderbot2` packages
- Implement Discord.js voice receiver
- Research audio recording libraries:
  - @discordjs/voice for voice connections
  - prism-media for audio processing
  - fluent-ffmpeg for audio merging
  
- Implement individual stream recording
- Create audio merging service (combine player streams)
- Implement file storage:
  - Local temp storage during recording
  - Upload to backend endpoint on completion
  - Cleanup temp files
  
- Add activation logic:
  - Check match type (tournament/ranked hub)
  - Check environment flag for testing
  - Skip unranked matches
  
- Implement error handling:
  - Network failures during recording
  - Storage failures
  - Voice connection drops

### 7.3 Recording Storage & Access Control

**Tasks:**
- Create `/api/admin/recordings` endpoints
- Implement file storage service (local or S3)
- Add recordings metadata to database
- Implement access control (Admin/Organizer only)
- Create recording playback UI (admin panel)
- Add recording download functionality
- Implement recording retention policy (auto-delete after X days)
- Add recording audit log (who accessed when)

### 7.4 Bot Communication Architecture

**Current:** Backend directly calls Discord bot methods

**Required:** Event-driven architecture with API endpoints

**Architecture:**
```
Backend → POST /api/internal/bots/control/start-match
           ↓
       ControlBot creates VCs, moves players
           ↓
       ControlBot → POST /api/internal/bots/recorder/start
           ↓
       RecorderBot1/2 join VCs, start recording
           ↓
       Match ends
           ↓
       Backend → POST /api/internal/bots/control/end-match
           ↓
       ControlBot signals RecorderBots to stop
           ↓
       RecorderBots upload → POST /api/internal/matches/:id/recordings
           ↓
       ControlBot returns players to lobby
```

**Implementation Tasks:**
- Create internal API routes in backend
- Implement API authentication (shared secret between services)
- Add webhook endpoints for bot status updates
- Create event queue for reliable delivery (optional: use Redis pub/sub)
- Implement retry logic for failed API calls
- Add monitoring for bot connectivity

---

## 8. API Structure & Endpoints

### 8.1 Public API Routes (Missing/Incomplete)

**Required Routes (per spec):**
```
GET  /api/matches/:id              ✅ EXISTS (needs game/hub filtering)
GET  /api/leaderboards/:game/:hub  ❌ NEEDS UPDATE (currently no game/hub params)
GET  /api/players/:id              ✅ EXISTS (needs multi-game stats)
GET  /api/players/:id/stats        ✅ EXISTS (needs game filtering)
GET  /api/hubs                     ❌ NEW (list accessible hubs)
POST /api/teams                    ❌ NEW (Phase 2 - team registration)
```

**Tasks:**
- Update leaderboard routes to accept game and hub parameters
- Implement hub filtering in all relevant endpoints
- Create hubs listing endpoint with access control
- Add game filtering to player stats endpoints
- Create team management endpoints (Phase 2)
- Document all public API routes in OpenAPI/Swagger spec

### 8.2 Admin API Routes (Missing/Incomplete)

**Required Routes (per spec):**
```
POST /api/admin/tournaments        ❌ NEW (Phase 2)
POST /api/admin/matches/:id/stats  ✅ EXISTS (tracker.gg import)
GET  /api/admin/recordings/:id     ❌ NEW
PUT  /api/admin/users/:id/roles    ⚠️  EXISTS (needs RBAC update)
POST /api/admin/hubs               ❌ NEW
GET  /api/admin/hubs/:id/whitelist ❌ NEW
POST /api/admin/hubs/:id/whitelist ❌ NEW
```

**Tasks:**
- Create hub management endpoints (CRUD)
- Create hub whitelist management endpoints
- Implement recording access endpoints
- Update role management for new RBAC system
- Create tournament management endpoints (Phase 2)
- Add admin audit logging to all admin actions

### 8.3 Internal Bot API Routes

**Required Routes (per spec):**
```
POST /api/internal/bots/control/move       ❌ NEW
POST /api/internal/bots/recorder/start     ❌ NEW
POST /api/internal/bots/recorder/upload    ❌ NEW
GET  /api/internal/matches/:id/voice-state ❌ NEW
```

**Tasks:**
- Create internal API namespace with authentication
- Implement bot control endpoints
- Create recording upload endpoint with file handling
- Add voice state tracking endpoint
- Implement shared secret authentication for internal APIs
- Add rate limiting for bot endpoints
- Document internal API for bot development

### 8.4 API Documentation & Testing

**Tasks:**
- Generate OpenAPI/Swagger documentation
- Create API documentation page (public developer docs)
- Write integration tests for all endpoints
- Create Postman/Insomnia collection
- Implement API versioning (v1, v2, etc.)
- Add API response examples to documentation
- Create API changelog for breaking changes

---

## 9. Frontend & UI Implementation

### 9.1 Domain Separation (trayb.az vs admin.trayb.az)

**Current:** Single Next.js app with role-based routing

**Required:** Subdomain-based separation

**Tasks:**
- Implement subdomain detection middleware
- Create separate layouts for public vs admin
- Add subdomain-based navigation guards
- Update authentication flow to redirect to correct domain
- Implement role-based subdomain access enforcement
- Create separate color schemes/themes for admin vs public
- Add domain switcher in user dropdown (for admins)

### 9.2 Public Site (trayb.az) Features

**Current Features:**
- ✅ Dashboard with match list
- ✅ Leaderboard
- ✅ Player profiles
- ✅ Match detail pages
- ✅ Login page

**Missing Features:**
- ❌ Queue selection UI (unranked, ranked global, private hub)
- ❌ Hub discovery page
- ❌ Live match spectator view
- ❌ Tournament bracket viewer (Phase 2)
- ❌ Team profiles (Phase 2)
- ❌ Game selection (Valorant/CS2)
- ❌ Queue status indicator (open/closed for Trayb Series)
- ❌ Countdown timer for next queue window
- ❌ Enhanced profile with radar chart, ELO history graph
- ❌ Rating 2.0 explanation tooltips
- ❌ Achievement badges display

**Implementation Tasks:**
- Create queue selection page with status indicators
- Implement hub browser with access requests
- Design live match spectator UI (real-time updates)
- Create enhanced profile page:
  - Radar chart for skill visualization
  - ELO history graph (line chart with annotations)
  - Achievement badge grid
  - Multi-game tabs (Valorant/CS2)
  - Last 5 matches expandable to all
  
- Implement game filter across all pages
- Create Rating 2.0 explanation modals
- Add animated ELO change reveals (Overwatch-style)
- Implement match room real-time updates

### 9.3 Admin Site (admin.trayb.az) Features

**Current Features:**
- ✅ User management
- ✅ Match deletion
- ✅ Stats import (tracker.gg)
- ✅ Audit log viewer

**Missing Features:**
- ❌ Hub management (CRUD)
- ❌ Hub whitelist editor
- ❌ Recording playback/download
- ❌ Tournament creation/management (Phase 2)
- ❌ Queue schedule editor
- ❌ Weight profile editor (for WPR/Rating 2.0 tuning)
- ❌ ELO recalculation tools
- ❌ Ban management with reason/duration
- ❌ Role assignment with new RBAC system
- ❌ Statistics dashboard (platform health metrics)

**Implementation Tasks:**
- Create hub management pages (list, create, edit, delete)
- Implement whitelist editor with user search
- Create recording library with playback controls
- Design tournament bracket builder (Phase 2)
- Create queue schedule calendar editor
- Build weight profile configuration UI
- Implement ELO tools:
  - Recalculate all users
  - Manual ELO adjustment with reason
  - Reset calibration status
  
- Create ban management interface
- Build new role assignment UI for RBAC
- Create admin dashboard with metrics:
  - Active users
  - Matches per day/week
  - ELO distribution histogram
  - Queue wait times
  - Bot status indicators

### 9.4 shadcn/ui Component Selection

**Current Components Used:**
- Avatar, Dialog, Dropdown Menu, Label, Progress, Scroll Area, Select, Separator, Slot, Tabs, Toast, Tooltip

**Additional Components Needed:**
- Badge (for achievements, rank tags)
- Calendar (for queue scheduling)
- Card (for hub cards, match cards)
- Chart (for ELO history, statistics)
- Command (for admin search/commands)
- Data Table (for leaderboards, audit logs)
- Form (for hub creation, tournament setup)
- Input (various forms)
- Pagination (for leaderboards)
- Popover (for tooltips, rating explanations)
- Radio Group (for draft mode selection)
- Skeleton (loading states)
- Slider (for weight profile tuning)
- Switch (for toggle settings)
- Textarea (for notes, descriptions)

**Tasks:**
- Install missing shadcn/ui components as needed
- Create custom compositions (e.g., StatsCard using Card + Badge)
- Implement theme customization for both domains
- Create consistent loading states using Skeleton
- Add animations for ELO reveals using Framer Motion

### 9.5 UI/UX Requirements Implementation

**Specification Requirements:**
- ✅ Smooth, snappy interactions (partially done)
- ❌ No cliche animations (remove Matrix-style backgrounds)
- ⚠️  Z-index management (needs audit)
- ⚠️  WCAG 2.1 AA compliance (needs testing)
- ❌ Custom color codes (need to be provided separately)
- ❌ Custom logo (favicon + navbar)
- ⚠️  Light/Dark mode toggle (exists, needs refinement)

**Tasks:**
- Remove or replace Matrix-style background animations
- Conduct Z-index audit and create Z-index scale documentation
- Run accessibility audit (axe DevTools)
- Fix accessibility issues (keyboard navigation, ARIA labels, color contrast)
- Implement custom color palette (pending design specs)
- Create custom logo variants (light/dark mode)
- Update favicon
- Refine theme toggle with smooth transitions
- Create consistent design language guide

---

## 10. Security & Privacy Tasks

### 10.1 Authentication Enhancements

**Current:** Discord OAuth with JWT

**Required Additions:**
- Session management with Redis
- Refresh token rotation
- Device tracking
- Login history
- 2FA support (future consideration)

**Tasks:**
- Implement refresh token system
- Add device fingerprinting
- Create session management UI (view/revoke sessions)
- Log all login attempts (success/failure)
- Implement account lockout after failed attempts
- Add "Remember Me" functionality
- Create login notification system (new device alerts)

### 10.2 RBAC Middleware Enhancement

**Current:** Basic role enum checks

**Required:** Full permission-based authorization

**Tasks:**
- Create RBAC middleware with permission checking
- Implement route-level permission decorators
- Add resource-level permission checks (e.g., can edit this hub)
- Create permission hierarchy (inherit permissions from lower roles)
- Implement permission caching (Redis)
- Add permission audit logging
- Create permission testing utilities

### 10.3 Data Protection Implementation

**Specification Requirements:**
- Match recordings: Admin-only access (strategy protection)
- Personal data: GDPR-compliant storage
- Secure file upload validation
- SQL injection prevention (parameterized queries - already done)

**Tasks:**
- Implement recording access control (already planned)
- Create GDPR compliance features:
  - Data export (user downloads all their data)
  - Right to be forgotten (account deletion with data anonymization)
  - Data retention policies
  - Privacy policy page
  
- Implement file upload security:
  - File type validation
  - File size limits
  - Virus scanning (optional: ClamAV integration)
  - Sanitize file names
  
- Add rate limiting to all endpoints (extend existing)
- Implement CSRF protection
- Add Content Security Policy headers
- Implement XSS protection

---

## 11. Testing & Quality Assurance

### 11.1 QA Testing Strategy (Per Spec)

**Specification:** "Use Puppeteer/Playwright to simulate 10 concurrent players"

**Current:** E2E tests exist but not for full match flow

**Tasks:**
- Create Playwright test suite for 10-player match simulation
- Implement test scenarios:
  - Full match flow: join → draft → play → stats → ELO update
  - Captain draft with voting
  - Map pick/ban phase
  - Concurrent match creation
  - Hub access control
  - Queue system behavior
  
- Create test data generators:
  - Random player stats
  - Realistic ELO distributions
  - Multiple hubs with users
  
- Implement test cleanup (reset database after tests)
- Add test reporting dashboard
- Create CI integration for automated testing

### 11.2 Unit Testing

**Current:** "No backend tests defined yet" (per package.json)

**Tasks:**
- Set up Jest or Vitest for backend
- Set up React Testing Library for frontend
- Write unit tests for:
  - ELO calculation service (all edge cases)
  - Rating 2.0 calculation (both games)
  - Permission checking middleware
  - Stats parsing logic
  - Game service implementations
  
- Achieve >80% code coverage for critical services
- Add test coverage reporting
- Create test documentation

### 11.3 Integration Testing

**Tasks:**
- Test all API endpoints with various auth levels
- Test database migrations (up and down)
- Test bot communication (backend ↔ ControlBot ↔ RecorderBots)
- Test recording upload and storage
- Test real-time events (SSE)
- Test Redis caching behavior
- Test concurrent match scenarios

---

## 12. Deployment & DevOps

### 12.1 Dokploy Configuration

**Current:** Nixpacks configuration exists for backend and frontend

**Required:** Deploy 5 separate services (frontend, backend, controlbot, recorderbot1, recorderbot2)

**Tasks:**
- Create Dokploy configuration for each service
- Set up PostgreSQL container with persistent volume
- Set up Redis container with persistent volume
- Configure environment variable injection per service
- Set up service networking (internal APIs)
- Implement health checks for all services
- Configure auto-restart policies
- Set up log aggregation

### 12.2 Branching & Deployment Strategy

**Specification:**
- `main`: Production
- `beta`: Staging/testing
- Feature branches → beta → main

**Tasks:**
- Enforce branch protection rules
- Set up auto-deploy to beta on merge
- Implement manual promotion to main
- Create deployment checklist
- Add deployment notifications (Discord/Slack)
- Implement zero-downtime deployments
- Create rollback procedures

### 12.3 CI/CD (GitHub Actions)

**Current:** Basic linting and build verification

**Required Additions:**
- Automated testing on PR
- Database migration validation
- E2E test execution
- Build artifact generation
- Automated deployment to beta
- Security scanning

**Tasks:**
- Create comprehensive CI pipeline:
  - Lint all packages
  - Run unit tests
  - Run integration tests
  - Run E2E tests (Playwright)
  - Build all applications
  - Run security audit
  
- Create CD pipeline:
  - Build Docker images (or Nixpacks builds)
  - Push to container registry
  - Deploy to beta environment
  - Run smoke tests
  - Notify team of deployment status
  
- Implement database migration automation
- Add manual approval for production deployments
- Create deployment rollback automation

### 12.4 Monitoring & Observability

**Tasks:**
- Implement application monitoring (Prometheus + Grafana or similar)
- Add performance metrics:
  - API response times
  - Database query times
  - Bot response times
  - Queue wait times
  
- Set up error tracking (Sentry or similar)
- Create alerting rules:
  - High error rates
  - Slow queries
  - Bot disconnections
  - High queue wait times
  
- Implement logging strategy:
  - Structured logging (JSON format)
  - Log levels (debug, info, warn, error)
  - Log aggregation (Loki or similar)
  
- Create dashboards:
  - Platform health overview
  - User activity metrics
  - Match statistics
  - Bot status

---

## 13. Documentation Tasks

### 13.1 User Documentation

**Tasks:**
- Create player guide:
  - How to join matches
  - Queue types explained
  - Draft phase guide
  - Rating systems explained (ELO vs Rating 2.0)
  
- Create hub owner guide:
  - Creating private hubs
  - Managing whitelist
  - Viewing hub statistics
  
- Create FAQ page
- Create video tutorials (optional)

### 13.2 Admin Documentation

**Tasks:**
- Admin panel user guide
- Role and permission documentation
- Match management guide
- Stats import guide (tracker.gg + future GRID/GOTV)
- Recording access and management
- Tournament setup guide (Phase 2)
- Troubleshooting guide

### 13.3 Developer Documentation

**Tasks:**
- Architecture overview diagram
- Database schema documentation
- API documentation (OpenAPI/Swagger)
- Bot communication protocol
- Game service implementation guide
- Rating calculation algorithm documentation
- Deployment guide
- Contribution guidelines

---

## 14. Phase 1 vs Phase 2 Task Breakdown

### Phase 1 (Current Scope - Implement First)

**Core Platform:**
- ✅ Database schema migrations (games, hubs, player_ratings, RBAC)
- ✅ Multi-game support (Valorant + CS2)
- ✅ Queue types (Unranked, Ranked Global, Private Hub)
- ✅ ELO system enhancements (game-specific, hub isolation)
- ✅ Rating 2.0 implementation (both games)
- ✅ ControlBot + RecorderBots separation
- ✅ Hub management (creation, whitelist, leaderboards)
- ✅ Admin panel enhancements
- ✅ Public site improvements (queue selection, enhanced profiles)
- ✅ tracker.gg stats import improvements
- ✅ Security enhancements (RBAC, recording access control)
- ✅ Testing infrastructure (Playwright simulation)

### Phase 2 (January - Team Registration)

**Team System:**
- Team creation and management
- Team invitations and roster management
- Team-based ELO (separate from individual)
- Team profiles and statistics
- Team leaderboards

**Tournament System:**
- Tournament creation and management
- Team registration for tournaments
- Tournament bracket generation
- Online → Offline tournament support
- Tournament statistics and history

**Advanced Roles:**
- Coach role with limited match access
- Manager role for team administration
- Team captain with in-match powers

**API Integrations:**
- GRID Esports API (Valorant)
- GOTV demo parsing (CS2)
- Automated stats collection

---

## 15. Critical Path & Priorities

### Immediate Priorities (Week 1-2)

1. **Database Schema Migration**
   - Create all new tables (games, hubs, player_ratings)
   - Migrate existing data
   - Update Prisma client

2. **RBAC System Overhaul**
   - Implement new role/permission tables
   - Update middleware
   - Migrate existing users to new system

3. **Bot Separation Architecture**
   - Create monorepo structure for bots
   - Implement basic ControlBot
   - Define bot communication protocol

### High Priority (Week 3-4)

4. **Multi-Game Foundation**
   - Game service abstraction
   - Game selection UI
   - Game-specific ELO tracking

5. **Queue Types Implementation**
   - Queue type enum and database fields
   - Queue selection UI
   - Unranked match creation

6. **Hub System**
   - Hub CRUD operations
   - Hub whitelist management
   - Hub-specific leaderboards

### Medium Priority (Week 5-6)

7. **Rating 2.0 Implementation**
   - Valorant Rating 2.0 service
   - CS2 Rating 2.0 service
   - UI display and tooltips

8. **RecorderBots Implementation**
   - Audio recording functionality
   - File upload and storage
   - Admin recording access

9. **Admin Panel Enhancements**
   - Hub management UI
   - Recording library
   - Enhanced user management

### Lower Priority (Week 7-8)

10. **Ranked Global Queue (Trayb Series)**
    - Scheduling system
    - Matchmaking algorithm
    - Queue status UI

11. **Enhanced Statistics**
    - Stats import improvements
    - Performance percentiles
    - Trend analysis

12. **UI/UX Polish**
    - Theme refinements
    - Animation improvements
    - Accessibility audit and fixes

---

## 16. Technical Debt & Refactoring

### Current Issues to Address

1. **No Local .env Files Requirement**
   - Current: Uses .env files with setup-env.sh
   - Required: Production-ready config management
   - Action: Evaluate centralized config service or runtime injection

2. **Embedded Discord Bot**
   - Current: Bot logic in backend
   - Required: Separate ControlBot application
   - Action: Extract and modularize

3. **Single ELO Field**
   - Current: user.elo stores one value
   - Required: Game-specific + hub-specific ELO
   - Action: Migrate to player_ratings table

4. **WPR vs Rating 2.0**
   - Current: Weighted Performance Rating (WPR)
   - Required: VLR/HLTV-style Rating 2.0
   - Action: Implement proper Rating 2.0 calculation

5. **Hardcoded Valorant Assumptions**
   - Current: Map names, agent logic hardcoded
   - Required: Game abstraction layer
   - Action: Refactor to game services

6. **Basic Role System**
   - Current: 4-level enum
   - Required: 5-level RBAC with permissions
   - Action: Database schema change + middleware refactor

### Code Quality Improvements

**Tasks:**
- Add ESLint rules for consistency
- Set up Prettier auto-formatting
- Implement TypeScript strict mode
- Add comprehensive JSDoc comments
- Create coding standards document
- Set up commit hooks (Husky) for linting
- Implement code review checklist

---

## 17. Dependencies & External Services

### Required External Services

1. **Database:** PostgreSQL 16+ (already in use)
2. **Cache/Queue:** Redis 7+ (already in use)
3. **File Storage:** Local or S3-compatible storage (for recordings)
4. **Discord:** Bot tokens for ControlBot + 2 RecorderBots
5. **Random.org API:** Already in use for randomization
6. **GRID Esports API:** Phase 2 - Valorant stats (requires subscription)
7. **Optional:** Sentry for error tracking
8. **Optional:** Cloudflare for CDN and DDoS protection

### New Dependencies to Add

**Backend:**
- `@discordjs/voice` - Voice recording for RecorderBots
- `prism-media` - Audio processing
- `fluent-ffmpeg` - Audio file manipulation
- `demofile` (CS2 demo parsing - Phase 2)
- `aws-sdk` or `minio` - S3-compatible storage client

**Frontend:**
- `recharts` or `chart.js` - ELO history graphs, radar charts
- `react-player` - Audio playback for recordings
- `framer-motion` - Enhanced animations (already installed)

**Shared:**
- Create `/packages/shared` with common types

---

## 18. Success Metrics Implementation

### KPI Tracking Implementation

**Specification Metrics:**

**Technical KPIs:**
- API response time <200ms (p95)
- Database query optimization (indexed lookups)
- Zero downtime deployments
- 99.9% uptime SLA

**Implementation:**
- Set up Prometheus metrics collection
- Create Grafana dashboard with SLA targets
- Implement database query logging and analysis
- Add response time monitoring middleware
- Set up uptime monitoring (UptimeRobot or similar)

**User Experience KPIs:**
- Match creation to start: <5 minutes
- Stats processing: <2 minutes post-upload
- ELO calculation accuracy: ±5 points max error
- Rating 2.0 calculation: Match VLR/HLTV within 2%

**Implementation:**
- Add timing instrumentation to match flow
- Create stats processing job monitoring
- Implement ELO calculation validation tests
- Create Rating 2.0 accuracy testing suite
- Build admin dashboard showing these metrics

**Platform Growth KPIs:**
- Active players per day
- Matches played per week
- Tournament registrations (post-Phase 2)
- Player retention rate

**Implementation:**
- Create analytics database tables
- Implement daily/weekly aggregation jobs
- Build analytics dashboard (admin panel)
- Set up automated reports
- Add user activity tracking

---

## 19. Migration Strategy

### Database Migration Plan

**Steps:**
1. Create migration scripts for new tables
2. Run migration on development database
3. Test all existing functionality
4. Create data migration scripts:
   - Migrate user.elo → player_ratings (Valorant, global hub)
   - Migrate UserRole enum → roles + user_roles tables
   - Initialize games table (Valorant, CS2)
   - Create default hub (Trayb Series, global)
5. Run migration on staging/beta environment
6. Perform full test cycle
7. Schedule maintenance window for production migration
8. Execute production migration with rollback plan ready
9. Verify data integrity
10. Re-enable services

### Code Migration Plan

**Backend:**
1. Create `/packages/shared` structure
2. Move shared types from backend
3. Update imports across backend
4. Test backend compilation
5. Create bot application skeletons
6. Extract bot logic from backend
7. Update backend to use bot APIs
8. Test bot communication
9. Deploy all services

**Frontend:**
1. Move shared types to `/packages/shared`
2. Update imports across frontend
3. Test frontend compilation
4. Implement subdomain routing
5. Separate admin and public layouts
6. Test both domains

### Feature Flag Strategy

**Use Feature Flags for:**
- Queue types (enable unranked first, then ranked)
- CS2 support (enable after Valorant is stable)
- Recording system (test with small group)
- Tournament system (Phase 2)

**Implementation:**
- Add feature_flags table to database
- Create feature flag middleware
- Implement UI hiding for disabled features
- Create admin toggle for feature flags

---

## 20. Risk Mitigation

### High-Risk Areas

**1. Database Migration Complexity**
- Risk: Data loss or corruption during migration
- Mitigation:
  - Full database backup before migration
  - Test migrations multiple times on staging
  - Implement rollback scripts
  - Have DBA review migration scripts
  - Schedule during low-traffic period

**2. Bot Architecture Change**
- Risk: Voice features break during bot separation
- Mitigation:
  - Implement feature flag for new bot system
  - Run old and new systems in parallel during transition
  - Thorough testing of voice connections
  - Gradual rollout (beta → production)

**3. Audio Recording Legal Concerns**
- Risk: Privacy/legal issues with recording player audio
- Mitigation:
  - Add terms of service clause about recording
  - Require explicit consent for tournament matches
  - Implement strict access control (admin only)
  - Add recording indicator in Discord VC
  - Document data retention and deletion policies

**4. Multi-Game Complexity**
- Risk: Bugs in game-specific logic
- Mitigation:
  - Extensive unit testing for each game service
  - Separate test suites for Valorant and CS2
  - Feature flag CS2 support initially
  - Community beta testing per game

**5. ELO System Changes**
- Risk: Player dissatisfaction with ELO changes
- Mitigation:
  - Grandfather existing ELO values
  - Communicate changes transparently
  - Provide ELO recalculation option
  - Allow admin to revert ELO if needed
  - Implement "season" system to reset periodically

---

## Conclusion

This document outlines all major tasks required to transform the current "Trayb Customs" platform into the full Trayb.az v3 specification. The implementation is complex and will require significant development effort across multiple areas: database, backend logic, bot architecture, frontend UI, and infrastructure.

---

## Unfinished Tasks / Follow-ups

### Section 1.3 - Domain Structure Implementation
- [ ] Test subdomain routing in local development (requires hosts file configuration)
- [ ] Verify subdomain routing works correctly after deployment
- [ ] Test role-based redirects with different user roles

### Section 2.1 - Core Schema Extensions
- [ ] Create data migration script to assign default game (Valorant) to existing matches
- [ ] Update backend code to use new schema (gameId, hubId, queueType, etc.)
- [ ] Update frontend to support game selection and hub filtering

### Section 2.2 - Role System Restructuring
- [ ] Update backend authentication/authorization code to use new RBAC system
- [ ] Create permission checking utilities/helpers
- [ ] Update frontend to use new role system
- [ ] Remove legacy UserRole enum once migration is complete

### Section 2.3 - Multi-Game ELO System
- [ ] Update all backend routes that use EloService to pass gameId, hubId, queueType
- [ ] Test Valorant Power Score calculation
- [ ] Test CS2 Premier rating conversion
- [ ] Test hub isolation (private hub ELO separate from global)

### Section 3.1 - ELO System Enhancements
- [ ] Update all backend routes that call calculateEloChange to pass gameId, hubId, queueType
- [ ] Test queue-specific persistence (unranked = no ELO change)
- [ ] Test hub isolation logic
- [ ] Verify League ELO updates correctly for Valorant global queue

### Section 3.2 - Rating 2.0 Implementation
- [ ] Update backend routes to calculate Rating 2.0 after match completion
- [ ] Add roundsPlayed tracking to matches (for accurate Rating 2.0 calculation)
- [ ] Enhance Valorant Rating 2.0 with round-by-round fight context (requires GRID API or detailed stats)
- [ ] Test Rating 2.0 calculation with real match data
- [ ] Add Rating 2.0 breakdown display to frontend
- [ ] Update leaderboards to include Rating 2.0 as secondary sort

### Section 4.1 - Queue System Architecture
- [ ] Update frontend match creation to support queue type selection
- [ ] Add game selection to match creation UI
- [ ] Add hub selection for private hub ranked matches
- [ ] Add queue status display to frontend

### Section 4.2 - Ranked Global (Trayb Series)
- [ ] Create queue UI with countdown to next window
- [ ] Display "Queue Open" indicator on dashboard
- [ ] Add notification system (Discord + in-app) for queue openings
- [ ] Test queue system end-to-end (join, ready, matchmaking)
- [ ] Create schedule management UI (admin panel)

### Section 4.3 - Private Hub System
- [ ] Create hub management UI (admin panel)
- [ ] Implement hub discovery page (show accessible hubs to user)
- [ ] Add hub selection to match creation flow
- [ ] Create hub-specific leaderboard pages (frontend)
- [ ] Implement hub statistics dashboard (admin view - frontend)
- [ ] Add hub filtering to match history

### Section 4.4 - Draft Phase Enhancements
- [ ] Create draft mode selector component (admin/creator only - frontend)
- [ ] Add UI indicator showing which draft mode is active (frontend)
- [ ] Integrate captain selection improvements in frontend (skip voting, random, admin override)
- [ ] Add draft history display to match page
- [ ] Test ELO balancing algorithm with real match data

### Section 5.1 - Game Abstraction Layer
- [ ] Update stats parsing to support both games (CS2 parsing needs implementation)
- [ ] Integrate game service factory into existing routes/services (elo.service.ts, rating20.service.ts, matches.ts)
- [ ] Add game selection to match creation UI (frontend)
- [ ] Create game filter for leaderboards and match history (frontend)

### Section 5.2 - CS2-Specific Features
- [ ] Implement CS2 demo parsing (GOTV demo files) - Requires demofile library integration
  - [ ] Research and integrate demofile library
  - [ ] Create demo upload endpoint
  - [ ] Extract player stats from demo
  - [ ] Map CS2 stats to PlayerMatchStats schema

### Section 5.3 - Game-Specific UI Components (All Frontend)
- [ ] Create game selection component (dropdown with icons)
- [ ] Design Valorant-specific match card (agent icons, ability usage)
- [ ] Design CS2-specific match card (weapon stats, economy)
- [ ] Implement game-specific stats display
- [ ] Add game filter to leaderboard page
- [ ] Create game-specific profile tabs (separate Valorant/CS2 stats)
- [ ] Design game-specific badges and achievements

### Section 6.1 - Stats Import Enhancement (Phase 1)
- [ ] Create multi-file upload UI (admin panel - frontend)
- [ ] Add stats preview table component (frontend)
- [ ] Improve HTML parsing reliability (extract scores, rounds from HTML)
- [ ] Add re-import capability (store import data for re-import)

### Section 2.4 - Prisma Migration Scripts
- [ ] Test migrations on development database (manual testing required)

### Dashboard Map Pool Management
- [ ] Implement map pool management system in admin dashboard
- [ ] Create two modes: CS2 mode and Valorant mode
- [ ] Allow admins to add/remove/activate/deactivate maps per game
- [ ] Update map pool order and display

**Recommended Approach:**
1. Start with database and RBAC foundation
2. Implement multi-game support structure
3. Build queue types and hub system
4. Separate bot architecture
5. Enhance UI and statistics
6. Polish and deploy

**Estimated Timeline:** 8-10 weeks for Phase 1 (assuming full-time development)

**Next Steps:**
- Review this document with the team
- Prioritize specific tasks
- Assign ownership for each module
- Set up project tracking (Jira, Linear, or GitHub Projects)
- Begin with database schema changes as the foundation

