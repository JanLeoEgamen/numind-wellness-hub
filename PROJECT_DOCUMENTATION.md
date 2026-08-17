# NuMind Wellness Hub — Project Documentation

> Written from direct inspection of the source code in this repository
> (does not rely on the product-spec README). Last updated: 2026-08-17.

## 1. Overview

NuMind is a consumer **wellness and personal-growth web app** ("Reset. Focus. Grow.")
built as a TanStack Start (SSR) application. It combines habit tracking,
gamification (XP / levels / streaks / badges), a virtual "Wellness Garden",
journaling, learning content, an AI companion ("Numi"), and a positive-only
community feed.

The repository contains the full-stack web app: a React 19 UI, TanStack Start
server functions, a Supabase backend (auth + PostgreSQL), and Supabase
migrations. Deployment target is Cloudflare Workers (nitro build).

---

## 2. Technology Stack

| Layer | Technology | Notes |
| --- | --- | --- |
| Framework | TanStack Start `1.168.32` (`@tanstack/react-start`) | SSR, server functions, middleware |
| Routing | TanStack Router `1.170.18` | File-based route tree (`routeTree.gen.ts`) |
| UI | React `19.2.0` / React DOM | React 19 |
| Build / Dev | Vite `8.2.0` via `@lovable.dev/vite-tanstack-config` | Config from Lovable, don't duplicate plugins |
| Styling | Tailwind CSS `4.2.1` + `tw-animate-css` + `tailwind-merge` | Design tokens in `src/styles.css` |
| Components | shadcn/ui "new-york" style, Radix UI primitives | ~50 primitives in `src/components/ui` |
| Server state | TanStack React Query `5.101.1` | Query wrappers in `src/lib/server-data.ts` |
| Backend / DB | Supabase (`@supabase/supabase-js` `2.112.3`) | Auth + PostgreSQL via migrations |
| Validation | zod `3.24.2` | Already a dependency; light runtime validation for now |
| Forms | react-hook-form `7.71.2` + `@hookform/resolvers` | |
| Misc | date-fns, lucide-react, recharts, embla-carousel-react, sonner (toasts), vaul (drawer), cmdk, input-otp, react-day-picker, react-resizable-panels | |
| Server runtime | nitro `3.0.260603-beta` | Build-time, Cloudflare default target |
| Package manager | bun (bun.lock) + npm (package-lock.json) | |

---

## 3. Repository Structure

```
numind-wellness-hub/
├── public/                          # Static assets (favicon, etc.)
├── src/
│   ├── components/
│   │   ├── auth/                    # AuthCard.tsx
│   │   ├── layout/                  # AppShell.tsx, SiteChrome.tsx
│   │   ├── numind/                  # ui-kit.tsx, celebration.tsx
│   │   └── ui/                      # ~50 shadcn/Radix UI primitives
│   ├── hooks/                       # useAuth.ts, use-mobile.tsx
│   ├── integrations/supabase/       # client, server client, auth middleware
│   ├── lib/                         # store, server functions, mock data, utils
│   ├── routes/                      # 34 file-based route modules
│   ├── routeTree.gen.ts             # Auto-generated router tree (do not edit)
│   ├── router.tsx                   # Router + QueryClient factory
│   ├── server.ts                    # SSR entry (error-intercepting)
│   ├── start.ts                     # createStart + middleware wiring
│   └── styles.css                   # Design system (Tailwind 4 tokens)
├── supabase/migrations/             # SQL migrations (schema + RLS + admin)
├── .env / .env.example              # Supabase + AI provider env vars
├── package.json / bun.lock / package-lock.json
├── tsconfig.json                    # strict TS, @/* path alias
├── vite.config.ts                   # Lovable tanstack config wrapper
├── components.json                  # shadcn config
├── eslint.config.js                 # ESLint flat config
└── AGENTS.md                        # Lovable git-history guidance
```

## 4. Routing & Pages

Routes are file-based under `src/routes/` (34 modules) compiled into
`src/routeTree.gen.ts`. Root route `src/routes/__root.tsx` sets global meta,
Google Fonts (Outfit + Plus Jakarta Sans), the React Query + NuMind providers,
the Toaster, and 404/error boundaries.

### Public / marketing (no auth)
| Route | File | Purpose |
| --- | --- | --- |
| `/` | `index.tsx` | Landing page (features, play, pricing preview) |
| `/about` | `about.tsx` | About page |
| `/faq` | `faq.tsx` | FAQ page |
| `/features` | `features.tsx` | Feature grid |
| `/pricing` | `pricing.tsx` | Pricing page (`PricingCards`) |
| `/privacy` | `privacy.tsx` | Privacy policy |
| `/terms` | `terms.tsx` | Terms |

