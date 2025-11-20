# Zustand Implementation Options Analysis

This document provides a detailed breakdown of each architectural decision for implementing Zustand in the Trayb.az frontend.

---

## 1. Store Organization Strategy

### Option A: Single Large Store with Slices

**Structure:**
```typescript
// stores/main.ts
import { create } from 'zustand'

interface AppState {
  // Auth slice
  user: User | null
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  
  // UI slice
  isModalOpen: boolean
  sidebarOpen: boolean
  setModalOpen: (open: boolean) => void
  
  // Socket slice
  socket: Socket | null
  isConnected: boolean
  setSocket: (socket: Socket | null) => void
  
  // Game slice
  currentGame: Game | null
  queueStatus: QueueStatus | null
  setCurrentGame: (game: Game | null) => void
}
```

**Pros:**
- ✅ Single import location (`useAppStore()`)
- ✅ All state in one place, easier to see entire app state
- ✅ No need to import multiple stores
- ✅ Simple mental model - one store for everything
- ✅ Easier debugging with Zustand DevTools (one store)
- ✅ Can easily access cross-slice state

**Cons:**
- ❌ Large file that grows over time
- ❌ All subscribers re-render when ANY slice updates (unless you use selectors)
- ❌ Risk of coupling unrelated state
- ❌ Harder to split responsibilities
- ❌ More merge conflicts in team environments
- ❌ Less modular - harder to test individual features

**Use Cases:**
- Small to medium apps (< 10k lines)
- Simple state relationships
- Single developer or small team
- When you frequently need cross-slice state access
- Prototyping or MVP

**Example Implementation:**
```typescript
const useAppStore = create<AppState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  
  // ... other slices
}))

// Usage - MUST use selectors to avoid unnecessary re-renders
const user = useAppStore((state) => state.user)
const setUser = useAppStore((state) => state.setUser)
```

---

### Option B: Multiple Small Stores (Recommended for This Project)

**Structure:**
```typescript
// stores/auth.ts
const useAuthStore = create<AuthState>((set) => ({ ... }))

// stores/ui.ts
const useUIStore = create<UIState>((set) => ({ ... }))

// stores/socket.ts
const useSocketStore = create<SocketState>((set) => ({ ... }))

// stores/game.ts
const useGameStore = create<GameState>((set) => ({ ... }))
```

**Pros:**
- ✅ Clear separation of concerns
- ✅ Each store can be tested independently
- ✅ Better performance (components only subscribe to relevant stores)
- ✅ Easier code splitting/lazy loading
- ✅ Scales well as app grows
- ✅ Better for team collaboration (less merge conflicts)
- ✅ Can be in separate files for better organization
- ✅ Easier to understand what each store manages

**Cons:**
- ❌ Need to import multiple stores
- ❌ Can't easily access cross-store state (need helper functions)
- ❌ More files to manage
- ❌ Multiple DevTools instances (one per store)

**Use Cases:**
- Medium to large apps (> 10k lines)
- Complex state with clear boundaries
- Team environments
- When state slices are independent
- When you want lazy loading of stores
- **Perfect for your esports platform** (auth, UI, games, real-time are distinct)

**Example Implementation:**
```typescript
// stores/auth.ts
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  // ...
}))

// stores/ui.ts
export const useUIStore = create<UIState>((set) => ({
  modals: {},
  sidebarOpen: false,
  // ...
}))

// Usage
const user = useAuthStore((state) => state.user)
const isSidebarOpen = useUIStore((state) => state.sidebarOpen)
```

---

### Option C: Hybrid Approach (Stores + Slices)

**Structure:**
```typescript
// stores/auth.ts - standalone
const useAuthStore = create<AuthState>((set) => ({ ... }))

// stores/features.ts - grouped related features
interface FeaturesState {
  game: GameSlice
  queue: QueueSlice
  match: MatchSlice
}

const useFeaturesStore = create<FeaturesState>((set) => ({
  game: createGameSlice(set),
  queue: createQueueSlice(set),
  match: createMatchSlice(set),
}))
```

