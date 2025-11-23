# Trayb.az - 6-Day Critical Path Sprint

**Your Mission:** Build the hardest, most complex parts of the admin dashboard and backend APIs. We'll handle the mundane stuff.

---

## Project Context

**What We're Building:**
A competitive esports platform (trayb.az) for Valorant and CS2 with:
- Automated matchmaking with 3 queue types (Unranked, Ranked Global "Trayb Series", Private Hubs)
- Multi-game support (Valorant + CS2) with separate ELO/ratings
- Admin dashboard (admin.trayb.az) for managing everything
- Discord integration with VC management and audio recording
- Advanced rating systems (ELO + Rating 2.0)

**What's Already Done:**
- ✅ Backend modular architecture with Fastify + Prisma
- ✅ Auth system (NextAuth v5 + JWT)
- ✅ Admin APIs: Players (list/detail/roles/bans), Stats (overview/analytics/elo-distribution), Settings, Audit Logs
- ✅ Frontend: Admin layout/sidebar, Hub management pages (4 pages), Queue management pages (3 admin + 1 public)
- ✅ Database schema with Match, MatchPlayer, PlayerEloHistory models
- ✅ Swagger/OpenAPI docs
- ✅ Vitest integration tests

**What You Need To Build (The Hard Parts):**

---

## Day 1: Match Management Backend API (Critical Foundation)

### Backend Module: `/apps/backend/src/modules/admin/matches`

**Goal:** Complete the entire match management API module

#### 1. Create Match Management Routes (`routes.ts`)
```
POST   /admin/matches              - Create custom match
GET    /admin/matches              - List matches (pagination, filters)
GET    /admin/matches/:id          - Get match details  
DELETE /admin/matches/:id          - Delete match
POST   /admin/matches/:id/stats    - Import stats (tracker.gg HTML)
PUT    /admin/matches/:id/end      - End match manually
```

#### 2. Match Creation Service (`service.ts`)
**Complex Logic Required:**
- **10-player validation** (no duplicates, all must exist, hub whitelist check)
- **Team assignment** via 3 methods:
  - Random (via Random.org API integration)
  - ELO-balanced (snake draft algorithm - sort by ELO, alternate picks)
  - Captain draft (with voting or admin override)
- **Discord integration** (validate lobby ID, create team VCs via internal API)
- **Recording policy** (check if match qualifies for recording)
- **Scheduled vs immediate** match creation
- **Hub access control** (private hub = whitelist check)

#### 3. Stats Import Service (`stats-import.service.ts`)
**Most Complex Part:**
- Parse multiple tracker.gg HTML files (overview, combat, economy)
- Extract player stats (kills, deaths, assists, ACS, HS%, etc.)
- **Validation rules:**
  - Exactly 10 players
  - Team kills = Enemy team deaths
  - No duplicate players
  - Stats within realistic bounds
- Calculate Rating 2.0 from imported stats
- Update ELO for ranked matches
- Store to database with transaction rollback support

#### 4. Zod Schemas (`schema.ts` + `swagger-schemas.ts`)
- Match creation schema (10 fields, nested validation)
- Match list query schema (5+ filters)
- Stats import schema (multi-file upload)
- Match detail response (nested teams, players, stats)

#### 5. Controller + Repository Pattern
- Follow the same pattern as `admin/players` module
- Keep files under 300 lines
- Add comprehensive JSDoc comments

#### 6. Integration Tests (`admin.matches.test.ts`)
- Test match creation with all 3 draft modes
- Test validation errors (duplicate players, invalid hub access)
- Test stats import with mock HTML
- Test match deletion with audit logging

**Difficulty:** ⭐⭐⭐⭐⭐ (Hardest backend module)

**Reference:**
- `/apps/backend/src/modules/admin/players` - copy this module structure
- `DASHBOARD_IMPLEMENTATION_PLAN.md` lines 698-853 - match management spec
- `docs/trayb-v3-implementation-tasks.md` section 6.1 - stats import requirements