### Authentication / onboarding
| Route | File |
| --- | --- |
| `/login` | `login.tsx` |
| `/signup` | `signup.tsx` |
| `/forgot-password` | `forgot-password.tsx` |
| `/reset-password` | `reset-password.tsx` |
| `/onboarding` | `onboarding.tsx` |

### App (protected, `ssr: false`, inside `AppShell`)
`src/routes/app.tsx` guards the whole subtree: `beforeLoad` checks the Supabase
session and redirects to `/login`. Nested routes render via `<Outlet />`.

| Route | File | Feature |
| --- | --- | --- |
| `/app` | `app.index.tsx` | Dashboard / Today's Journey |
| `/app/reset` | `app.reset.tsx` | Daily Reset (mood/energy/focus/water/intention) |
| `/app/mind-gym` | `app.mind-gym.tsx` | Breathing / mindfulness sessions |
| `/app/quest` | `app.quest.tsx` | Quests / challenges |
| `/app/numi` | `app.numi.tsx` | Numi AI chat |
| `/app/wellness` | `app.wellness.tsx` | Habits / wellness tracking |
| `/app/journal` | `app.journal.tsx` | Journal (brain dumps, gratitude, wins) |
| `/app/memory-lane` | `app.memory-lane.tsx` | Memories recap |
| `/app/together` | `app.together.tsx` | Community feed |
| `/app/learning` | `app.learning.tsx` | Learning Lounge |
| `/app/journey` | `app.journey.tsx` | Monthly Journey recap |
| `/app/rewards` | `app.rewards.tsx` | Rewards / XP spend |
| `/app/garden` | `app.garden.tsx` | Wellness Garden |
| `/app/focus` | `app.focus.tsx` | Focus Zone (timer / task breakdown) |
| `/app/play` | `app.play.tsx` | Healthy Play (trivia, bingo, wheel, match, senses) |
| `/app/profile` | `app.profile.tsx` | Profile |
| `/app/notifications` | `app.notifications.tsx` | Notification inbox |
| `/app/settings` | `app.settings.tsx` | Settings (theme, font-scale, security) |
| `/app/safety` | `app.safety.tsx` | Safety Center (crisis resources) |

### Admin
| Route | File |
| --- | --- |
| `/admin` | `admin.tsx` | Admin dashboard (metrics + catalog CRUD + moderation) |

> App navigation is defined in `src/components/layout/AppShell.tsx`: `PRIMARY`
> (Home, Reset, Mind Gym, Quest, Numi) in the sidebar and `MORE`
> (Wellness, Journal, Memory Lane, Together, Learning, Journey, Rewards,
> Garden, Focus, Play, Profile, Settings, Safety) under the "More" sheet.

## 5. Application Architecture

### Startup / entry chain
1. **`src/server.ts`** is the bundled server entry (`vite.config.ts` sets
   `server.entry = "server"`). It lazy-loads the TanStack Start server entry,
   wraps every handler, and **normalizes catastrophic SSR failures** — h3
   swallows in-handler throws into a 500 JSON body (`{"unhandled":true,...}`),
   which this file detects and replaces with a friendly HTML error page.
2. **`src/start.ts`** (`createStart`) wires middleware:
   - `functionMiddleware: [attachSupabaseAuth]` — client-side middleware that
     reads the Supabase session and attaches `Authorization: Bearer <token>` to
     every server-function RPC.
   - `requestMiddleware: [errorMiddleware, csrfMiddleware]` — CSRF protection
     (`filter: handlerType === "serverFn"`) plus a server error boundary.
3. **`src/router.tsx`** (`getRouter`) creates a TanStack Router with a fresh
   `QueryClient`, scroll restoration, and `defaultPreloadStaleTime: 0`.

### Server functions (TanStack Start)
`src/lib/server-functions.ts`, `src/lib/admin-functions.ts` and
`src/lib/numi-functions.ts` define **server functions**
(`createServerFn({ method: "POST" })`). Each is protected by
`requireSupabaseAuth`, which:
- reads the `Authorization` bearer token from the request,
- validates it via `supabase.auth.getClaims(token)`,
- opens a **user-scoped (RLS) Supabase client** and injects `supabase`,
  `userId`, and `claims` into the function context.

