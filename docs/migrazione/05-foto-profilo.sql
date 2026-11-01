-- Dopo aver ricaricato le foto nel bucket "profile-photos" del NUOVO progetto:
-- sostituisci __REF__ con il codice del nuovo progetto. Gli indirizzi vecchi puntavano al progetto di Lovable.
update public.profiles
set photo_url = replace(photo_url, 'https://cqmrrapkaikixowowffe.supabase.co', 'https://__REF__.supabase.co')
where photo_url like 'https://cqmrrapkaikixowowffe.supabase.co/%';

-- Controllo: deve restituire 0
select count(*) as foto_ancora_vecchie from public.profiles where photo_url like '%cqmrrapkaikixowowffe%';