---

## Day 2: Player Management Pages (Complex Multi-Tab Interface)

### Frontend Pages: `/apps/frontend/app/admin/players`

#### 1. Player List Page (`/admin/players/page.tsx`)
**Features:**
- DataTable with pagination (TanStack Table)
- 5+ filters: search, role, game, hub, status
- Columns: avatar, username, email, role, valorant ELO, CS2 rating, matches played, status
- Actions: view, edit role, ban
- Real-time search with debouncing
- Export functionality

#### 2. Player Detail Page (`/admin/players/[id]/page.tsx`)
**Most Complex Frontend Page:**
- **5 Tabs** (use animated tabs component):
  1. **Overview Tab:**
     - Profile info card
     - Role & permissions display
     - Account status alerts
     - Quick actions (edit, ban, adjust ELO)
  2. **Stats Tab:**
     - Game selector (Valorant/CS2)
     - Hub selector (Global/Private Hubs)
     - Stats cards (ELO, Rating 2.0, W/L, matches played)
     - **ELO history chart** (line chart with Recharts - show last 20 matches)
     - **Radar chart** for skills (ACS, K/D, HS%, etc.)
     - Performance trends (last 5/10/20 matches)
  3. **Matches Tab:**
     - Filterable match history table
     - Recent matches with expandable stats
     - Export match data
  4. **Badges Tab:**
     - Badge grid display
     - Add/remove badges with dialog
  5. **Audit Log Tab:**
     - Timeline of all admin actions on this player
     - Filters: action type, date range

#### 3. Role Assignment Page (`/admin/players/[id]/roles/page.tsx`)
- Multi-checkbox role selection (new RBAC system)
- Primary role selector
- Permissions preview (show what each role grants)
- Reason for change (required field)
- Confirmation dialog
- Call `PUT /admin/players/:id/roles` API

#### 4. Ban Management Page (`/admin/players/[id]/ban/page.tsx`)
- Ban type selector (Temporary/Permanent)
- Duration picker (for temporary bans)
- Reason textarea (required)
- Scope checkboxes (ban from all hubs, ban from Discord)
- Warning alert about consequences
- Call `POST /admin/players/:id/ban` API
- Unban button with reason required

#### 5. ELO Tools Page (`/admin/players/[id]/elo/page.tsx`)
**Complex Form:**
- Game selector
- Hub selector (optional)
- Manual ELO adjustment input
- Reason for adjustment (required)
- Preview new rank before confirming
- ELO history table
- "Recalculate All" button (calls background job)
- "Reset Calibration" button

**Difficulty:** ⭐⭐⭐⭐⭐ (Most complex frontend module)

**Reference:**
- `DASHBOARD_IMPLEMENTATION_PLAN.md` lines 282-494 - full player management spec
- `/apps/frontend/app/admin/hubs` - copy the animation/tooltip patterns
- `/apps/frontend/components/data-table.tsx` - use this for tables
- Backend APIs already exist at `/admin/players/*`

**Components Needed:**
Tell me you need: `@shadcn/chart`, `@shadcn/radio-group`, `@shadcn/switch`, `@shadcn/slider`, `@shadcn/pagination`

---

## Day 3: Match Management Pages + Stats Visualization

### Part 1: Match Management Pages

#### 1. Match Creation Wizard (`/admin/matches/create/page.tsx`)
**6-Step Multi-Form Wizard:**

**Step 1: Basic Info**
- Game select (Valorant/CS2)
- Hub select (fetch from `/admin/hubs`)
- Queue type select (Unranked/Ranked Global/Private Ranked)
- Match name (optional)

**Step 2: Player Selection**
- **Command palette** for player search
- Search by username/email
- Display: avatar, username, ELO
- Add/remove players
- Show count (X/10)
- Validation: exactly 10 required, no duplicates

**Step 3: Team Assignment**
- RadioGroup for draft mode:
  - Random (via Random.org)
  - ELO-balanced (snake draft)
  - Captain draft