Admin functions additionally require `requireAdmin` (role check via a
security-definer RPC — `"admin" | "moderator"` roles).

### Auth / data clients (`src/integrations/supabase`)
| File | Purpose |
| --- | --- |
| `client.ts` | Browser Supabase client (publishable key, localStorage session, auto refresh). Lazily created via Proxy. |
| `client.server.ts` | **Service-role** admin client (bypasses RLS). Server-only — never import at top level in client-bundled files. |
| `auth-middleware.ts` | `requireSupabaseAuth` server middleware (JWT validation). |
| `auth-attacher.ts` | `attachSupabaseAuth` client middleware (adds bearer header). |
| `types.ts` | Generated `Database` TypeScript types. |

### Client state — `src/lib/numind-store.tsx`
`NuMindProvider` / `useNuMind()` is a React context store holding:
- `xp`, `levelIndex`, `streak`, `longestStreak`, `gardenXp`, `completed[]`
- theme (`light`/`dark`/`system`) and `fontScale` (applied to `<html>`)
- celebration modal state, journal streak / entry count

It **hydrates from the real backend** on mount via `getMyStats()` (server
values are the source of truth; mock defaults are only warm placeholders) and
exposes helpers: `completeTask`, `awardXp`, `claimDailyReward`, `setTheme`,
`setFontScale`, `celebrate`, `isComplete`. Levels / garden stages are derived
from `LEVELS` and `GARDEN_STAGES` in `src/lib/mock-data.ts`.

### Data fetching — `src/lib/server-data.ts`
Thin React Query hooks: `useMyStats`, `useMyHabits`, `useMyJournal`,
`useMyNotifications`, `useMyGarden`, `useCommunityFeed`, `useMyBadges`,
`useMindGymActivities`, `useLearningCatalog`, `useMyQuests`, `useMyMemories`,
`useTodaysJourney`. Exports `isUuid()` to guard against posting non-UUID ids to
FK columns. `useTodaysJourney` refreshes on mount + window focus to keep the
home dashboard live.

---

## 6. Authentication Flow

1. **Signup / login** routes call Supabase Auth directly from the browser
   client (`@/integrations/supabase/client`).
2. **Session persistence**: Supabase `localStorage` + `autoRefreshToken`.
3. **App guard**: `/app` route's `beforeLoad` calls `supabase.auth.getUser()`
   and throws a `redirect({ to: "/login" })` when unauthenticated.
4. **Server-function auth**: the browser `attachSupabaseAuth` middleware adds
   the bearer token; the server `requireSupabaseAuth` middleware validates it
   and opens an RLS-scoped client per user.
5. **Sign out** (`src/hooks/useAuth.ts` `signOut()`) clears the session and
   navigates to `/login`.

---

## 7. Server Functions Reference

All are `createServerFn({ method: "POST" })` protected by `requireSupabaseAuth`
unless noted.

### `src/lib/server-functions.ts` (user domain)
| Function | Purpose |
| --- | --- |
| `getMyStats` | Profile, XP total, current/longest streak, level, garden, today's reset + reward state |
| `getTodaysJourney` | Live completion state for each Daily Journey task |
| `submitDailyReset` | Upsert daily_resets (mood/energy/focus/sleep/intention), awards +20 XP once on completion, creates first-reset memory |
| `getMyHabits` | User's habits / wellness checklist |
| `toggleHabitFavorite` | Favorite/unfavorite a habit |
| `getMyJournal` / save journal | Journal entries + streaks/count |
| `getMyNotifications` | Notification inbox (read/unread) |
| `getCommunityFeed` | Positive-only community posts |
| `getMyBadges` | Earned badges |
| `getMyGarden` | Garden stage, growth points, theme, decorations |
| `getMindGymActivities` | Mind Gym catalog |
| `getLearningCatalog` | Learning Lounge catalog |
| `completeLesson` | Mark lesson complete, award XP (idempotent per content) |
| `getMyQuests` / `completeQuest` | Quests + completion (XP once per quest per period) |
| `saveMindCheck` / `getMindChecks` | Mood / Worry / Focus daily reflections (single daily row) |
| `getMyMemories` / `toggleMemoryFavorite` / `toggleMemoryPin` | Memories recap |
| `claimDailyReward` | Daily gift, +50 XP (idempotent per day) |
| `recordGamePlay` | Healthy Play session; awards XP **once per game per day** (`game_plays`) |
| `awardXp` (internal) | Idempotent XP grant keyed on `source_type + source_id` via `xp_transactions` |

