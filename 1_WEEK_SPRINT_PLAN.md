# 1-Week Sprint Plan: Admin Panel & Queue System Completion

**Timeline:** 7 Days  
**Goal:** Complete admin panel, finish queue system UI, and polish everything for launch

---

## Overview

### Current State ✅
- **Backend:** Queue system models and routes exist (`TraybSeriesSchedule`, `QueueEntry`)
- **Backend:** Hub management API complete
- **Backend:** Admin routes exist (matches, players, stats, audit)
- **Frontend:** Admin layout and sidebar complete
- **Frontend:** Basic admin dashboard page exists (placeholder)

### Critical Missing Pieces ❌
- **Admin Panel:** Most pages are missing (hubs, queues, recordings, settings)
- **Queue System:** Backend exists but no frontend UI
- **Public Queue UI:** Queue selection and status display missing
- **Integration:** Queue system not connected to match creation

---

## Day-by-Day Breakdown

### **Day 1: Monday - Admin Panel Foundation & Hub Management**

**Goal:** Get hub management fully working in admin panel

**Morning (4 hours):**
- [ ] Create `/admin/hubs` page (list all hubs with table)
  - Use shadcn `Table`, `Card`, `Button` components
  - Display: name, game, type, member count, status
  - Add "Create Hub" button
- [ ] Create `/admin/hubs/create` page (hub creation form)
  - Form with: name, description, game selection, type (unranked/ranked)
  - Use `Form`, `Input`, `Select`, `Textarea`, `Button`
  - Connect to existing backend API
- [ ] Create `/admin/hubs/[id]` page (hub detail/edit)
  - Display hub info, edit form, delete button
  - Show member count and basic stats

**Afternoon (4 hours):**
- [ ] Create `/admin/hubs/[id]/whitelist` page (whitelist management)
  - User search using `Command` component
  - Add/remove users from whitelist
  - Display current whitelist members in table
  - Connect to backend whitelist API
- [ ] Test hub CRUD operations end-to-end
- [ ] Fix any API integration issues

**Deliverable:** Fully functional hub management in admin panel

---

### **Day 2: Tuesday - Queue System Admin UI**

**Goal:** Build queue schedule management and status monitoring

**Morning (4 hours):**
- [ ] Create `/admin/queues` page (queue status overview)
  - Display current queue status (open/closed)
  - Show active queue entries count
  - Display next scheduled queue window
  - Use `Card`, `Badge`, `Clock` components
- [ ] Create `/admin/queues/schedule` page (schedule editor)
  - Calendar view showing scheduled queue windows
  - Form to create/edit schedule entries
  - Fields: day of week, start time, end time, game, timezone
  - Use `Calendar`, `TimePicker`, `Form`, `Table`
  - Connect to `TraybSeriesSchedule` backend

**Afternoon (4 hours):**
- [ ] Create `/admin/queues/active` page (active queue monitoring)
  - Real-time list of players in queue
  - Show ready status for each player
  - Display matchmaking status (waiting for 10, ready to create match)
  - Use `Table`, `Badge`, real-time updates (polling or websocket)
- [ ] Integrate queue status API endpoints
- [ ] Add queue management actions (force close, clear queue)

**Deliverable:** Complete queue management interface for admins

---

### **Day 3: Wednesday - Queue System Public UI**

**Goal:** Build queue selection and joining interface for players

**Morning (4 hours):**
- [ ] Create `/queue` page (queue selection)
  - Display 3 queue types: Unranked, Ranked Global (Trayb Series), Private Hub
  - Show queue status for each (open/closed, player count)
  - Countdown timer for next Trayb Series window
  - Use `Card`, `Button`, `Badge`, `Clock` components
  - Game selector (Valorant/CS2)
- [ ] Create queue join/leave functionality
  - "Join Queue" button that calls backend API
  - Show current queue position
  - "Leave Queue" button
  - Real-time updates of queue status

**Afternoon (4 hours):**
- [ ] Create queue ready-up system
  - When 10 players in queue, show ready check
  - Faceit-style accept/decline modal
  - Countdown timer (30 seconds)
  - Auto-create match when all 10 ready
