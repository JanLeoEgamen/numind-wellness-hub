-- Symptom Check-Ins (PHQ-9 / GAD-7) + Report Center backing table.
--
-- One private row per completed questionnaire. The official instrument wording,
-- the 0-3 response scale and the range scoring tables live in the app
-- (src/lib/screening-instruments.ts) so item text is never paraphrased or
-- rewritten. The database stores only the numeric score, the resolved range
-- label and the raw 0-3 responses for the user's own history / reports.
--
-- Report Center windows are resolved server-side from the user's IANA timezone
-- (see generateWellnessReport), so no browser-computed boundaries are trusted.

create table public.screening_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  instrument text not null check (instrument in ('PHQ9','GAD7')),
  score int not null check (score between 0 and 27),
  range_label text not null check (
    range_label in ('Minimal','Mild','Moderate','Moderately severe','Severe')
  ),
  responses jsonb not null default '[]'::jsonb,
  completed_at timestamptz not null default now()
);

-- OWNER-ONLY RLS + GRANTS (same pattern as the private rows block in the
-- 20260814004712 migration).
grant select, insert, update, delete on public.screening_completions to authenticated;
grant all on public.screening_completions to service_role;
alter table public.screening_completions enable row level security;
create policy "own rows screening_completions" on public.screening_completions
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index screening_completions_user_completed_idx
  on public.screening_completions (user_id, completed_at desc);