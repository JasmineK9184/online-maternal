-- Schedule daily due-date reminder emails (alternative to Vercel Cron in vercel.json).
-- Nodemailer runs in Next.js (Node), not in Supabase Edge Functions.
-- The route accepts GET or POST with Authorization: Bearer <CRON_SECRET>.
--
-- Before running:
-- 1) Enable extensions (Supabase SQL Editor, once per project):
--      CREATE EXTENSION IF NOT EXISTS pg_cron;
--      CREATE EXTENSION IF NOT EXISTS pg_net;
-- 2) Replace placeholders below:
--      <YOUR_APP_ORIGIN>  e.g. https://your-app.vercel.app  (no trailing slash)
--      <CRON_SECRET>      same value as CRON_SECRET in your Next.js / Vercel env
--
-- Uses net.http_get so the Next.js route is invoked with GET (matches Vercel Cron).

SELECT cron.schedule(
  'maternalcare_due_reminders_daily',
  '0 8 * * *',
  $$
    SELECT net.http_get(
      '<YOUR_APP_ORIGIN>/api/cron/due-reminders',
      '{}'::jsonb,
      jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>'),
      60000
    );
  $$
);