**Pros:**
- ✅ Best of both worlds
- ✅ Related features grouped together
- ✅ Independent features separate
- ✅ Flexible organization
- ✅ Can optimize performance per group

**Cons:**
- ❌ More complex mental model
- ❌ Need to decide what's "related"
- ❌ Can become inconsistent over time
- ❌ More documentation needed

**Use Cases:**
- Large apps with clear feature boundaries
- When some features are tightly coupled
- When you want to optimize bundle size
- Complex domains with sub-domains

---

## 2. Middleware & Plugins

### Option A: Persist Middleware (localStorage/sessionStorage)

**What it does:**
- Saves store state to browser storage
- Hydrates state on page load
- Syncs across tabs

**Pros:**
- ✅ User preferences survive page reload
- ✅ Better UX (theme, sidebar state, etc.)
- ✅ Can cache auth tokens (with caution)
- ✅ Reduces API calls on initial load

**Cons:**
- ❌ Can cause hydration mismatches in Next.js SSR
- ❌ Security risk if storing sensitive data
- ❌ Storage size limits
- ❌ Needs careful handling with NextAuth

**Use Cases:**
- ✅ UI preferences (theme, sidebar state, dismissed banners)
- ✅ User settings (notifications, language)
- ⚠️ Auth state (be careful - only safe if using NextAuth session)
- ❌ Never store passwords, tokens directly

**Example:**
```typescript
import { persist, createJSONStorage } from 'zustand/middleware'

const useUIStore = create(
  persist<UIState>(
    (set) => ({
      theme: 'light',
      sidebarOpen: false,
    }),
    {
      name: 'ui-storage', // localStorage key
      storage: createJSONStorage(() => localStorage),
      // Only persist specific fields
      partialize: (state) => ({ 
        theme: state.theme,
        sidebarOpen: state.sidebarOpen 
      }),
    }
  )
)
```

---

### Option B: DevTools Middleware

**What it does:**
- Integrates with Redux DevTools browser extension
- Time-travel debugging
- State inspection

**Pros:**
- ✅ Excellent debugging experience
- ✅ See all state changes
- ✅ Time-travel debugging
- ✅ Action history
- ✅ Free and easy to use

**Cons:**
- ❌ Only works in development
- ❌ Adds small bundle size (tree-shakeable)
- ❌ Requires browser extension

**Use Cases:**
- ✅ **Always recommended for development**
- ✅ Complex state debugging
- ✅ Performance optimization

**Example:**
```typescript
import { devtools } from 'zustand/middleware'

const useAuthStore = create(
  devtools<AuthState>(
    (set) => ({
      // ... state
    }),
    { name: 'AuthStore' } // Name in DevTools
  )
)
```

---

### Option C: Immer Middleware

**What it does:**
- Allows mutating draft state
- Automatically creates immutable updates
- Cleaner update syntax

**Pros:**
- ✅ More intuitive syntax (mutate instead of spread)
- ✅ Less boilerplate for nested updates
- ✅ Fewer bugs from incorrect spreading
- ✅ Better TypeScript inference

**Cons:**
- ❌ Additional dependency (~14kb)
- ❌ Slight performance overhead
- ❌ Learning curve if team not familiar

**Use Cases:**
- ✅ Complex nested state updates
- ✅ When spreading becomes verbose
- ✅ Large objects with deep updates

**Example Without Immer:**
```typescript
set((state) => ({
  ...state,
  user: {
    ...state.user,
    profile: {
      ...state.user.profile,
      settings: {
        ...state.user.profile.settings,
        theme: 'dark'
      }
    }
  }
}))
```

**Example With Immer:**
```typescript
import { immer } from 'zustand/middleware/immer'

set((state) => {
  state.user.profile.settings.theme = 'dark'
  // Automatically creates immutable update
})
```

---

### Option D: Combine Middleware

**What it does:**
- Use multiple middleware together
- Chain them for different effects