### `src/lib/numi-functions.ts` (AI companion)
| Function | Purpose |
| --- | --- |
| `chatWithNumi` | Sends conversation history to an OpenAI-compatible endpoint; persists to `ai_conversations` / `ai_conversation_messages`; returns `{ assistant, conversationId, fallback }` |

Numi defaults to **Pollinations AI** (keyless, free). Configurable via
`AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY` (Groq, Gemini, Cloudflare Workers AI,
Ollama). Falls back to a warm offline reply on upstream failure; auto-retries a
Cloudflare model when the configured model is deprecated (HTTP 410).

### `src/lib/admin-functions.ts` (requires `requireAdmin`)
| Function | Purpose |
| --- | --- |
| `getAdminDashboard` | Aggregated metrics (30d users, XP, plays, subs, etc.) via security-definer RPC |
| `adminListCatalog` / `adminUpsertCatalog` / `adminDeleteCatalog` / `adminSetCatalogActive` | Generic CRUD for whitelisted content tables |
| `adminListUsers` / `adminGetUserDetail` / `adminSetUserRole` / `adminRemoveUserRole` | User management + roles |
| `adminListSubscriptions` / `adminSetSubscriptionStatus` | Subscriptions |
| `adminListAllPosts` / `adminSetPostHidden` / `adminDeletePost` | Community moderation |

## 8. Design System (`src/styles.css`)

Tailwind CSS v4 with `@theme` tokens (oklch) plus custom utilities.

### Fonts
- **Display**: `Outfit` (headings h1–h5, letter-spacing -0.02em)
- **Body / Sans**: `Plus Jakarta Sans`
- Loaded via Google Fonts in `__root.tsx`.

### Color palette (semantic + brand)
- Brand *accents*: `--navy`, `--teal`, `--cyan`, `--lavender`, `--grape`,
  `--mint`, `--sun`, `--coral` (custom colors → `bg-teal`, `text-coral`, etc.)
- Base tokens: `--background`, `--foreground`, `--surface`, `--surface-2`,
  `--card`, `--popover`, `--muted`, `--accent`, `--destructive`, `--border`,
  `--input`, `--ring`, plus shadcn `--sidebar-*` and `--chart-1..5`.
- Radius base: `1.25rem` (scaled `sm`→`4xl`).

### Gradients & shadows
- Gradients: `--gradient-brand`, `--gradient-warm`, `--gradient-garden`,
  `--gradient-hero`.
- Shadows: `--shadow-soft`, `--shadow-lift`, `--shadow-glow`.

### Custom utilities
`bg-brand`, `bg-hero`, `bg-garden`, `bg-warm`, `text-brand` (gradient text),
`shadow-soft|lift|glow`, `card-soft`, `hover-lift`, `focus-ring`, and
animations `animate-float`, `animate-breathe`, `animate-pop`, `animate-rise`,
plus a `numind-confetti` keyframe. A `prefers-reduced-motion` block disables
animations for reduced-motion users. Dark mode is driven by a `.dark` class
(`@custom-variant dark`).

---

## 9. UI Component Libraries

### Generic UI primitives (`src/components/ui/`)
~50 shadcn/Radix components, all in "new-york" style: button, card, input,
label, textarea, form, dialog, alert-dialog, dropdown-menu, select, tabs,
popover, tooltip, badge, avatar, checkbox, radio-group, switch, slider,
progress, accordion, sheet, drawer (vaul), sidebar, table, toast (sonner),
calendar, carousel, chart, command, context-menu, hover-card, menubar,
navigation-menu, pagination, resizable, scroll-area, separator, skeleton,
sonner, toggle, toggle-group, input-otp, breadcrumb, collapsible, aspect-ratio.

### NuMind domain components (`src/components/numind/`)
- **`ui-kit.tsx`** — gamification primitives: `XPBadge`, `LevelBadge`,
  `StreakBadge`, `ProgressRing`, `ProgressBar`, `ToneIcon`, `SoftCard`,
  `PageHeader`, `EmptyState`, `LoadingState`, `ErrorState`, `LockedPill`,
  `DisclaimerNote`, `Confetti`, `StatTile`, `CTALink`.
- **`celebration.tsx`** — `CelebrationModal` (reward overlay + confetti).

### Layout components
- **`AppShell.tsx`** — authenticated app shell: sticky sidebar (primary nav +
  XP/level/streak/progress), responsive mobile bottom-nav with a "More" sheet,
  unread-notification badge, logout dialog, and `CelebrationModal`.