- If captain draft:
  - Checkbox: "Skip voting, assign directly"
  - Two Select dropdowns for captain selection

**Step 4: Map Selection**
- RadioGroup:
  - Random from pool
  - Pick/Ban phase
  - Specific map
- If specific: Select from map pool

**Step 5: Settings**
- Discord lobby channel ID input
- Recording toggle
- Optional: Schedule match (calendar picker)

**Step 6: Review & Create**
- Summary of all selections
- Back button to edit
- Create button → calls `POST /admin/matches`

#### 2. Active Matches Page (`/admin/matches/page.tsx`)
- Table with filters (game, queue type, status)
- Actions: view, end, cancel
- Real-time updates (polling every 5s)

#### 3. Match History Page (`/admin/matches/history/page.tsx`)
- Paginated table with date range picker
- Filters: game, hub, queue type
- Export button

#### 4. Match Details Page (`/admin/matches/[id]/page.tsx`)
**5 Tabs:**
1. Overview: metadata, teams, score
2. Teams: rosters, ELO changes, draft info
3. Stats: player stats table, MVP indicator
4. Timeline: event log
5. Recording: download links (if recorded)

### Part 2: Stats Visualization Pages

#### 1. Stats Overview Page (`/admin/stats/overview/page.tsx`)
**Recharts Integration:**
- 4 metric cards (active users, matches/week, tournaments, queue status)
- **Line chart:** Matches per day (last 30 days)
- **Pie chart:** Match distribution (Valorant vs CS2)
- **Bar chart:** Matches by queue type
- Filters: time range (7d/30d/90d/all time)
- Calls `/admin/stats/overview` API

#### 2. ELO Distribution Page (`/admin/stats/elo-distribution/page.tsx`)
**Hardest Visualization:**
- Game selector
- Hub selector
- **Histogram chart** (Recharts BarChart)
  - X-axis: ELO ranges (0-500, 501-1000, 1001-1500, etc.)
  - Y-axis: Player count
  - Show rank brackets (Bronze, Silver, Gold, etc.)
- Summary stats: total players, average ELO, median, p95
- Calls `/admin/stats/elo-distribution` API

#### 3. Match Analytics Page (`/admin/stats/match-analytics/page.tsx`)
- Game/hub/date range filters
- **Line chart:** Match trend over time
- **Bar chart:** Per-map win rates
- Top performers table
- Calls `/admin/stats/match-analytics` API

**Difficulty:** ⭐⭐⭐⭐⭐ (Complex multi-step forms + data visualization)

**Components Needed:**
Tell me you need: `@shadcn/calendar`, `@shadcn/date-picker`, `@shadcn/chart` examples

---

## Day 4: Backend Hub + Queue + Recordings APIs

### Part 1: Hub Management API Module

Create `/apps/backend/src/modules/admin/hubs`:

#### Routes:
```
POST   /admin/hubs                    - Create hub
GET    /admin/hubs                    - List all hubs
GET    /admin/hubs/:id                - Get hub details
PUT    /admin/hubs/:id                - Update hub
DELETE /admin/hubs/:id                - Delete hub
GET    /admin/hubs/:id/whitelist      - Get whitelist
POST   /admin/hubs/:id/whitelist      - Add player
DELETE /admin/hubs/:id/whitelist/:playerId - Remove player
GET    /admin/hubs/:id/stats          - Hub statistics
```