**Example:**
```typescript
import { devtools, persist, createJSONStorage } from 'zustand/middleware'

const useAuthStore = create(
  devtools(
    persist<AuthState>(
      (set) => ({
        // ... state
      }),
      {
        name: 'auth-storage',
        storage: createJSONStorage(() => sessionStorage),
      }
    ),
    { name: 'AuthStore' }
  )
)
```

**Best Practice:**
- Use DevTools in development only (wrap with `process.env.NODE_ENV === 'development'`)
- Use Persist for non-sensitive UI state
- Use Immer only if needed for complex updates

---

## 3. SWR Integration Strategy

### Option A: Zustand Only (Replace SWR)

**Approach:**
- Use Zustand for ALL state management
- Manually implement caching, revalidation, etc.

**Pros:**
- ✅ Single state management solution
- ✅ Full control over fetching logic
- ✅ No library overlap

**Cons:**
- ❌ Lose SWR's excellent features (stale-while-revalidate, deduplication)
- ❌ Need to reimplement caching manually
- ❌ More boilerplate code
- ❌ SWR already installed and battle-tested

**Use Cases:**
- When you want minimal dependencies
- Simple data fetching patterns
- **Not recommended** - SWR is already in your stack

---

### Option B: SWR for Server Data, Zustand for Client State (Recommended)

**Approach:**
- SWR: Server-fetched data (matches, queues, stats, leaderboards)
- Zustand: Client state (auth, UI, socket, user preferences)

**Pros:**
- ✅ Use each tool for its strengths
- ✅ SWR handles caching, revalidation, deduplication automatically
- ✅ Zustand handles UI and client-side state
- ✅ Best of both worlds
- ✅ Minimal code duplication

**Cons:**
- ❌ Two different patterns to learn
- ❌ Need to coordinate between SWR and Zustand
- ❌ Slight mental overhead

**Use Cases:**
- ✅ **Perfect for your project**
- ✅ When you have both server and client state
- ✅ Most production Next.js apps

**Example:**
```typescript
// SWR for server data
const { data: matches } = useSWR('/api/matches', fetcher)

// Zustand for client state
const user = useAuthStore((state) => state.user)
const isModalOpen = useUIStore((state) => state.isModalOpen)

// Sync them if needed
useEffect(() => {
  if (matches) {
    useMatchStore.getState().setMatches(matches)
  }
}, [matches])
```

---

### Option C: SWR + Zustand Hybrid (Sync Pattern)

**Approach:**
- SWR fetches data
- Zustand stores it for global access
- Custom hook syncs them

**Pros:**
- ✅ Get SWR features (caching, etc.)
- ✅ Zustand provides global access
- ✅ Can optimize updates

**Cons:**
- ❌ More complexity
- ❌ Potential for sync bugs
- ❌ Usually unnecessary

**Use Cases:**
- When you need SWR caching but also global store access
- When multiple components need the same SWR data
- Usually can just use SWR's global cache

**Example:**
```typescript
// Custom hook that syncs SWR to Zustand
function useMatches() {
  const { data, error } = useSWR('/api/matches', fetcher)
  const setMatches = useMatchStore((state) => state.setMatches)
  
  useEffect(() => {
    if (data) setMatches(data)
  }, [data, setMatches])
  
  return { data, error }
}
```

---

## 4. Authentication Flow Strategy

### Option A: Sync with NextAuth on Mount Only

**Approach:**
- Fetch user on app mount
- Store in Zustand
- Update manually on login/logout

**Pros:**
- ✅ Simple implementation
- ✅ Clear data flow
- ✅ Fewer edge cases

**Cons:**
- ❌ Manual sync needed for all auth actions
- ❌ Can get out of sync
- ❌ Need to remember to update Zustand

**Use Cases:**
- Simple auth flows
- When auth state changes infrequently
- MVP/prototype

**Example:**
```typescript
// On app mount
useEffect(() => {
  const syncAuth = async () => {
    const session = await auth()
    if (session?.user) {
      useAuthStore.getState().setUser(session.user)
    }
  }
  syncAuth()
}, [])

// Manual update on login
const handleLogin = async () => {
  await signIn('credentials', { ... })
  // Must manually sync
  const session = await auth()
  useAuthStore.getState().setUser(session.user)
}
```

