-- PAYPAL PAYMENTS -----------------------------------------------------------
-- Turns the simulated subscription checkout into a real PayPal-backed flow.
--   1) `subscriptions` gains provider columns: which PSP the subscription is
--      managed by and the PayPal subscription ID (I-...).
--   2) `payments` is the idempotent receipt ledger: one row per PayPal payment
--      (unique on provider_payment_id) so webhooks/retries can't double-activate.
--
-- Safe to re-run: additive, guarded with if-not-exists.

alter table public.subscriptions
  add column if not exists provider text,
  add column if not exists provider_subscription_id text;

-- A pending subscription is created before PayPal approval; it must never count
-- toward the single-active-row index.
alter table public.subscriptions drop constraint if exists subscriptions_status_check;
alter table public.subscriptions add constraint subscriptions_status_check
  check (status in ('trialing','active','past_due','canceled','expired','pending'));

create unique index if not exists subscriptions_provider_sub_id_idx
  on public.subscriptions (provider_subscription_id)
  where provider_subscription_id is not null;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  provider text not null default 'paypal',
  provider_payment_id text,
  provider_subscription_id text,
  amount_cents int not null default 0,
  currency text not null default 'USD',
  status text not null default 'completed',
  plan_slug text,
  billing_period text,
  created_at timestamptz not null default now()
);

create unique index if not exists payments_provider_payment_id_key
  on public.payments (provider_payment_id)
  where provider_payment_id is not null;

grant select, insert, update, delete on public.payments to service_role;
grant select on public.payments to authenticated;
alter table public.payments enable row level security;

-- Users can see only their own receipts.
create policy "own payments" on public.payments
  for select to authenticated using (auth.uid() = user_id);

-- Admins can read across all receipts (same pattern as subscriptions).
create policy "admins read payments" on public.payments
  for select to authenticated using (public.has_role(auth.uid(),'admin'));

create index payments_user_id_idx on public.payments (user_id);
create index payments_created_at_idx on public.payments (created_at desc);