- [ ] Add queue status indicator to main dashboard
  - "Queue Open" badge when Trayb Series is active
  - Link to queue page
- [ ] Test queue flow: join → ready → match creation

**Deliverable:** Players can join queues and matches auto-create

---

### **Day 4: Thursday - Match Creation Integration & Admin Enhancements**

**Goal:** Connect queue system to match creation and enhance admin match management

**Morning (4 hours):**
- [ ] Update `/admin/matches/create` page
  - Add queue type selector (Unranked, Ranked Global, Private Hub)
  - Add game selector (Valorant, CS2)
  - Add hub selector (when Private Hub selected)
  - Update form validation based on queue type
  - Connect to existing match creation API
- [ ] Update match creation to support queue types
  - Ensure ELO impact only for ranked queues
  - Ensure draft options respect queue type rules
  - Test match creation with all queue types

**Afternoon (4 hours):**
- [ ] Create `/admin/matches` page (active matches list)
  - Table showing: match name, game, queue type, status, players
  - Filter by game, queue type, status
  - Actions: view, edit, delete
  - Use `Table`, `Select`, `Badge`
- [ ] Create `/admin/matches/history` page
  - Paginated match history
  - Filters: date range, game, queue type, hub
  - Export functionality (optional)
- [ ] Enhance `/admin/matches/[id]` page (match detail)
  - Show full match info, teams, stats
  - Edit match settings
  - Delete match with confirmation

**Deliverable:** Complete match management in admin panel

---

### **Day 5: Friday - Player Management & Settings**

**Goal:** Complete player management and admin settings

**Morning (4 hours):**
- [ ] Create `/admin/players` page (player list)
  - Table with: username, email, role, ELO, games played
  - Search functionality
  - Filter by role, game
  - Actions: view profile, edit role, ban
- [ ] Create `/admin/players/[id]` page (player detail)
  - Full player profile
  - Match history
  - ELO history graph
  - Role assignment
  - Ban management
- [ ] Create `/admin/players/roles` page (role management)
  - Assign roles to users
  - Display current role assignments
  - Use RBAC system

**Afternoon (4 hours):**
- [ ] Create `/admin/players/bans` page (ban management)
  - List of banned players
  - Ban form: reason, duration, type
  - Unban functionality
- [ ] Create `/admin/settings` page
  - Map pool management (add/remove maps per game)
  - Weight profile editor (for Rating 2.0 tuning)
  - System configuration
  - Use `Tabs` for different setting categories
- [ ] Create `/admin/stats` page (statistics dashboard)
  - Platform metrics: total matches, active players, queue stats
  - ELO distribution chart
  - Match analytics
  - Use `Card`, charts (recharts or similar)

**Deliverable:** Complete player management and settings

---

### **Day 6: Saturday - Recordings & Polish**

**Goal:** Finish recordings management and polish admin panel

**Morning (4 hours):**
- [ ] Create `/admin/recordings` page (recording library)
  - List of all recordings
  - Filter by match, date, game
  - Playback controls (if video player needed)
  - Download functionality
  - Access logs
- [ ] Create `/admin/recordings/logs` page
  - Who accessed which recordings
  - Timestamp, user, recording match
- [ ] Enhance admin dashboard (`/admin` page)
  - Overview cards: active matches, queue status, recent activity
  - Quick actions
  - Recent matches table
  - Platform health metrics

**Afternoon (4 hours):**
- [ ] Fix any bugs found during testing
- [ ] Improve error handling and loading states
- [ ] Add toast notifications for actions
- [ ] Ensure all forms have proper validation
- [ ] Test responsive design (mobile/tablet)
- [ ] Add loading skeletons where needed
- [ ] Polish UI consistency (spacing, colors, typography)

**Deliverable:** Polished admin panel with all features working

---

### **Day 7: Sunday - Integration Testing & Final Polish**

**Goal:** End-to-end testing and final fixes