---

### Option B: Sync on Mount + Route Changes (Recommended)

**Approach:**
- Sync on mount
- Sync when route changes (usePathname hook)
- Sync on explicit auth events

**Pros:**
- ✅ Stays in sync automatically
- ✅ Handles most edge cases
- ✅ Good balance of simplicity and reliability

**Cons:**
- ❌ More frequent syncing (but lightweight)
- ❌ Slight overhead

**Use Cases:**
- ✅ **Recommended for your project**
- ✅ Production apps
- ✅ When auth state can change outside your control

**Example:**
```typescript
// hooks/useAuthSync.ts
export function useAuthSync() {
  const pathname = usePathname()
  const { setUser, clearUser } = useAuthStore()
  
  useEffect(() => {
    const syncAuth = async () => {
      try {
        const response = await fetch('/api/auth/me')
        const data = await response.json()
        
        if (data.authenticated) {
          setUser(data.user)
        } else {
          clearUser()
        }
      } catch {
        clearUser()
      }
    }
    
    syncAuth()
  }, [pathname, setUser, clearUser])
}

// In root layout
function Layout({ children }) {
  useAuthSync()
  return <>{children}</>
}
```

---

### Option C: Real-time Sync with NextAuth Events

**Approach:**
- Subscribe to NextAuth events
- Update Zustand automatically
- Use callback system

**Pros:**
- ✅ Always in sync
- ✅ Handles all edge cases
- ✅ Most robust solution

**Cons:**
- ❌ Most complex
- ❌ Requires NextAuth configuration changes
- ❌ Can be overkill

**Use Cases:**
- Complex auth flows
- Multiple auth providers
- When you need absolute sync guarantees

**Example:**
```typescript
// In auth.ts
callbacks: {
  async signIn({ user }) {
    // Sync to Zustand (requires client-side bridge)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth-signin', { detail: user }))
    }
    return true
  },
}

// In Zustand store
if (typeof window !== 'undefined') {
  window.addEventListener('auth-signin', (e) => {
    useAuthStore.getState().setUser(e.detail)
  })
}
```

---

## 5. TypeScript Strategy

### Option A: Types in Store Files

**Approach:**
- Define types directly in store files
- No shared types package

**Pros:**
- ✅ Types close to usage
- ✅ Simple imports
- ✅ Quick to implement

**Cons:**
- ❌ Duplicate type definitions
- ❌ Hard to share with backend
- ❌ Can drift from backend types

**Use Cases:**
- Prototypes
- Small projects
- When types are simple

**Example:**
```typescript
// stores/auth.ts
interface User {
  id: string
  email: string
  username: string | null
}

interface AuthState {
  user: User | null
  // ...
}
```

---

### Option B: Shared Types from @trayb/types (Recommended)

**Approach:**
- Import types from `@trayb/types`
- Ensure frontend and backend use same types
- Store files only define state shape

**Pros:**
- ✅ Single source of truth
- ✅ Type safety across frontend/backend
- ✅ No duplication
- ✅ Easier refactoring
- ✅ Better IDE autocomplete

**Cons:**
- ❌ Need to keep types package in sync
- ❌ Slightly more setup

**Use Cases:**
- ✅ **Perfect for monorepo setup**
- ✅ Production apps
- ✅ When backend types exist

**Example:**
```typescript
// stores/auth.ts
import type { User } from '@trayb/types'

interface AuthState {
  user: User | null
  isLoading: boolean
  error: string | null
  // Actions
  setUser: (user: User | null) => void
  clearUser: () => void
}
```

---

### Option C: Hybrid (Shared Core + Local Extensions)

**Approach:**
- Core types from `@trayb/types`
- Extend for frontend-specific needs

**Pros:**
- ✅ Best of both worlds
- ✅ Core types shared
- ✅ Frontend-specific extensions

**Cons:**
- ❌ Need to manage extensions
- ❌ Can become complex

**Use Cases:**
- When you need to extend shared types
- Complex frontend state

