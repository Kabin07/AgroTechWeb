-- OPTIONAL: refresh mandi prices for every crop twice a day, so price history
-- builds up even when nobody opens the app. Run in the Supabase SQL editor
-- AFTER deploying the market-prices function and setting the CRON_SECRET secret.
--
-- 1. Database → Extensions: enable "pg_cron" and "pg_net".
-- 2. Replace the three placeholders below, then run this file.

select cron.schedule(
  'refresh-mandi-prices',
  '15 6,13 * * *', -- 11:45 and 18:45 IST (cron runs in UTC)
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/market-prices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', '<ANON_OR_PUBLISHABLE_KEY>',
      'x-cron-secret', '<CRON_SECRET>'
    ),
    body := '{"refreshAll": true}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);

-- To stop it later:  select cron.unschedule('refresh-mandi-prices');