#### Complex Logic:
- Whitelist enforcement (check on match join)
- Hub-specific ELO tracking
- Hub stats aggregation
- Cascade delete protection (can't delete hub with active matches)

### Part 2: Queue Management API Module

Create `/apps/backend/src/modules/admin/queues`:

#### Routes:
```
GET    /admin/queue/schedule          - Get schedule
POST   /admin/queue/schedule          - Add schedule entry
PUT    /admin/queue/schedule/:id      - Update schedule
DELETE /admin/queue/schedule/:id      - Delete schedule
GET    /admin/queue/status            - Current queue status
GET    /admin/queue/active            - Active queue entries
POST   /admin/queue/force-open        - Manually open queue
POST   /admin/queue/force-close       - Manually close queue
POST   /admin/queue/clear             - Clear all queue entries
```

#### Complex Logic:
- Time window validation (start < end, no overlaps)
- Timezone handling
- Queue status calculation (check schedule vs current time)
- Active queue monitoring

### Part 3: Recordings API Module

Create `/apps/backend/src/modules/admin/recordings`:

#### Routes:
```
GET    /admin/recordings              - List all recordings
GET    /admin/recordings/:id          - Get recording details
GET    /admin/recordings/:id/download - Download recording file
DELETE /admin/recordings/:id          - Delete recording
GET    /admin/recordings/access-logs  - Access audit log
POST   /admin/recordings/:id/access   - Log access (called on download)
```

#### Complex Logic:
- File storage integration (local or S3)
- Presigned URL generation for downloads
- Access control (admin/organizer only)
- Audit logging (who accessed what, when)
- Retention policy enforcement

**Difficulty:** ⭐⭐⭐⭐ (Three full backend modules)

**Pattern to Follow:**
- Copy `/apps/backend/src/modules/admin/players` structure
- controller.ts, service.ts, repository.ts, routes.ts, schema.ts, swagger-schemas.ts, README.md, tests

---

## Day 5: Settings Pages + Recordings Management

### Part 1: Settings Pages

#### 1. Map Pool Management (`/admin/settings/maps/page.tsx`)
**Features:**
- Tabs for Valorant/CS2
- Table of maps per game
- Toggle active/inactive per map
- Reorder maps (drag-drop with dnd-kit)
- Add new map dialog
- Delete map confirmation
- Calls `/admin/settings/maps` API (GET/PUT)

#### 2. Weight Profiles Editor (`/admin/settings/weight-profiles/page.tsx`)
**Complex Form:**
- Tabs for Valorant/CS2
- **Valorant weights** (sliders 0-1):
  - Kill Contribution Weight
  - Death Contribution Weight
  - APR Weight
  - ADRa Weight
  - Survival Rating Weight
- **CS2 coefficients** (number inputs):
  - KAST Coefficient
  - KPR Coefficient
  - DPR Coefficient
  - Impact Coefficient
  - ADR Coefficient
- Reset to defaults button
- Preview with sample data
- Save confirmation
- Calls `/admin/settings/weight-profiles` API

#### 3. System Configuration (`/admin/settings/system/page.tsx`)
**Sensitive Config:**
- Discord bot tokens (3 inputs: Control, Recorder1, Recorder2)
- Server ID, Lobby Channel ID
- Recording settings (enable/disable, quality, retention days)
- ELO settings (default starting ELO, K-factor, calibration matches)
- API keys (Random.org)
- Save with confirmation dialog
- Calls `/admin/settings/system` API

### Part 2: Recordings Management

#### 1. Recording Library (`/admin/recordings/page.tsx`)
- Table: Match ID, date, game, teams, file sizes
- Download buttons (Team 1, Team 2)
- Audio player preview (optional)
- Delete confirmation
- Filters: date range, game
- Calls `/admin/recordings` API

#### 2. Access Logs (`/admin/recordings/access-logs/page.tsx`)
- Table: timestamp, admin user, match ID, action (download/delete)
- Audit trail display
- Filters: admin, match, date range
- Calls `/admin/recordings/access-logs` API

**Difficulty:** ⭐⭐⭐⭐ (Complex forms with validation + file management)

**Components Needed:**
Tell me you need: `@shadcn/slider`, `@shadcn/switch`, drag-drop example from data-table

---

## Day 6: Match Stats Import UI + Final Integration

### Part 1: Stats Import Page (`/admin/matches/[id]/import-stats/page.tsx`)

**Multi-File Upload Interface:**
- Drag-drop zone for HTML files
- File list with remove buttons
- File type validation (HTML only)
- Preview stats before import:
  - Parse HTML client-side (or send to backend for preview)
  - Show player stats table
  - Highlight validation errors (if any)
- Import button → calls `POST /admin/matches/:id/stats`
- Progress indicator
- Success/error handling with detailed messages

### Part 2: Connect Frontend to Backend

**Critical Integration Points:**

1. **Update `/lib/api.ts`** to handle file uploads:
```typescript
export async function apiUpload<T>(
  endpoint: string,
  files: File[],
  data?: unknown
): Promise<T>
```

2. **Replace all TODO comments** with real API calls:
- Hub management pages → `/admin/hubs/*` APIs
- Queue pages → `/admin/queue/*` APIs
- Match pages → `/admin/matches/*` APIs
- Settings → `/admin/settings/*` APIs
- Recordings → `/admin/recordings/*` APIs

3. **Error handling** for all API calls:
- Show toast notifications
- Handle 401/403 (redirect to login)
- Handle validation errors (display in forms)

4. **Loading states** everywhere:
- Skeleton components while fetching
- Disabled buttons during submit
- Loading spinners on tables

### Part 3: Final Polish

1. **Audit Logs Page** (`/admin/audit-logs/page.tsx`)
   - Already has backend API
   - Table with filters: action type, resource type, admin, date range
   - JSON diff viewer for changes
   - Pagination

2. **Dashboard Overview** (`/admin/page.tsx`)
   - Replace placeholder with real metrics
   - 6 metric cards
   - Recent activity table
   - Quick actions

3. **Test Everything:**
   - End-to-end flows
   - Error cases
   - Permission checks
   - Responsive design

**Difficulty:** ⭐⭐⭐⭐ (Integration + polish)

---

## Technical Specifications

### Backend API Standards

**Follow Existing Pattern (apps/backend/src/modules/admin/players):**

```
/modules/admin/{module}/
  ├── controller.ts        - Route handlers
  ├── service.ts           - Business logic
  ├── repository.ts        - Database queries
  ├── routes.ts            - Route definitions
  ├── schema.ts            - Zod validation schemas
  ├── swagger-schemas.ts   - JSON schemas for OpenAPI
  ├── README.md            - Module documentation
  └── {module}.test.ts     - Integration tests
```

**Requirements:**
- All files under 300 lines (split if needed)
- JSDoc comments on all routes/functions
- Zod validation on all inputs
- Swagger schemas for all endpoints
- Integration tests with Vitest
- Use shared Prisma selectors (`/apps/backend/src/utils/prisma-selectors.ts`)
- Use centralized logger (`createLogger("admin.{module}")`)

### Frontend Standards

**Patterns to Follow:**

1. **Animations:** Use `motion/react` for page transitions
2. **Tooltips:** On all interactive elements
3. **Forms:** react-hook-form + Zod validation
4. **Tables:** Animated rows with `fadeIn` CSS animation
5. **Dialogs:** Use AlertDialog from animate-ui for confirmations
6. **Loading:** Show skeletons/loading states
7. **Errors:** Toast notifications for all errors
8. **Real-time:** Poll APIs every 3-5 seconds where needed

**File Structure:**
```
/app/admin/{module}/
  ├── page.tsx                 - List page
  ├── create/page.tsx          - Create form
  ├── [id]/page.tsx            - Detail page
  └── [id]/{sub}/page.tsx      - Sub-pages
```

### API Integration Pattern

**Server Actions (use for sensitive operations):**
```typescript
// app/admin/players/[id]/actions.ts
'use server';
export async function updatePlayerRoles(playerId: string, data: RoleUpdate) {
  const session = await auth();
  // Call backend API with session token
}
```

**Client-Side (use for non-sensitive reads):**
```typescript
// Use /lib/api.ts helpers
const players = await apiGet<PlayerList>("/admin/players");
```

---

## Critical Notes

### API Endpoints Already Working ✅

**You can use these immediately:**
```
GET    /admin/players               ✅
GET    /admin/players/:id           ✅
PUT    /admin/players/:id/roles     ✅
POST   /admin/players/:id/ban       ✅
POST   /admin/players/:id/unban     ✅
GET    /admin/stats/overview        ✅
GET    /admin/stats/match-analytics ✅
GET    /admin/stats/elo-distribution ✅
GET    /admin/settings/system       ✅
GET    /admin/settings/maps         ✅
PUT    /admin/settings/maps         ✅
GET    /admin/settings/weight-profiles ✅
PUT    /admin/settings/weight-profiles ✅
GET    /admin/audit-logs            ✅
```

### What I'm Handling (Don't Worry About These) ✅

- Navbar/layout polish
- Theme switcher improvements
- Basic page scaffolds
- Simple CRUD pages
- Documentation
- Deployment configuration
- Testing after you're done

### Design System (Already Configured)

- **Theme:** shadcn/ui "new-york" style, zinc base color
- **Animations:** All components from animate-ui
- **Icons:** lucide-react
- **Charts:** Recharts (need to import chart examples from shadcn registry)
- **Colors:** Use semantic tokens (primary, secondary, destructive, muted)

---

## Priority Order (If You Run Out of Time)

**Must-Have (Don't Skip):**
1. Match management backend API (Day 1)
2. Player management pages (Day 2)
3. Match creation wizard (Day 3, Part 1)

**Should-Have (Try to Complete):**
4. Stats visualization (Day 3, Part 2)
5. Hub/Queue/Recordings backend APIs (Day 4)
6. Settings pages (Day 5)

**Nice-to-Have (If Time Permits):**
7. Stats import UI (Day 6, Part 1)
8. Final polish (Day 6, Part 3)

---

## Getting Started

1. **Day 1 Morning:**
   ```bash
   cd apps/backend/src/modules/admin
   mkdir matches
   cd matches
   # Copy structure from ../players
   # Start with schema.ts (define types)
   ```

2. **Review Existing Modules:**
   - Read `/apps/backend/src/modules/admin/players/README.md`
   - Study the controller/service/repository pattern
   - Check swagger-schemas.ts for OpenAPI patterns

3. **Test As You Go:**
   ```bash
   cd apps/backend
   bun test src/modules/admin/matches/admin.matches.test.ts
   ```

4. **Frontend:**
   ```bash
   cd apps/frontend
   # Check existing animated pages in app/admin/hubs/*
   # Copy the animation/tooltip patterns
   ```

---

## Questions? Blockers?

**If stuck, check:**
- `DASHBOARD_IMPLEMENTATION_PLAN.md` - complete UI specs
- `docs/trayb-v3-implementation-tasks.md` - technical requirements
- `AI_WORKFLOW_GUIDE.md` - workflow best practices
- `SME triangle.md` - code quality guidelines

**Handoff Points:**
- After Day 3: Show me match creation wizard for review
- After Day 4: Deploy backend APIs to beta for testing
- After Day 6: Full demo of admin panel

---

## Success Criteria

By end of Day 6, you should have:

**Backend:**
- ✅ Match management API (fully tested)
- ✅ Hub management API (fully tested)
- ✅ Queue management API (fully tested)
- ✅ Recordings API (fully tested)

**Frontend:**
- ✅ Player management (all 5 pages)
- ✅ Match management (all 4 pages)
- ✅ Stats visualization (all 3 pages)
- ✅ Settings (all 3 pages)
- ✅ Recordings (both pages)

**Integration:**
- ✅ All APIs connected to frontend
- ✅ All forms validate correctly
- ✅ All tables paginate/filter/sort
- ✅ All charts render real data

---

## Notes

- **Don't worry about:** Bots (separate sprint), tournaments (Phase 2), public site features
- **Do worry about:** Complex validation, data integrity, proper error handling, smooth UX
- **Test heavily:** The match creation and stats import are critical paths
- **Ask questions:** Better to clarify than build wrong

Let's build something awesome! 🚀