- **`SiteChrome.tsx`** — public marketing layout (sticky header, footer with
  links/legal, auth-aware actions) and the reusable `PricingCards` component.

### Auth components
- **`AuthCard.tsx`** — wrapped card for auth pages.

### Hooks
- **`useAuth.ts`** — `useAuth()` (session/user/loading/isAuthenticated) + `signOut()`.
- **`use-mobile.tsx`** — `useIsMobile()` (768px breakpoint).

## 10. Database & Migrations (`supabase/migrations/`)

Supabase PostgreSQL schema, RLS policies, and admin RPCs. Base migrations (author
schema) are timestamped `20260814...` and include tables such as: `profiles`,
`xp_transactions`, `levels`, `daily_resets`, `gardens`, `habits`, `journal_entries`,
`notifications`, `community_posts`, `badges`, `mind_gym_activities`,
`learning_content`, `quests`, `quest_completions`, `mind_checks`,
`memories`, `ai_conversations` / `ai_conversation_messages`, `game_plays`,
`subscriptions`, and more — all with RLS + service-role grants.

| Migration | Purpose |
| --- | --- |
| `20260814..._*.sql` (4) | Initial schema: profiles, XP, levels, daily resets, gardens, habits, journal, notifications, community, badges, mind gym, learning, quests, memories, Numi conversations, subscriptions |
| `20260814010000_add_habit_favorite.sql` | Adds `favorite` column to habits |
| `20260814010001_add_game_plays.sql` | Healthy Play tracking table + RLS |
| `20260814010002_mind_checks_unique.sql` | Unique constraint: one mind-check row per user/day |
| `20260814010003_fix_game_plays_daily_unique.sql` | Backfills `played_date` + unique index `(user_id, game, played_date)` |
| `20260814120000_xp_transactions_source_id_text.sql` | Widens `source_id` to text |
| `20260817120000_admin_backend.sql` | Admin RPC helpers (`requireAdmin` role checks, security-definer functions) |
| `20260817130000_admin_features.sql` | Admin dashboard aggregation functions + metrics |

> **Healthy Play note:** the `game_plays` table already exists via the two
> migrations above. XP is awarded at most once per game per calendar day (the
> `game_plays_user_game_day_idx` unique index on `user_id, game, played_date`).

---

## 11. Configuration & Environment

### Environment variables (`.env`, see `.env.example`)
| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` / `VITE_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable (anon) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key (server-only admin client) |
| `SUPABASE_PROJECT_ID` / `VITE_SUPABASE_PROJECT_ID` | Project id |
| `AI_BASE_URL` | OpenAI-compatible endpoint (default Pollinations) |
| `AI_MODEL` | Model name (default `openai`) |
| `AI_API_KEY` | Provider key (blank for keyless providers) |

### Key config files
- **`tsconfig.json`** — `strict: true`, ES2022, `@/*` → `./src/*`, bundler resolution.
- **`vite.config.ts`** — Lovable tanstack config; sets `server.entry = "server"`.
- **`components.json`** — shadcn config (new-york, lucide icons, slate base).
- **`eslint.config.js`** — flat config; TS + React Hooks + Refresh + Prettier;
  bans the Next.js `server-only` package.

---

## 12. Scripts

From `package.json`:
```
dev         vite dev          # start dev server
build       vite build        # production build (nitro/Cloudflare)
build:dev   vite build --mode development
preview     vite preview      # preview production build
lint        eslint .          # type-aware ESLint (flat config)
format      prettier --write .  # format all files
```
Install: `npm install` or `bun install`. Can run with either package manager
(`bun run dev`, `npm run dev`).

---

## 13. Getting Started

1. **Install** — `npm install` (or `bun install`).
2. **Configure** — copy `.env.example` → `.env` and add Supabase URL + keys
   (and optional AI provider vars).
3. **Migrate DB** — apply `supabase/migrations/` to your Supabase project.
4. **Run** — `npm run dev` (Vite dev server).
5. **Build / preview** — `npm run build` then `npm run preview`.
6. **Lint / format** — `npm run lint` / `npm run format`.

### Developer notes
- Do **not** edit `src/routeTree.gen.ts` or `src/integrations/supabase/*`
  (auto-generated).
- Do **not** duplicate the Vite plugins already provided by
  `@lovable.dev/vite-tanstack-config`.
- Do **not** rewrite pushed git history (Lovable sync) — see `AGENTS.md`.
- Never import `client.server.ts` (service-role) at top level of
  client-bundled files — load it inside server handlers only.


