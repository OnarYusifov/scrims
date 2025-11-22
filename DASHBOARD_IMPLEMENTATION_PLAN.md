# Dashboard Implementation Plan

## Trayb.az Admin Dashboard (admin.trayb.az)

**Version:** 1.0  
**Date:** November 20, 2025  
**Status:** In Progress
**Tech Stack:** Next.js 16, shadcn/ui (default components only), React 19, TypeScript

---

## Table of Contents

1. [Overview](#overview)
2. [Dashboard Architecture](#dashboard-architecture)
3. [Core Functionalities](#core-functionalities)
4. [shadcn/ui Components Required](#shadcnui-components-required)
5. [Page Structure & Routing](#page-structure--routing)
6. [Detailed Feature Breakdown](#detailed-feature-breakdown)
7. [Implementation Phases](#implementation-phases)
8. [Data Flow & API Integration](#data-flow--api-integration)

---

## Overview

### Purpose

The admin dashboard serves as the central management interface for Trayb.az platform administrators to manage matches, tournaments, players, hubs, recordings, and platform settings.

### Access Control

- **Domain:** `admin.trayb.az` (subdomain routing)
- **Required Roles:** Admin, Moderator, Organizer (based on RBAC system)
- **Authentication:** NextAuth v5 with JWT tokens
- **Middleware:** Role-based access control for each admin route

### Design Philosophy

- Use **shadcn/ui default components only** - no custom UI components
- Clean, professional admin interface
- Responsive design (desktop-first, mobile-compatible)
- Consistent with shadcn "new-york" style
- Dark/Light theme support

---

## Dashboard Architecture

### Layout Structure

```
admin.trayb.az/
├── layout.tsx (Admin Shell Layout)
│   ├── Sidebar Navigation
│   ├── Top Header Bar
│   └── Main Content Area
└── pages/
    ├── dashboard/ (Overview)
    ├── matches/
    ├── tournaments/
    ├── players/
    ├── hubs/
    ├── recordings/
    ├── settings/
    └── roles/
```

### Navigation Sidebar (Using shadcn components)

**Components:** `Sheet`, `ScrollArea`, `Separator`, `Button`, `Badge`

**Main Sections:**

1. **Dashboard Home** (LayoutDashboard icon)
2. **Match Management** (Trophy icon)
   - Active Matches
   - Match History
   - Create Match
   - Import Stats
3. **Tournament Management** (Calendar icon) _Phase 2_
   - Active Tournaments
   - Create Tournament
   - Registrations
4. **Player Management** (Users icon)
   - All Players
   - Search Players
   - Role Assignment
   - Ban Management
5. **Hub Management** (Building2 icon)
   - All Hubs
   - Create Hub
   - Whitelist Management
6. **Queue Management** (Clock icon)
   - Trayb Series Schedule
   - Queue Status
   - Active Queues
7. **Recordings** (Video icon)
   - Recording Library
   - Access Logs
8. **Statistics** (BarChart3 icon)
   - Platform Metrics
   - ELO Distribution
   - Match Analytics
9. **Settings** (Settings icon)
   - Map Pool Management
   - Weight Profiles
   - System Configuration
10. **Audit Logs** (FileText icon)

---

## Core Functionalities

### 1. Creating Custom Matches

**Route:** `/admin/matches/create`

**Components Needed:**

- `Form` (react-hook-form + zod validation)
- `Select` (Game selection, Hub selection, Queue type)
- `Input` (Match name, Discord lobby ID)
- `Checkbox` (Recording enabled, Draft options)
- `RadioGroup` (Draft mode: Random, ELO-based, Captain)
- `Calendar` (Schedule match)
- `Button` (Submit, Cancel)
- `Card` (Form container)
- `Tabs` (Multi-step form if needed)
- `Command` (Player search/selection)

**Features:**

- **Game Selection**: Valorant or CS2
- **Hub Selection**: Global Trayb Series or Private Hub
- **Queue Type**: Unranked, Ranked Global, Private Ranked
- **Player Selection**: 10-player picker with search
- **Team Assignment Options**:
  - Random (via Random.org API)
  - ELO-balanced (snake draft)
  - Captain draft (with voting or admin override)
- **Map Selection**: Pick/ban or random from pool
- **Recording Toggle**: Enable/disable match recording
- **Discord Integration**: Lobby and VC creation settings
- **Scheduling**: Immediate or scheduled start

**Validation:**

- Exactly 10 players required
- No duplicate players
- All players must have access to selected hub (if private)
- Valid Discord lobby ID format

**Form Steps:**

1. Basic Info (Game, Hub, Queue Type, Match Name)
2. Player Selection (10 players with search)
3. Team Assignment (Choose method)
4. Map Selection (Pick/ban or random)
5. Settings (Recording, Discord, Scheduling)
6. Review & Create

---

### 2. Creating Tournaments, Seeding, Managing Registrations

**Route:** `/admin/tournaments/`

#### 2.1 Tournament Creation

**Route:** `/admin/tournaments/create`

**Components:**

- `Form` (Tournament details)
- `Input` (Name, Description, Prize pool)
- `Calendar` & `DateTimePicker` (Start/end dates)
- `Select` (Game, Format, Registration type)
- `Textarea` (Rules, Description)
- `Switch` (Public/Private, Registration open/closed)
- `Slider` (Max teams)
- `Badge` (Status indicator)

**Fields:**

- **Tournament Name**
- **Game**: Valorant / CS2
- **Format**: Single Elimination, Double Elimination, Round Robin, Swiss
- **Team Size**: 5v5 (Valorant/CS2)
- **Max Teams**: 8, 16, 32, 64
- **Registration Period**: Start/End dates
- **Tournament Dates**: Start/End dates
- **Prize Pool**: Optional
- **Rules & Description**: Rich text or markdown
- **Visibility**: Public or Hub-specific
- **Status**: Draft, Open for Registration, In Progress, Completed

#### 2.2 Team Registrations Management

**Route:** `/admin/tournaments/[id]/registrations`

**Components:**

- `DataTable` (Team list with sorting/filtering)
- `Badge` (Registration status)
- `Button` (Approve, Reject, Remove)
- `Dialog` (Confirm actions)
- `Input` (Search teams)
- `Select` (Filter by status)

**Features:**

- View all registered teams
- Approve/Reject team registrations
- Verify team rosters (5 players each)
- Check player eligibility (no banned players)
- Manual team addition (admin override)
- Export team list

**Team Registration Statuses:**

- Pending Review
- Approved
- Rejected
- Withdrawn
- Disqualified

#### 2.3 Tournament Seeding & Bracket

**Route:** `/admin/tournaments/[id]/bracket`

**Components:**

- `Card` (Bracket visualization)
- `Button` (Auto-seed, Manual seed, Shuffle)
- `DragDrop` (Manual seeding via dnd-kit)
- `Select` (Seeding method)
- `Dialog` (Seed editor)
- `Badge` (Team seed numbers)

**Seeding Methods:**

1. **Random**: Completely random seeding
2. **ELO-Based**: Seed by team average ELO
3. **Registration Order**: First come, first served
4. **Manual**: Drag-and-drop seeding

**Bracket Features:**

- Visual bracket display (tree structure)
- Edit match results
- Advance winners automatically
- Handle byes (odd number of teams)
- Lock/unlock bracket editing
- Generate match schedule

#### 2.4 Tournament Match Management

**Route:** `/admin/tournaments/[id]/matches`

**Components:**

- `DataTable` (Match list)
- `Button` (Create match, Edit, Delete)
- `Badge` (Match status)
- `Calendar` (Schedule view)
- `Select` (Round filter)
- `Tabs` (Upcoming, In Progress, Completed)

**Features:**

- Create matches for each round
- Assign Discord VCs per match
- Schedule match times
- Monitor match progress
- Import match stats
- Advance winners to next round
- Handle forfeits/walkovers

---

### 3. Managing Players

**Route:** `/admin/players/`

#### 3.1 Player List & Search

**Route:** `/admin/players/all`

**Components:**

- `DataTable` with pagination
- `Input` (Search by username, email, Discord ID)
- `Select` (Filter by role, game, hub)
- `Button` (Actions dropdown)
- `Badge` (Role, Status badges)
- `Avatar` (Player profile picture)
- `Dialog` (Player details modal)

**Table Columns:**

- Avatar
- Username
- Email
- Discord ID
- Role
- Valorant ELO
- CS2 Rating
- Matches Played
- Status (Active, Banned, Suspended)
- Created Date
- Actions (View, Edit, Ban, Assign Role)

**Filters:**

- By Role (Admin, Moderator, Competitor, Viewer)
- By Status (Active, Banned)
- By Game (players who played Valorant/CS2)
- By Hub membership

#### 3.2 Player Profile View

**Route:** `/admin/players/[id]`

**Components:**

- `Tabs` (Overview, Stats, Matches, Badges, Audit Log)
- `Card` (Profile sections)
- `Badge` (Player badges)
- `Button` (Edit, Ban, Assign Badge)
- `DataTable` (Match history)
- `Chart` (ELO history graph using Recharts)
- `Alert` (Ban status if applicable)

**Sections:**

**Overview Tab:**

- Profile Info (Username, Email, Discord, Avatar)
- Account Status (Active, Verified, Banned)
- Role & Permissions
- Account Creation Date
- Last Login

**Stats Tab:**

- Valorant Stats (ELO, Rating 2.0, Matches, W/L, ACS, K/D, HS%)
- CS2 Stats (Rating, KAST, Impact, ADR, K/D)
- Per-Hub Stats (if player is in private hubs)
- Performance Trends (Last 5, 10, 20 matches)

**Matches Tab:**

- Full match history (filterable by game, hub, date)
- Recent matches with stats
- Export match data

**Badges Tab:**

- Assigned badges (Early Member, Founder, etc.)
- Add/Remove badges

**Audit Log Tab:**

- Role changes
- Bans/Unbans
- ELO adjustments
- Badge assignments

#### 3.3 Role Assignment

**Route:** `/admin/players/[id]/roles`

**Components:**

- `Form` (Role assignment)
- `Checkbox` (Multiple role selection - new RBAC system)
- `Select` (Primary role)
- `Badge` (Current roles)
- `Dialog` (Confirmation)
- `Textarea` (Reason for role change)

**Available Roles (RBAC System):**

1. **Organizer** (Level 1) - Full platform control
2. **Admin** (Level 2) - Full management access
3. **Moderator** (Level 3) - Limited management
4. **Competitor** (Level 4) - Player role
5. **Viewer** (Level 5) - Spectator only

**Permissions Preview:**

- Show what permissions each role grants
- Preview user's new permission set before confirming
- Log role change with reason

#### 3.4 Ban Management

**Route:** `/admin/players/[id]/ban`

**Components:**

- `Form` (Ban form)
- `Select` (Ban type: Temporary, Permanent)
- `Calendar` & `DateTimePicker` (Ban duration)
- `Textarea` (Ban reason - required)
- `Checkbox` (Ban from all hubs, Ban from Discord)
- `Alert` (Warning about ban consequences)
- `Button` (Confirm Ban, Cancel)

**Ban Types:**

1. **Temporary Ban**: Expires after X days
2. **Permanent Ban**: No expiry

**Ban Features:**

- Reason (required, logged)
- Duration (for temporary bans)
- Scope (Platform-wide or hub-specific)
- Discord integration (kick from server if enabled)
- Appeal system (future consideration)

**Ban Effects:**

- Cannot join matches
- Cannot register for tournaments
- Cannot access hubs
- Profile marked as banned
- Shown in audit logs

#### Backend Data Model & API Plan (roles + bans)

To keep admin actions auditable and scalable, add these Prisma models in one migration:

- **PlayerRole**
  - Fields: `id`, `userId`, `role` (`organizer` \| `admin` \| `moderator` \| `competitor` \| `viewer`), `isPrimary`, `assignedBy`, `reason`, `createdAt`.
  - Constraints: `(userId, role)` unique + exactly one `isPrimary` per user. Keep `User.role` synced to the primary role for Auth tokens.
  - `PUT /admin/players/:playerId/roles`: Zod validate → transaction deletes old roles, bulk inserts new ones, updates `User.role`, and logs the change (see `PlayerAuditLog`).

- **PlayerBan**
  - Fields: `id`, `userId`, `status` (`active`, `lifted`, `expired`), `type` (`temporary`, `permanent`), `reason`, `durationDays`, `banFromAllHubs`, `banFromDiscord`, `bannedBy`, `startsAt`, `endsAt`, `liftedAt`, `createdAt`.
  - Keep `User.status` mirrored with the latest active ban for fast filtering.
  - `POST /admin/players/:playerId/ban`: create ban row, set `User.status = 'banned'`, push audit entry, return ban snapshot.
  - `POST /admin/players/:playerId/unban`: locate latest active ban, mark lifted, set `User.status = 'active'`, log action.

- **PlayerAuditLog**
  - Fields: `id`, `userId` (target), `actorId` (admin), `action` (`role_change`, `ban`, `unban`, `note`), `metadata` (JSON), `reason`, `createdAt`.
  - Drives the Audit Log tab and gives observability for every admin action.

**Endpoint wiring summary**

1. `GET /admin/players/:playerId` — expand select to include roles, current ban, and the latest audit entries; extend Zod schema with optional `roles`, `activeBan`, and `auditLog` arrays.
2. `PUT /admin/players/:playerId/roles` — rebuild `PlayerRole`, sync `User.role`, insert audit log, return updated role payload.
3. `POST /admin/players/:playerId/ban` — create `PlayerBan`, update user status, log action.
4. `POST /admin/players/:playerId/unban` — mark ban lifted, restore user status, log action.

After editing `packages/db/prisma/schema.prisma`: run `pnpm db:migrate` (or `bunx prisma migrate dev`), regenerate the client, and rerun Vitest so the admin module tests cover the new branches.

#### 3.5 ELO Tools

**Route:** `/admin/players/[id]/elo`

**Components:**

- `Card` (ELO adjustment form)
- `Input` (New ELO value)
- `Textarea` (Reason for adjustment)
- `Select` (Game, Hub)
- `Button` (Recalculate All, Reset Calibration, Manual Adjust)
- `Alert` (Warning about ELO changes)
- `DataTable` (ELO history)

**ELO Tools:**

1. **Manual ELO Adjustment**
   - Adjust ELO for specific game/hub
   - Requires reason (logged)
   - Preview new rank

2. **Reset Calibration**
   - Reset player to calibration mode
   - Next 10 matches use higher K-factor

3. **Recalculate All ELOs**
   - Recalculate all players' ELO from scratch
   - Based on match history
   - Preview changes before applying
   - Create backup before recalculation

4. **League ELO Adjustment** (Valorant only)
   - Adjust League ELO separately from Team ELO
   - Used in Power Score calculation

---

### 4. Hub Management

**Route:** `/admin/hubs/`

#### 4.1 Hub List

**Route:** `/admin/hubs/all`

**Components:**

- `DataTable` (Hub list)
- `Card` (Hub card view alternative)
- `Badge` (Hub type: Global, Private)
- `Button` (Create Hub, Edit, Delete)
- `Input` (Search hubs)
- `Select` (Filter by game)

**Table Columns:**

- Hub Name
- Game (Valorant/CS2)
- Type (Global/Private)
- Whitelisted Players Count
- Active Matches
- Total Matches
- Created Date
- Actions

#### 4.2 Create Hub

**Route:** `/admin/hubs/create`

**Components:**

- `Form` (Hub creation)
- `Input` (Hub name, Description)
- `Select` (Game, Queue types allowed)
- `Switch` (Private/Public, Whitelist enabled)
- `Checkbox` (Draft options: Random, ELO, Captain)
- `Textarea` (Hub rules, Description)
- `Button` (Create, Cancel)

**Fields:**

- **Hub Name**: Display name
- **Game**: Valorant or CS2
- **Type**: Private (whitelist) or Public
- **Queue Types Allowed**: Unranked, Ranked
- **Draft Options**: Which draft methods are allowed
- **Map Pool**: Use default or custom map pool
- **Recording Policy**: Always, Optional, Never
- **ELO Settings**: Starting ELO, K-factor
- **Description & Rules**: Markdown supported

#### 4.3 Hub Whitelist Management

**Route:** `/admin/hubs/[id]/whitelist`

**Components:**

- `DataTable` (Whitelisted players)
- `Command` (Player search with autocomplete)
- `Button` (Add Player, Remove)
- `Input` (Search existing whitelist)
- `Dialog` (Confirm remove)
- `Badge` (Player status)

**Features:**

- Search and add players to whitelist
- Bulk add (upload CSV)
- Remove players from whitelist
- View player stats in hub
- Export whitelist
- Invite links (generate invite code)

#### 4.4 Hub Statistics

**Route:** `/admin/hubs/[id]/stats`

**Components:**

- `Card` (Metric cards)
- `Chart` (ELO distribution, Match activity)
- `DataTable` (Top players in hub)
- `Tabs` (Overview, Leaderboard, Match History)
- `Select` (Time range filter)

**Metrics:**

- Total Members
- Total Matches Played
- Average Match Duration
- ELO Distribution (histogram)
- Most Active Players
- Match Activity Over Time (line chart)
- Popular Maps

#### 4.5 Hub Settings

**Route:** `/admin/hubs/[id]/settings`

**Components:**

- `Form` (Hub settings)
- `Input` (Name, Description)
- `Switch` (Enable/disable features)
- `Select` (ELO settings)
- `Textarea` (Rules update)
- `Button` (Save, Delete Hub)
- `Alert` (Destructive actions warning)

**Settings:**

- Update hub name/description
- Enable/disable queue types
- Modify ELO parameters
- Update map pool
- Change recording policy
- Archive/Delete hub (with confirmation)

---

### 5. Queue Management (Trayb Series)

**Route:** `/admin/queue/`

#### 5.1 Queue Schedule Editor

**Route:** `/admin/queue/schedule`

**Components:**

- `Calendar` (Schedule view)
- `Form` (Add/Edit schedule entry)
- `TimePicker` (Start/end times)
- `Select` (Game, Day of week)
- `Switch` (Queue active/inactive)
- `Card` (Schedule entry card)
- `Button` (Add, Edit, Delete)

**Schedule Management:**

- Set recurring queue times (e.g., "Every Friday 8-10 PM")
- Set one-time special queues
- Enable/disable specific queue windows
- Preview next 30 days of schedules
- Timezone handling

**Schedule Entry Fields:**

- Day of Week (or specific date)
- Start Time
- End Time
- Game (Valorant/CS2)
- Hub (Global Trayb Series)
- Active/Inactive toggle

#### 5.2 Queue Status Monitor

**Route:** `/admin/queue/status`

**Components:**

- `Card` (Current queue status)
- `Badge` (Open/Closed status)
- `DataTable` (Players in queue)
- `Button` (Force open/close, Create match manually)
- `Alert` (Queue alerts: 10+ players ready)
- `Progress` (Match creation countdown)

**Real-time Monitoring:**

- Current queue status (Open/Closed)
- Players currently in queue
- Players ready status
- Auto-match creation countdown
- Manual match creation trigger
- Queue history (last 10 sessions)

#### 5.3 Active Queues

**Route:** `/admin/queue/active`

**Components:**

- `DataTable` (Active queue entries)
- `Badge` (Queue status)
- `Button` (View details, Cancel queue)
- `Card` (Queue summary)

**Features:**

- Monitor all active queue sessions
- View players in each queue
- Cancel queue if needed
- View queue wait times
- Historical queue data

---

### 6. Match Management

**Route:** `/admin/matches/`

#### 6.1 Active Matches

**Route:** `/admin/matches/active`

**Components:**

- `DataTable` (Live matches)
- `Badge` (Match status: Draft, In Progress, Completed)
- `Button` (View, End Match, Cancel)
- `Card` (Match card with score)
- `Alert` (Recording status)

**Features:**

- View all currently active matches
- Monitor match progress
- End matches manually
- Cancel matches (with reason)
- View Discord VC status
- Check recording status

#### 6.2 Match History

**Route:** `/admin/matches/history`

**Components:**

- `DataTable` (All matches with pagination)
- `Input` (Search by match ID, players)
- `Select` (Filter by game, hub, date range)
- `Button` (View details, Delete)
- `Calendar` (Date range picker)
- `Badge` (Match type, Status)

**Columns:**

- Match ID
- Date
- Game
- Hub
- Queue Type
- Teams/Score
- Recording Available
- Status
- Actions

#### 6.3 Match Details

**Route:** `/admin/matches/[id]`

**Components:**

- `Tabs` (Overview, Teams, Stats, Timeline, Recording)
- `Card` (Match info, Player stats)
- `DataTable` (Player stats table)
- `Badge` (Player badges, MVP)
- `Button` (Delete, Re-import Stats, Edit)
- `Alert` (Match issues)

**Sections:**

**Overview:**

- Match metadata (ID, Date, Game, Hub, Queue Type)
- Teams and final score
- Map played
- Duration
- Discord VC info

**Teams:**

- Team 1 & Team 2 rosters
- Player ELO before/after
- Draft method used
- Captain info (if captain draft)

**Stats:**

- Player stats table (ACS, K/D, HS%, Rating 2.0)
- MVP calculation
- Post-match ELO changes
- Performance breakdown

**Timeline:**

- Match creation time
- Draft phase duration
- Match start time
- Match end time
- Stats imported time
- Key events log

**Recording:**

- Recording metadata (if recorded)
- Download links (Team 1, Team 2)
- Recording duration
- File size
- Access log (who downloaded)

#### 6.4 Stats Import

**Route:** `/admin/matches/[id]/import-stats`

**Components:**

- `Form` (Stats import form)
- `Input` (File upload - multiple files)
- `Card` (File upload area with drag-drop)
- `DataTable` (Stats preview before import)
- `Button` (Upload, Preview, Import, Cancel)
- `Alert` (Validation warnings)
- `Progress` (Upload progress)
- `Tabs` (Manual entry or file upload)

**Import Methods:**

**1. tracker.gg HTML Upload:**

- Upload multiple HTML files (overview, combat, economy)
- Parse stats using Puppeteer
- Preview stats before confirming
- Validate stats (10 players, sums correct)

**2. GRID API (Phase 2 - Valorant):**

- Enter match ID from GRID
- Fetch match data via API
- Parse round-by-round stats
- Calculate Rating 2.0

**3. GOTV Demo (Phase 2 - CS2):**

- Upload .dem file
- Parse demo using demofile library
- Extract player stats
- Calculate Rating 2.0

**4. Manual Entry:**

- Form with all stat fields per player
- Validation for realistic values
- Preview before saving

**Validation Checks:**

- Exactly 10 players
- Total team kills = Enemy team deaths
- Stats within realistic ranges
- No duplicate players
- All required fields present

---

### 7. Recording Management

**Route:** `/admin/recordings/`

#### 7.1 Recording Library

**Route:** `/admin/recordings/all`

**Components:**

- `DataTable` (Recording list)
- `Card` (Recording card with preview)
- `Button` (Download, Delete, Play)
- `Badge` (Recording status, Team)
- `Dialog` (Audio player modal)
- `Input` (Search by match ID, date)
- `Select` (Filter by game, hub)

**Columns:**

- Match ID
- Date
- Game
- Teams
- Team 1 Recording (Download)
- Team 2 Recording (Download)
- File Size
- Duration
- Actions

**Features:**

- Download recordings (Team 1 & Team 2 separate)
- Play recordings in-browser (audio player)
- Delete old recordings (confirm dialog)
- Search by match ID
- Filter by date range
- Export recording metadata

#### 7.2 Recording Access Logs

**Route:** `/admin/recordings/access-logs`

**Components:**

- `DataTable` (Access log)
- `Badge` (Admin who accessed)
- `Input` (Search by admin, match ID)
- `Calendar` (Date filter)

**Log Columns:**

- Date/Time
- Admin User
- Match ID
- Recording Type (Team 1 or Team 2)
- Action (Downloaded, Played, Deleted)
- IP Address

**Purpose:**

- Audit trail for recording access
- Security compliance
- Track who accessed sensitive match recordings

---

### 8. Statistics Dashboard

**Route:** `/admin/stats/`

#### 8.1 Platform Overview

**Route:** `/admin/stats/overview`

**Components:**

- `Card` (Metric cards)
- `Chart` (Line charts, Bar charts, Pie charts using Recharts)
- `DataTable` (Top players, Recent matches)
- `Select` (Time range: 7d, 30d, 90d, All time)
- `Tabs` (Overview, Players, Matches, Hubs)

**Metrics:**

**Platform Health:**

- Total Registered Users
- Active Users (last 30 days)
- Total Matches Played
- Matches Today/This Week
- Total Tournaments
- Active Hubs

**Match Statistics:**

- Matches per day (line chart)
- Matches by game (pie chart: Valorant vs CS2)
- Matches by queue type (bar chart)
- Average match duration

**Player Statistics:**

- New registrations per day
- Player retention rate
- Active players per game
- ELO distribution (histogram)

#### 8.2 ELO Distribution

**Route:** `/admin/stats/elo-distribution`

**Components:**

- `Chart` (Histogram using Recharts)
- `Select` (Game, Hub)
- `Card` (Stats summary)
- `DataTable` (ELO brackets)

**Features:**

- ELO distribution histogram
- Separate charts per game (Valorant, CS2)
- Hub-specific distributions
- Rank distribution (Bronze, Silver, Gold, Platinum, Diamond, Immortal, Radiant)
- Average ELO per hub

#### 8.3 Match Analytics

**Route:** `/admin/stats/match-analytics`

**Components:**

- `Chart` (Time series, Bar charts)
- `Card` (Metric cards)
- `Select` (Game, Hub, Time range)
- `DataTable` (Top performing players)

**Analytics:**

- Match completion rate
- Average match duration by game
- Map popularity (which maps played most)
- Draft method usage (Random, ELO, Captain)
- Recording usage (% of matches recorded)
- Queue wait times (Trayb Series)

---

### 9. Settings

**Route:** `/admin/settings/`

#### 9.1 Map Pool Management

**Route:** `/admin/settings/maps`

**Components:**

- `Tabs` (Valorant, CS2)
- `DataTable` (Map list)
- `Switch` (Active/Inactive)
- `Button` (Add Map, Edit, Remove)
- `Form` (Add/Edit map)
- `Input` (Map name)
- `DragDrop` (Reorder maps using dnd-kit)

**Features:**

**Valorant Maps:**

- List of all Valorant maps
- Enable/disable maps for queue
- Set default maps
- Reorder map pick/ban order

**CS2 Maps:**

- List of all CS2 maps
- Enable/disable maps
- Set map pool for competitive
- Reorder map pool

**Map Fields:**

- Map Name
- Game
- Active/Inactive
- Order (for pick/ban)
- Image URL (optional)

#### 9.2 Weight Profiles (Rating 2.0 Tuning)

**Route:** `/admin/settings/weight-profiles`

**Components:**

- `Tabs` (Valorant, CS2)
- `Form` (Weight editor)
- `Slider` (Weight values 0-1)
- `Input` (Coefficient values)
- `Card` (Current profile display)
- `Button` (Save, Reset to Default)
- `Alert` (Warning about changing weights)

**Valorant Rating 2.0 Weights:**

- Kill Contribution Weight
- Death Contribution Weight
- APR Weight
- ADRa Weight
- Survival Rating Weight

**CS2 Rating 2.0 Coefficients:**

- KAST Coefficient
- KPR Coefficient
- DPR Coefficient
- Impact Coefficient
- ADR Coefficient

**Features:**

- Adjust calculation weights
- Test weights with sample data
- Revert to default (VLR/HLTV formulas)
- Backup/restore weight profiles

#### 9.3 System Configuration

**Route:** `/admin/settings/system`

**Components:**

- `Form` (System settings)
- `Input` (Configuration values)
- `Switch` (Feature toggles)
- `Textarea` (SMTP config, API keys)
- `Card` (Config sections)
- `Button` (Save, Test Configuration)
- `Alert` (Warnings for sensitive settings)

**Configuration Categories:**

**Discord Integration:**

- Control Bot Token
- Recorder Bot 1 Token
- Recorder Bot 2 Token
- Default Server ID
- Default Lobby Channel ID

**Recording Settings:**

- Enable/Disable Recording System
- Recording Quality
- Auto-delete after X days
- Storage Limit

**ELO Settings:**

- Default Starting ELO
- K-factor (default: 32)
- Calibration matches (default: 10)

**Email Settings:**

- SMTP Configuration
- Email Templates
- Notification Settings

**API Keys:**

- Random.org API Key
- GRID Esports API Key (Phase 2)
- Steam API Key (if using)

---

### 10. Audit Logs

**Route:** `/admin/audit-logs/`

**Components:**

- `DataTable` (Audit log entries with pagination)
- `Input` (Search by user, action, resource)
- `Select` (Filter by action type, resource type)
- `Calendar` (Date range filter)
- `Badge` (Action type badge)
- `Dialog` (View full log entry details)

**Columns:**

- Timestamp
- Admin User
- Action Type (Create, Update, Delete, Ban, ELO Adjust)
- Resource Type (Player, Match, Tournament, Hub)
- Resource ID
- Changes (JSON diff)
- Reason (if provided)
- IP Address

**Logged Actions:**

- Role assignments
- Player bans/unbans
- ELO manual adjustments
- Match creation/deletion
- Tournament creation/management
- Hub creation/modification
- Whitelist changes
- System setting changes
- Recording accesses

---

## shadcn/ui Components Required

### Already Installed

- Avatar
- Dialog
- Dropdown Menu
- Label
- Progress
- Scroll Area
- Select
- Separator
- Slot
- Tabs
- Toast
- Tooltip

### Need to Install

#### Core Layout & Navigation

- `Sheet` - Sidebar/Mobile navigation
- `Command` - Search and command palette
- `Breadcrumb` - Page navigation breadcrumbs

#### Data Display

- `Card` - Primary container component (HIGH PRIORITY)
- `Data Table` - Tables with sorting/filtering (HIGH PRIORITY)
- `Badge` - Status indicators, role tags (HIGH PRIORITY)
- `Chart` - Recharts integration (HIGH PRIORITY)
- `Skeleton` - Loading states (HIGH PRIORITY)
- `Pagination` - Table pagination

#### Forms & Inputs

- `Form` - react-hook-form integration (HIGH PRIORITY)
- `Input` - Text inputs (HIGH PRIORITY)
- `Textarea` - Multi-line text inputs
- `Checkbox` - Checkboxes for multi-select
- `Radio Group` - Radio button groups
- `Switch` - Toggle switches
- `Slider` - Range sliders (for weight profiles)
- `Calendar` - Date picker (HIGH PRIORITY)
- `Popover` - Dropdown content, tooltips

#### Feedback & Overlays

- `Alert` - Warning/info messages (HIGH PRIORITY)
- `Alert Dialog` - Confirmation dialogs

#### Utilities

- `Collapsible` - Expandable sections
- `Accordion` - FAQ-style collapsible content
- `Resizable` - Resizable panels (optional)

---

## Page Structure & Routing

### Admin Layout Structure

```typescript
// apps/frontend/app/admin/layout.tsx
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { AdminHeader } from '@/components/admin/admin-header'

export default function AdminLayout({ children }) {
  return (
    <div className="flex h-screen">
      <AdminSidebar />
      <div className="flex-1 flex flex-col">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

### Route Hierarchy

```
/admin/
├── page.tsx                          // Dashboard overview
├── matches/
│   ├── page.tsx                      // Active matches
│   ├── create/page.tsx               // Create match
│   ├── history/page.tsx              // Match history
│   ├── [id]/
│   │   ├── page.tsx                  // Match details
│   │   └── import-stats/page.tsx    // Import stats
├── tournaments/
│   ├── page.tsx                      // Tournament list
│   ├── create/page.tsx               // Create tournament
│   ├── [id]/
│   │   ├── page.tsx                  // Tournament details
│   │   ├── registrations/page.tsx   // Manage registrations
│   │   ├── bracket/page.tsx         // Bracket & seeding
│   │   └── matches/page.tsx         // Tournament matches
├── players/
│   ├── page.tsx                      // Player list
│   ├── [id]/
│   │   ├── page.tsx                  // Player profile
│   │   ├── roles/page.tsx           // Assign roles
│   │   ├── ban/page.tsx             // Ban management
│   │   └── elo/page.tsx             // ELO tools
├── hubs/
│   ├── page.tsx                      // Hub list
│   ├── create/page.tsx               // Create hub
│   ├── [id]/
│   │   ├── page.tsx                  // Hub overview
│   │   ├── whitelist/page.tsx       // Whitelist management
│   │   ├── stats/page.tsx           // Hub statistics
│   │   └── settings/page.tsx        // Hub settings
├── queue/
│   ├── schedule/page.tsx             // Queue schedule editor
│   ├── status/page.tsx               // Queue status monitor
│   └── active/page.tsx               // Active queues
├── recordings/
│   ├── page.tsx                      // Recording library
│   └── access-logs/page.tsx          // Access logs
├── stats/
│   ├── overview/page.tsx             // Platform overview
│   ├── elo-distribution/page.tsx    // ELO distribution
│   └── match-analytics/page.tsx     // Match analytics
├── settings/
│   ├── maps/page.tsx                 // Map pool management
│   ├── weight-profiles/page.tsx     // Rating 2.0 tuning
│   └── system/page.tsx               // System config
└── audit-logs/
    └── page.tsx                      // Audit logs
```

---

## Detailed Feature Breakdown

### Match Creation Flow (Step-by-Step)

**Route:** `/admin/matches/create`

**Step 1: Basic Information**

```tsx
<Card>
  <CardHeader>
    <CardTitle>Create New Match</CardTitle>
    <CardDescription>Step 1: Basic Information</CardDescription>
  </CardHeader>
  <CardContent>
    <Form>
      <FormField name="game">
        <Select>
          {" "}
          // Valorant or CS2
          <SelectItem value="valorant">Valorant</SelectItem>
          <SelectItem value="cs2">CS2</SelectItem>
        </Select>
      </FormField>
      <FormField name="hub">
        <Select>
          {" "}
          // Global or Private Hubs // Dynamically loaded hub list
        </Select>
      </FormField>
      <FormField name="queueType">
        <Select>
          {" "}
          // Queue type
          <SelectItem value="unranked">Unranked</SelectItem>
          <SelectItem value="ranked_global">Ranked Global</SelectItem>
          <SelectItem value="private_ranked">Private Ranked</SelectItem>
        </Select>
      </FormField>
      <FormField name="matchName">
        <Input placeholder="Match Name (optional)" />
      </FormField>
    </Form>
  </CardContent>
  <CardFooter>
    <Button onClick={nextStep}>Next: Select Players</Button>
  </CardFooter>
</Card>
```

**Step 2: Player Selection**

```tsx
<Card>
  <CardHeader>
    <CardTitle>Select Players (10 required)</CardTitle>
  </CardHeader>
  <CardContent>
    <Command>
      {" "}
      // Search and select players
      <CommandInput placeholder="Search players..." />
      <CommandList>
        <CommandGroup heading="Available Players">
          {players.map((player) => (
            <CommandItem onSelect={() => addPlayer(player)}>
              <Avatar src={player.avatar} />
              {player.username} - ELO: {player.elo}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>

    <div className="mt-4">
      <h3>Selected Players ({selectedPlayers.length}/10)</h3>
      {selectedPlayers.map((player) => (
        <Badge variant="secondary">
          {player.username}
          <Button size="sm" onClick={() => removePlayer(player)}>
            X
          </Button>
        </Badge>
      ))}
    </div>
  </CardContent>
  <CardFooter>
    <Button onClick={previousStep}>Back</Button>
    <Button onClick={nextStep} disabled={selectedPlayers.length !== 10}>
      Next: Team Assignment
    </Button>
  </CardFooter>
</Card>
```

**Step 3: Team Assignment**

```tsx
<Card>
  <CardHeader>
    <CardTitle>Team Assignment</CardTitle>
  </CardHeader>
  <CardContent>
    <RadioGroup value={draftMode} onValueChange={setDraftMode}>
      <div>
        <RadioGroupItem value="random" />
        <Label>Random Assignment (via Random.org)</Label>
      </div>
      <div>
        <RadioGroupItem value="elo_balanced" />
        <Label>ELO-Balanced (Snake Draft)</Label>
      </div>
      <div>
        <RadioGroupItem value="captain" />
        <Label>Captain Draft</Label>
      </div>
    </RadioGroup>

    {draftMode === 'captain' && (
      <div className="mt-4">
        <h4>Captain Selection</h4>
        <Checkbox checked={skipCaptainVoting}>
          Skip voting, assign captains directly
        </Checkbox>
        {skipCaptainVoting && (
          <>
            <Select> // Captain 1
              {selectedPlayers.map(...)}
            </Select>
            <Select> // Captain 2
              {selectedPlayers.map(...)}
            </Select>
          </>
        )}
      </div>
    )}
  </CardContent>
  <CardFooter>
    <Button onClick={previousStep}>Back</Button>
    <Button onClick={nextStep}>Next: Map Selection</Button>
  </CardFooter>
</Card>
```

**Step 4: Map Selection**

```tsx
<Card>
  <CardHeader>
    <CardTitle>Map Selection</CardTitle>
  </CardHeader>
  <CardContent>
    <RadioGroup value={mapSelectionMode}>
      <div>
        <RadioGroupItem value="random" />
        <Label>Random from pool</Label>
      </div>
      <div>
        <RadioGroupItem value="pick_ban" />
        <Label>Pick/Ban Phase</Label>
      </div>
      <div>
        <RadioGroupItem value="specific" />
        <Label>Specific Map</Label>
      </div>
    </RadioGroup>

    {mapSelectionMode === "specific" && (
      <Select>
        {mapPool.map((map) => (
          <SelectItem value={map.id}>{map.name}</SelectItem>
        ))}
      </Select>
    )}
  </CardContent>
  <CardFooter>
    <Button onClick={previousStep}>Back</Button>
    <Button onClick={nextStep}>Next: Settings</Button>
  </CardFooter>
</Card>
```

**Step 5: Match Settings**

```tsx
<Card>
  <CardHeader>
    <CardTitle>Match Settings</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      <div>
        <Label>Discord Lobby Channel ID</Label>
        <Input placeholder="123456789..." />
      </div>

      <div>
        <Switch
          checked={recordingEnabled}
          onCheckedChange={setRecordingEnabled}
        />
        <Label>Enable Match Recording</Label>
      </div>

      <div>
        <Label>Schedule Match (optional)</Label>
        <Calendar
          mode="single"
          selected={scheduledDate}
          onSelect={setScheduledDate}
        />
      </div>
    </div>
  </CardContent>
  <CardFooter>
    <Button onClick={previousStep}>Back</Button>
    <Button onClick={nextStep}>Review & Create</Button>
  </CardFooter>
</Card>
```

**Step 6: Review & Create**

```tsx
<Card>
  <CardHeader>
    <CardTitle>Review Match Details</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      <div>
        <h4>
          Game: <Badge>{matchData.game}</Badge>
        </h4>
        <h4>
          Hub: <Badge>{matchData.hub}</Badge>
        </h4>
        <h4>
          Queue Type: <Badge>{matchData.queueType}</Badge>
        </h4>
      </div>

      <div>
        <h4>Players ({matchData.players.length}):</h4>
        {matchData.players.map((p) => (
          <Badge>{p.username}</Badge>
        ))}
      </div>

      <div>
        <h4>Draft Mode: {matchData.draftMode}</h4>
        <h4>Map Selection: {matchData.mapSelectionMode}</h4>
        <h4>
          Recording: {matchData.recordingEnabled ? "Enabled" : "Disabled"}
        </h4>
      </div>
    </div>
  </CardContent>
  <CardFooter>
    <Button onClick={previousStep}>Back</Button>
    <Button onClick={handleCreateMatch} disabled={creating}>
      {creating ? "Creating..." : "Create Match"}
    </Button>
  </CardFooter>
</Card>
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goal:** Set up admin layout and core infrastructure

**Tasks:**

1. Install missing shadcn/ui components (Card, Data Table, Form, Input, Calendar, Badge, Chart)
2. Create admin layout with sidebar navigation
3. Implement subdomain routing (`admin.trayb.az`)
4. Set up role-based middleware (Admin/Moderator only)
5. Create admin header with user dropdown
6. Build sidebar navigation component
7. Create dashboard overview page with placeholder metrics

**Deliverables:**

- `/admin/layout.tsx` - Admin shell layout
- `/admin/page.tsx` - Dashboard overview
- Sidebar navigation component
- Admin header component
- Middleware for role checks

### Phase 2: Player Management (Week 2-3)

**Goal:** Complete player management features

**Tasks:**

1. Player list page with DataTable
2. Player search and filtering
3. Player profile view (all tabs)
4. Role assignment page
5. Ban management page
6. ELO tools implementation
7. Integrate with existing backend APIs

**Deliverables:**

- `/admin/players/*` - All player pages
- Player components (profile card, stats display)
- Ban form component
- ELO adjustment tools

### Phase 3: Match Management (Week 3-4)

**Goal:** Complete match creation and management

**Tasks:**

1. Match creation flow (all 6 steps)
2. Active matches page
3. Match history page
4. Match details page
5. Stats import page (tracker.gg HTML)
6. Delete match functionality
7. Integrate with backend match APIs

**Deliverables:**

- `/admin/matches/*` - All match pages
- Multi-step form component for match creation
- Player selector component (Command)
- Stats import form

### Phase 4: Hub Management (Week 4-5)

**Goal:** Complete hub management system

**Tasks:**

1. Hub list page
2. Create hub page
3. Hub whitelist management
4. Hub statistics dashboard
5. Hub settings page
6. Integrate with backend hub APIs

**Deliverables:**

- `/admin/hubs/*` - All hub pages
- Whitelist editor component
- Hub form components

### Phase 5: Queue & Recording (Week 5-6)

**Goal:** Complete queue and recording features

**Tasks:**

1. Queue schedule editor
2. Queue status monitor
3. Recording library
4. Recording access logs
5. Audio player component
6. Integrate with backend queue/recording APIs

**Deliverables:**

- `/admin/queue/*` - Queue pages
- `/admin/recordings/*` - Recording pages
- Calendar component for schedule editing

### Phase 6: Statistics & Settings (Week 6-7)

**Goal:** Complete statistics dashboard and settings

**Tasks:**

1. Platform statistics overview (charts with Recharts)
2. ELO distribution chart
3. Match analytics
4. Map pool management
5. Weight profile editor
6. System configuration page
7. Audit logs page

**Deliverables:**

- `/admin/stats/*` - Statistics pages
- `/admin/settings/*` - Settings pages
- `/admin/audit-logs` - Audit log viewer
- Chart components (line, bar, pie, histogram)

### Phase 7: Tournament System (Phase 2 - January)

**Goal:** Add tournament management

**Tasks:**

1. Tournament creation page
2. Registration management
3. Bracket builder with seeding
4. Tournament match management
5. Tournament statistics

**Deliverables:**

- `/admin/tournaments/*` - Tournament pages
- Bracket visualization component
- Team registration components

---

## Data Flow & API Integration

### API Communication Pattern

**Base URL:** `https://api.trayb.az` (from `BACKEND_URL` env variable)

**Authentication:**

```typescript
// All admin requests must include JWT token
const headers = {
  Authorization: `Bearer ${session.token}`,
  "Content-Type": "application/json",
};
```

### Key Backend APIs (To Be Created)

#### Player Management APIs

```typescript
GET    /api/admin/players              // List players (with pagination, filters)
GET    /api/admin/players/:id          // Get player details
PUT    /api/admin/players/:id/roles    // Assign roles
POST   /api/admin/players/:id/ban      // Ban player
DELETE /api/admin/players/:id/ban      // Unban player
PUT    /api/admin/players/:id/elo      // Adjust ELO
GET    /api/admin/players/:id/audit    // Get audit log
```

#### Match Management APIs

```typescript
POST   /api/admin/matches              // Create match
GET    /api/admin/matches              // List matches (with filters)
GET    /api/admin/matches/:id          // Get match details
DELETE /api/admin/matches/:id          // Delete match
POST   /api/admin/matches/:id/stats    // Import stats (tracker.gg)
PUT    /api/admin/matches/:id/end      // End match manually
```

#### Hub Management APIs

```typescript
POST   /api/admin/hubs                 // Create hub
GET    /api/admin/hubs                 // List hubs
GET    /api/admin/hubs/:id             // Get hub details
PUT    /api/admin/hubs/:id             // Update hub
DELETE /api/admin/hubs/:id             // Delete hub
GET    /api/admin/hubs/:id/whitelist   // Get whitelist
POST   /api/admin/hubs/:id/whitelist   // Add player to whitelist
DELETE /api/admin/hubs/:id/whitelist/:playerId  // Remove from whitelist
GET    /api/admin/hubs/:id/stats       // Get hub statistics
```

#### Queue Management APIs

```typescript
GET    /api/admin/queue/schedule       // Get queue schedule
POST   /api/admin/queue/schedule       // Add schedule entry
PUT    /api/admin/queue/schedule/:id   // Update schedule
DELETE /api/admin/queue/schedule/:id   // Delete schedule
GET    /api/admin/queue/status         // Get current queue status
GET    /api/admin/queue/active         // Get active queues
```

#### Recording APIs

```typescript
GET    /api/admin/recordings           // List recordings
GET    /api/admin/recordings/:id       // Get recording details
GET    /api/admin/recordings/:id/download  // Download recording
DELETE /api/admin/recordings/:id       // Delete recording
GET    /api/admin/recordings/access-logs   // Get access logs
```

#### Tournament APIs (Phase 2)

```typescript
POST   /api/admin/tournaments          // Create tournament
GET    /api/admin/tournaments/:id      // Get tournament details
PUT    /api/admin/tournaments/:id      // Update tournament
GET    /api/admin/tournaments/:id/registrations  // Get registrations
PUT    /api/admin/tournaments/:id/registrations/:teamId  // Approve/reject
POST   /api/admin/tournaments/:id/bracket  // Generate bracket
PUT    /api/admin/tournaments/:id/bracket  // Update bracket/seeding
```

#### Statistics APIs

```typescript
GET / api / admin / stats / overview; // Platform metrics
GET / api / admin / stats / elo - distribution; // ELO histogram data
GET / api / admin / stats / match - analytics; // Match analytics
```

**Implementation notes (Phase 1 – backend ready):**

- Persist raw match data so stats stay "real", not mocked. Added Prisma models `Match`, `MatchPlayer`, and `PlayerEloHistory` plus enums for `GameId`, `MatchStatus`, `MatchOutcome`, and `MatchTeam`.
- Seed script now creates a small Valorant/CS2 dataset (five matches across two demo competitors + admin test account) so Swagger charts populate immediately in local/dev.
- `/api/admin/stats/match-analytics`
  - **Query**: `game` (enum), optional `from`, `to`, `hubId`.
  - **Response**: totals (matches, avg duration, rounds), outcome split, per-map heatmap, recency trend (matches per day + avg rating delta) and top-performer panel (kills, ACS, rating delta).
  - **Source**: aggregates over `Match` + `MatchPlayer`, falls back to seeded defaults when range has no games.
- `/api/admin/stats/elo-distribution`
  - **Query**: `game`, optional `hubId`.
  - **Response**: histogram buckets derived from the latest `PlayerEloHistory` entry per player, plus min/median/p95 helpers for UI sparklines.
- `/api/admin/stats/overview`
  - **Response**: combines player KPIs (active/banned/new this week) with match totals + streaks using the same primitives above so the dashboard header stays in sync with deeper charts.
- `/admin/players/{id}` detail view now consumes a dedicated player-stats service (30-day lookback) that aggregates `MatchPlayer` + `PlayerEloHistory` into per-game summaries, recent match feed, and rating history. Adding/removing metrics is just a new reducer inside that service—no route rewrites required.

#### Settings APIs

```typescript
GET / api / admin / settings / maps; // Get map pool
PUT / api / admin / settings / maps; // Update map pool
GET / api / admin / settings / weight - profiles; // Get weight profiles
PUT / api / admin / settings / weight - profiles; // Update weight profiles
GET / api / admin / settings / system; // Get system config
PUT / api / admin / settings / system; // Update system config
```

#### Audit Log API

```typescript
GET / api / admin / audit - logs; // Get audit logs (with pagination, filters)
```

---

## Implementation TODO

- [x] Establish shared backend Swagger configuration module
- [x] Scaffold backend integration test harness (Vitest + Fastify inject)
- [x] Migrate authentication login/device routes into the auth module with Zod schemas
- [x] Modularize user, OAuth, and Steam routes with shared schemas
- [x] Wire `/admin/players` list endpoint to Prisma (no more mock data) + add integration tests
- [x] Hook `/admin/players/{playerId}` detail view to Prisma + cover with tests
- [x] Persist admin role updates + ban/unban flows via Prisma (with audit logs & tests)
- [x] Implement `/admin/audit-logs` endpoint with pagination/filters + tests
- [x] Build admin settings APIs (system/maps/weight profiles) backed by Prisma + tests
- [ ] Migrate backend routes into modular structure with Zod-powered schemas

---

## State Management Strategy

### Local State (React useState)

Use for:

- Form inputs
- UI toggles (modals, dropdowns)
- Temporary data (draft state)

### Server State (SWR or TanStack Query)

Use for:

- API data fetching
- Auto-refresh for live data (active matches, queue status)
- Caching strategy

**Example with SWR:**

```typescript
import useSWR from "swr";

// Fetch player list
const { data, error, mutate } = useSWR("/api/admin/players", fetcher, {
  refreshInterval: 30000, // Auto-refresh every 30s
});

// Fetch match details
const { data: match } = useSWR(`/api/admin/matches/${matchId}`, fetcher);
```

### Global State (Zustand - already installed)

Use for:

- User session/role
- Admin settings
- Notification system

**Example Store:**

```typescript
// stores/admin-store.ts
import { create } from "zustand";

interface AdminStore {
  user: AdminUser | null;
  notifications: Notification[];
  addNotification: (notif: Notification) => void;
}

export const useAdminStore = create<AdminStore>((set) => ({
  user: null,
  notifications: [],
  addNotification: (notif) =>
    set((state) => ({
      notifications: [...state.notifications, notif],
    })),
}));
```

---

## Form Validation Strategy

### Using Zod + react-hook-form

**Example: Match Creation Form**

```typescript
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const matchCreationSchema = z.object({
  game: z.enum(['valorant', 'cs2']),
  hubId: z.string().min(1, 'Hub is required'),
  queueType: z.enum(['unranked', 'ranked_global', 'private_ranked']),
  players: z.array(z.string()).length(10, 'Exactly 10 players required'),
  draftMode: z.enum(['random', 'elo_balanced', 'captain']),
  recordingEnabled: z.boolean(),
  discordLobbyId: z.string().optional(),
})

type MatchCreationForm = z.infer<typeof matchCreationSchema>

export function MatchCreationForm() {
  const form = useForm<MatchCreationForm>({
    resolver: zodResolver(matchCreationSchema),
    defaultValues: {
      players: [],
      recordingEnabled: false,
    },
  })

  const onSubmit = async (data: MatchCreationForm) => {
    // Call API
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Form fields */}
      </form>
    </Form>
  )
}
```

---

## Access Control & Security

### Role-Based Middleware

```typescript
// middleware.ts (Next.js middleware)
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req) {
  const token = await getToken({ req });

  // Check if accessing admin routes
  if (req.nextUrl.pathname.startsWith("/admin")) {
    // Require authentication
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Require admin/moderator role
    if (!["admin", "moderator", "organizer"].includes(token.role)) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/admin/:path*",
};
```

### Permission Checks (Component Level)

```typescript
// components/admin/require-permission.tsx
import { useSession } from 'next-auth/react'

interface RequirePermissionProps {
  permission: string // e.g., 'matches.delete', 'players.ban'
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function RequirePermission({ permission, children, fallback }: RequirePermissionProps) {
  const { data: session } = useSession()

  // Check if user has permission (call API or check session data)
  const hasPermission = checkPermission(session, permission)

  if (!hasPermission) {
    return fallback || null
  }

  return <>{children}</>
}

// Usage
<RequirePermission permission="matches.delete">
  <Button onClick={deleteMatch}>Delete Match</Button>
</RequirePermission>
```

---

## Error Handling & User Feedback

### Toast Notifications (using Sonner)

```typescript
import { toast } from "sonner";

// Success
toast.success("Match created successfully!", {
  description: "Players have been notified.",
});

// Error
toast.error("Failed to create match", {
  description: error.message,
});

// Loading
const toastId = toast.loading("Creating match...");
// Later
toast.success("Match created!", { id: toastId });

// Action toast
toast("Match created", {
  action: {
    label: "View",
    onClick: () => router.push(`/admin/matches/${matchId}`),
  },
});
```

### Error Boundaries

```typescript
// components/admin/error-boundary.tsx
'use client'

export class AdminErrorBoundary extends React.Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert variant="destructive">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>
            {this.state.error?.message}
          </AlertDescription>
          <Button onClick={() => this.setState({ hasError: false })}>
            Try Again
          </Button>
        </Alert>
      )
    }

    return this.props.children
  }
}
```

---

## Performance Optimization

### Data Table Optimization

- Use virtual scrolling for large tables (TanStack Virtual)
- Server-side pagination (load 50 items at a time)
- Debounced search inputs
- Memoized table columns

### Image Optimization

- Use Next.js Image component for player avatars
- Lazy load images in tables
- Placeholder blur while loading

### Code Splitting

- Lazy load chart components (Recharts)
- Lazy load heavy modals/dialogs
- Route-based code splitting (automatic in Next.js)

---

## Testing Strategy

### Component Testing (React Testing Library)

- Test form validation
- Test role-based visibility
- Test table sorting/filtering
- Test modal interactions

### Integration Testing

- Test full match creation flow
- Test player ban workflow
- Test hub creation and whitelist

### E2E Testing (Playwright)

- Test admin login flow
- Test match creation end-to-end
- Test tournament creation workflow

---

## Deployment Considerations

### Environment Variables

```env
# Frontend (.env.local)
NEXTAUTH_URL=https://admin.trayb.az
NEXT_PUBLIC_API_URL=https://api.trayb.az
JWT_SECRET=***
```

### Subdomain Routing

**Nginx/Traefik Configuration:**

```nginx
# Route admin.trayb.az to frontend
server {
  server_name admin.trayb.az;
  location / {
    proxy_pass http://frontend:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

**Next.js Middleware:**

- Detect subdomain (admin.trayb.az vs trayb.az)
- Apply appropriate layout
- Enforce role-based access

---

## Design System & Theming

### Color Scheme (shadcn zinc theme)

- **Background:** `hsl(var(--background))`
- **Foreground:** `hsl(var(--foreground))`
- **Primary:** `hsl(var(--primary))`
- **Secondary:** `hsl(var(--secondary))`
- **Muted:** `hsl(var(--muted))`
- **Destructive:** `hsl(var(--destructive))`

### Typography

- **Headings:** `font-bold tracking-tight`
- **Body:** `text-sm`
- **Captions:** `text-xs text-muted-foreground`

### Spacing

- **Page padding:** `p-6`
- **Card spacing:** `space-y-4`
- **Form spacing:** `space-y-6`

### Icons (Lucide React)

Already installed. Use consistently:

- **LayoutDashboard** - Dashboard
- **Trophy** - Matches
- **Calendar** - Tournaments
- **Users** - Players
- **Building2** - Hubs
- **Clock** - Queue
- **Video** - Recordings
- **BarChart3** - Statistics
- **Settings** - Settings
- **FileText** - Audit Logs

---

## Accessibility Requirements

### WCAG 2.1 AA Compliance

- Proper heading hierarchy (h1 → h2 → h3)
- ARIA labels for icon buttons
- Keyboard navigation (Tab, Enter, Escape)
- Focus indicators
- Color contrast ratios (4.5:1 minimum)
- Alt text for images

### Keyboard Shortcuts (Optional Enhancement)

- `Ctrl+K` - Open command palette
- `Ctrl+N` - Create new (match/tournament/hub)
- `Escape` - Close modals
- `Arrow keys` - Navigate tables

---

## Maintenance & Documentation

### Component Documentation

- Use JSDoc comments for all components
- Document prop types thoroughly
- Include usage examples

### API Documentation

- OpenAPI/Swagger docs for all backend endpoints
- Postman collection for testing
- API versioning strategy

### Change Log

- Track major changes to admin panel
- Document breaking changes
- Version admin dashboard separately

---

## Next Steps (DO NOT IMPLEMENT YET)

### Before Starting Implementation:

1. **Review this document with team**
2. **Prioritize features** (which to build first)
3. **Create backend APIs** (need to exist before frontend work)
4. **Install shadcn/ui components** (all at once)
5. **Set up admin layout structure**
6. **Begin Phase 1 (Foundation)**

### Decision Points to Discuss:

1. **Tournament System Scope**: Implement in Phase 1 or defer to Phase 2?
2. **Chart Library**: Use Recharts or another library?
3. **Real-time Updates**: Use SWR polling or Socket.IO?
4. **Table Library**: Use TanStack Table or custom shadcn DataTable?
5. **Form Wizard**: Multi-step forms or single-page forms?
6. **Mobile Support**: Responsive design priority level?

---

## Conclusion

This dashboard implementation plan provides a comprehensive roadmap for building the admin panel at `admin.trayb.az` using **default shadcn/ui components only**. The plan covers all major functionalities including:

1. **Match Management** - Creating custom matches with full control over teams, drafts, maps
2. **Tournament System** - Creating tournaments, managing registrations, seeding, brackets
3. **Player Management** - User management, role assignment, bans, ELO tools
4. **Hub Management** - Private hub creation, whitelist management, statistics
5. **Queue Management** - Scheduling Trayb Series queues, monitoring active queues
6. **Recording Management** - Accessing match recordings, audit logs
7. **Statistics Dashboard** - Platform metrics, ELO distribution, match analytics
8. **Settings** - Map pools, weight profiles, system configuration
9. **Audit Logs** - Complete activity tracking

The implementation is broken into **7 phases over 7 weeks**, with a clear roadmap from foundation to completion. All components use **shadcn/ui defaults** with no custom UI work needed.

**Estimated Timeline:** 7 weeks (Phase 1-6), with Tournament System in Phase 2 (January)

**Total Pages:** ~45 admin pages
**Components:** ~25 shadcn/ui components
**API Endpoints:** ~50 backend routes (to be created)

---

**Document Status:** ✅ Complete - Ready for Review  
**Last Updated:** November 20, 2025  
**Author:** AI Assistant (based on codebase analysis)
