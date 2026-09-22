-- SUBSCRIPTION RECONCILE CRON ------------------------------------------------
-- Housekeeping for PayPal-managed subscriptions, scheduled inside Postgres.
--
-- Why: PayPal webhooks are the primary source of truth, but a missed webhook
-- (deploy in flight, signature failure, outage) would otherwise leave a lapsed
-- row `active` forever.
--
-- Note this job only flips the `status` column, which drives admin/analytics
-- views. *Access* is enforced independently by getUserEntitlement, which treats
-- provider-managed rows as time-bound using current_period_end -- so no user
-- ever keeps premium past their paid period even if this job runs late or not
-- at all.
--
-- Scope: provider = 'paypal' only. Manual/admin grants and the simulated
-- (pre-PayPal) flow leave `provider` null and stay status-driven, so this job
-- can never silently expire something an admin granted by hand.
--
-- Safe to re-run: unschedules the previous job of the same name first.
--
-- Requires the pg_cron extension. If your migration role cannot create
-- extensions, enable it once from Dashboard -> Integrations -> Cron and run
-- only the cron.schedule statement below.

-- pg_cron can require superuser privileges to install. Try, but never hard-fail
-- the migration: the notices below say exactly what to do if it is missing.
do $migration$
declare
  has_pg_cron boolean;
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'pg_cron could not be created by this role (%). Enable it from Dashboard -> Integrations -> Cron, then re-run this migration.', sqlerrm;
  end;

  select exists (select 1 from pg_extension where extname = 'pg_cron') into has_pg_cron;

  if not has_pg_cron then
    raise notice 'pg_cron is NOT installed -- subscriptions-reconcile was NOT scheduled.';
  else
    -- Idempotency: cron.schedule fails on a duplicate name, and cron.unschedule
    -- raises if the job does not exist.
    if exists (select 1 from cron.job where jobname = 'subscriptions-reconcile') then
      perform cron.unschedule('subscriptions-reconcile');
    end if;

    perform cron.schedule(
      'subscriptions-reconcile',
      '0 * * * *', -- hourly, on the hour (UTC)
      $job$
        -- 1) Lapsed PayPal subscriptions: the paid period ended more than the
        --    grace window ago, so lift them out of active/trialing.
        update public.subscriptions
           set status = 'expired'
         where status in ('active', 'trialing', 'past_due', 'canceled')
           and provider = 'paypal'
           and current_period_end is not null
           and current_period_end < now() - interval '48 hours';

        -- 2) Abandoned checkouts: parked in 'pending' before PayPal approval and
        --    never confirmed. They never grant access, so this is pure hygiene.
        update public.subscriptions
           set status = 'expired'
         where status = 'pending'
           and created_at < now() - interval '24 hours';
      $job$
    );

    raise notice 'subscriptions-reconcile cron job registered (hourly).';
  end if;
end
$migration$;