**Morning (4 hours):**
- [ ] Test complete user flows:
  - Admin creates hub → adds whitelist → creates match
  - Admin creates queue schedule → player joins queue → match auto-creates
  - Admin manages players → assigns roles → bans user
  - Admin views stats → exports data
- [ ] Test queue system edge cases:
  - Player leaves during ready-up
  - Queue closes while players waiting
  - Multiple games in queue simultaneously
- [ ] Fix any integration issues

**Afternoon (4 hours):**
- [ ] Performance testing
  - Check page load times
  - Optimize slow queries
  - Add pagination where needed
- [ ] Security review
  - Ensure all admin routes have proper RBAC
  - Verify API endpoints have auth checks
  - Test permission boundaries
- [ ] Documentation
  - Update README with admin panel features
  - Document queue system usage
  - Add inline code comments where needed
- [ ] Final UI polish
  - Consistent error messages
  - Better empty states
  - Improved loading indicators

**Deliverable:** Production-ready admin panel and queue system

---

## Priority Checklist

### Must-Have (Critical Path)
1. ✅ Hub management UI (Day 1)
2. ✅ Queue schedule management (Day 2)
3. ✅ Queue joining UI (Day 3)
4. ✅ Match creation with queue types (Day 4)
5. ✅ Basic player management (Day 5)

### Should-Have (Important)
6. ✅ Queue ready-up system (Day 3)
7. ✅ Match history and management (Day 4)
8. ✅ Player roles and bans (Day 5)
9. ✅ Settings page (Day 5)
10. ✅ Statistics dashboard (Day 5)

### Nice-to-Have (If Time Permits)
11. ⏳ Recordings management (Day 6)
12. ⏳ Enhanced admin dashboard (Day 6)
13. ⏳ Export functionality (Day 4/5)
14. ⏳ Advanced filtering (throughout)

---

## Technical Notes

### Components to Use (shadcn/ui only)
- `Table` - For data lists
- `Card` - For containers
- `Form` + `Input` + `Select` - For forms
- `Button` - For actions
- `Badge` - For status indicators
- `Dialog` - For modals
- `Tabs` - For multi-section pages
- `Calendar` - For date selection
- `Command` - For search/autocomplete
- `Toast` - For notifications

### API Integration Points
- Hub management: `/api/admin/hubs/*`
- Queue management: `/api/queues/*`
- Match management: `/api/admin/matches/*`
- Player management: `/api/admin/players/*`
- Settings: `/api/admin/settings/*`

### Testing Strategy
- Test each feature immediately after building
- Use browser dev tools to test API calls
- Test with different user roles (admin, moderator, organizer)
- Test edge cases (empty states, errors, timeouts)

---

## Daily Standup Questions

Each day, ask:
1. What did I complete yesterday?
2. What am I working on today?
3. Are there any blockers?
4. Do I need to adjust the plan?

---

## Risk Mitigation

**Risk:** Queue system backend might have bugs
- **Mitigation:** Test backend endpoints on Day 2 morning before building UI

**Risk:** Admin panel might be too complex
- **Mitigation:** Start with MVP features, add polish later

**Risk:** Integration issues between frontend and backend
- **Mitigation:** Test API calls early, fix as you go

**Risk:** Time constraints
- **Mitigation:** Focus on must-haves first, nice-to-haves can be cut

---

## Success Criteria

By end of week, you should have:
- ✅ Admins can manage hubs (create, edit, whitelist)
- ✅ Admins can manage queue schedules
- ✅ Players can join queues and matches auto-create
- ✅ Admins can create matches with all queue types
- ✅ Admins can manage players (roles, bans)
- ✅ Admin panel is functional and polished
- ✅ All critical features tested and working

---

## Notes

- **Focus on functionality over perfection** - Get it working first, polish later
- **Test as you build** - Don't wait until the end to test
- **Use existing backend APIs** - Don't rebuild what exists
- **Follow shadcn/ui patterns** - Keep UI consistent
- **Ask for help early** - Don't get stuck on blockers

Good luck! 🚀

