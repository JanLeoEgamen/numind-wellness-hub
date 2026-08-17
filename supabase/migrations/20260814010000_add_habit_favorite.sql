-- Add favorite flag so users can pin their most-tracked wellness habits.
alter table public.wellness_habits
  add column if not exists favorite boolean not null default false;

-- Keep the updated_at trigger column set consistent (no-op guard already exists).