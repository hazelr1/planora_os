/*
# Scheduled demo-account cleanup

Demo accounts (launch-demo) are real, permanent auth.users rows unless
something removes them — see the demo_expires_at stamp added alongside
is_demo_user in that function's user_metadata. This schedules an hourly
sweep (via pg_cron + pg_net) that calls the delete-expired-demo-accounts
edge function, which finds every expired demo account and deletes it
through the same auth.admin.deleteUser() cascade delete-account already
uses.

The job authenticates its call with a dedicated CRON_TRIGGER_SECRET (an
edge function secret, set separately via `supabase secrets set` — never
committed here), read out of Supabase Vault by name at execution time.
Nothing secret is ever embedded in this file: `vault.create_secret(...)`
itself must be run once, out-of-band, against the live project — never
inside a version-controlled migration, since that would commit the literal
secret value to git history.
*/

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- cron.schedule upserts by job name, so re-running this migration updates
-- the existing job in place rather than creating a duplicate.
select cron.schedule(
  'delete-expired-demo-accounts-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://bwustpnhuloljrihoxnh.supabase.co/functions/v1/delete-expired-demo-accounts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_trigger_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
