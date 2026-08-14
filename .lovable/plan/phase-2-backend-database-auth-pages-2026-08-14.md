# Phase 2 — Backend, Database, Auth Pages

Goal: stand up the real backend for NuMind, add the four missing auth pages, and gate the app routes. No redesign, no UI-to-data wiring (that is Phase 3).

## 1. Enable Lovable Cloud
Turns on Postgres, Auth, storage and row-level security for this project. No external accounts.

## 2. Database schema (single reproducible migration set)
Tables grouped by ownership:

Private, one row-owner each (RLS: `auth.uid() = user_id`)
- profiles (id -> auth.users, first/last name, nickname, avatar, timezone, locale, motivational style, onboarding_completed)
- goals, daily_resets (unique per user+date), wellness_habits, habit_logs, mind_checks
- mind_gym_completions, focus_sessions, quest_completions, journal_entries, learning_progress
- xp_transactions (single source of truth for XP), user_badges, gardens (one per user), user_garden_items
- memories, user_rewards, ai_conversations, ai_conversation_messages, ai_memories, notifications, subscriptions

Public catalog content (RLS: read-only to everyone, writes admin-only)
- mind_gym_activities, quests, learning_content, levels (XP thresholds live here), badges, rewards, garden_items, safety_resources, subscription_plans

Community
- community_posts, community_reactions — readable by signed-in users, writable/editable only by the author

Admin
- app_role enum + user_roles table with a `has_role()` security-definer function (roles are never stored on profiles), plus audit_events

Every table gets foreign keys with sensible cascade behaviour, indexes on `user_id` and date/lookup columns, `updated_at` triggers, and explicit grants.

## 3. Auth
- Supabase Auth is the only identity store; `profiles.id` references `auth.users.id`.
- Trigger on signup creates the profile row (name/nickname from signup metadata) plus the user's garden row.
- Email confirmation left on by default unless you'd rather have instant sign-in after signup.

## 4. Missing pages (built with existing NuMind components/tokens)
- `/signup` — first name, last name, nickname, email, password, confirm password, terms checkbox, "Create My Account", link to log in
- `/login` — email, password, forgot-password link, sign-up link
- `/forgot-password` — email, "Send Reset Link"
- `/reset-password` — new password, confirm, "Update Password"
Plus a session-aware sign-in/account affordance and sign-out in the existing chrome — no layout or visual changes beyond that.

## 5. Route protection
The `/app/*` routes stay exactly where they are; the existing `app.tsx` layout gains a client-side session check that redirects signed-out visitors to `/login`. Public marketing pages and auth pages are untouched.

## 6. Seed data
Migration inserts the catalog content matching the current UI wording: levels (Explorer → Wellness Champion with XP thresholds), badges, Mind Gym activities, quests, learning content, garden items, rewards, safety resources, subscription plans.

Per-user demo data (goals, resets, XP putting the account at Level 4 — Blooming, garden items, notifications) is seeded automatically for a demo account. Note: Postgres migrations cannot create an auth user, so the demo rows are attached the first time you sign up with the demo email, via the signup trigger.

## Out of scope this phase
No mock-data replacement across the UI, no payments, no AI integration, no admin dashboard.