**Example:**
```typescript
// stores/auth.ts
import type { User } from '@trayb/types'

// Extend for frontend needs
interface ExtendedUser extends User {
  lastSeen?: Date
  isOnline?: boolean
}

interface AuthState {
  user: ExtendedUser | null
  // ...
}
```

---

## 6. Initial Scope & Rollout

### Option A: Start Small (Auth Store Only)

**Approach:**
- Implement auth store first
- Replace existing auth state management
- Add other stores incrementally

**Pros:**
- ✅ Lower risk
- ✅ Easy to test
- ✅ Quick to implement
- ✅ Can validate approach
- ✅ Less refactoring if issues

**Cons:**
- ❌ Gradual migration needed
- ❌ Temporary code duplication

**Use Cases:**
- ✅ **Recommended start**
- ✅ When unsure about approach
- ✅ Large codebase
- ✅ Risk-averse teams

**Steps:**
1. Create auth store
2. Replace `page.tsx` auth state
3. Replace `navbar-conditional.tsx` auth state
4. Replace `profile/page.tsx` auth state
5. Test thoroughly
6. Then move to UI store

---

### Option B: Big Bang (All Stores at Once)

**Approach:**
- Implement all stores simultaneously
- Replace all state management in one go

**Pros:**
- ✅ Complete migration quickly
- ✅ Consistent patterns from start
- ✅ No temporary duplication

**Cons:**
- ❌ Higher risk
- ❌ Harder to debug
- ❌ Large PR/commit
- ❌ More testing needed

**Use Cases:**
- Small codebase
- New features (no migration)
- When confident in approach

---

### Option C: Phased Rollout (Recommended)

**Approach:**
- Phase 1: Auth store (critical path)
- Phase 2: UI store (low-hanging fruit)
- Phase 3: Socket store (when needed)
- Phase 4: Game/Match stores (future features)

**Pros:**
- ✅ Balanced risk and speed
- ✅ Learn from each phase
- ✅ Manageable chunks
- ✅ Can adjust approach

**Cons:**
- ❌ Takes longer overall
- ❌ Need to plan phases

**Use Cases:**
- ✅ **Best for production apps**
- ✅ Complex migrations
- ✅ Team environments

**Timeline:**
- Week 1: Auth store
- Week 2: UI store
- Later: Socket, Game stores as features develop

---

## Recommendations for Your Project

Based on your codebase analysis, here's what I recommend:

### ✅ Recommended Stack:

1. **Store Organization:** Option B (Multiple Small Stores)
   - `stores/auth.ts` - User authentication state
   - `stores/ui.ts` - Modals, sidebar, theme, banners
   - `stores/socket.ts` - Real-time connection (future)
   - `stores/game.ts` - Game/match state (future)

2. **Middleware:**
   - ✅ DevTools (development only)
   - ✅ Persist for UI store (theme, sidebar state, dismissed banners)
   - ❌ Persist for auth (use NextAuth session instead)
   - ❌ Immer (not needed yet - can add later if state becomes complex)

3. **SWR Integration:** Option B (SWR for server data, Zustand for client state)
   - SWR: Matches, queues, stats, leaderboards
   - Zustand: Auth, UI, socket, preferences

4. **Auth Flow:** Option B (Sync on mount + route changes)
   - Custom hook `useAuthSync()` in root layout
   - Sync on pathname changes
   - Manual sync on login/logout actions

5. **TypeScript:** Option B (Shared types from @trayb/types)
   - Import User, Game, Match types from shared package
   - Store files define state shapes only

6. **Initial Scope:** Option C (Phased Rollout)
   - Phase 1: Auth store (replace 3 duplicate fetch calls)
   - Phase 2: UI store (replace localStorage scattered usage)
   - Phase 3+: Socket and Game stores as features develop

---

## Next Steps

1. Review these options and confirm choices
2. Start with Auth store implementation
3. Create store structure following recommendations
4. Migrate existing auth state management
5. Test thoroughly
6. Move to Phase 2 (UI store)

