-- Da eseguire nell'SQL Editor del NUOVO Supabase, DOPO il ripristino.
-- Sostituisci __REF__ con il codice del progetto (la parte prima di .supabase.co) e __CRON_SECRET__ con il valore
-- di CRON_SECRET che hai impostato tra i segreti delle funzioni. Non incollare questo file con i valori reali in chat.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- I lavori importati dall'esportazione puntano ancora a Lovable: si tolgono tutti e si ricreano.
select cron.unschedule(jobid) from cron.job;

select cron.schedule(
  'send-completion-reminders-hourly', '0 * * * *',
  $$ select net.http_post(
       url := 'https://__REF__.supabase.co/functions/v1/send-completion-reminders',
       headers := jsonb_build_object('Authorization', 'Bearer __CRON_SECRET__', 'Content-Type', 'application/json'),
       body := '{}'::jsonb, timeout_milliseconds := 30000) $$
);

select cron.schedule(
  'expire-pending-bookings-hourly', '0 * * * *',
  $$ select net.http_post(
       url := 'https://__REF__.supabase.co/functions/v1/expire-pending-bookings',
       headers := jsonb_build_object('Authorization', 'Bearer __CRON_SECRET__', 'Content-Type', 'application/json'),
       body := '{}'::jsonb, timeout_milliseconds := 30000) $$
);

-- Controllo: devono comparire 2 righe, entrambe attive
select jobid, jobname, schedule, active from cron.job order by jobid;
