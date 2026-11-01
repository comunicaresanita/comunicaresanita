-- Regole di lancio:
--  1) anticipo minimo di 24 ore per prenotare (controllo lato database, non aggirabile dal client)
--  2) registro degli accessi a /admin (serve anche al limite di tentativi)
--  3) i nuovi professionisti partono sempre "non verificati": il badge "Verificato" lo assegna solo l'admin

-- 1) Anticipo minimo di 24 ore. Stessa funzione della 0018, con il controllo in più.
CREATE OR REPLACE FUNCTION public.enforce_booking_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  base numeric;
  max_price numeric;
  dm text[];
  sm text[];
  months text[] := ARRAY['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
  mi int;
  slot_start timestamptz;
BEGIN
  -- Chiamate interne (service role, nessun utente): nessun controllo
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = NEW.patient_id AND p.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Non puoi creare prenotazioni per un altro utente';
  END IF;
  IF NEW.patient_id = NEW.professional_id THEN
    RAISE EXCEPTION 'Prenotazione non valida';
  END IF;

  SELECT s.price::numeric INTO base
  FROM public.services s
  WHERE s.professional_id = NEW.professional_id AND s.name = NEW.service_name
  LIMIT 1;
  IF base IS NULL THEN
    RAISE EXCEPTION 'Prestazione non disponibile per questo professionista';
  END IF;

  -- Anticipo minimo: 24 ore. Il giorno è del tipo "Venerdì 30 Ottobre 2026", la fascia "17-18" (ora di Roma).
  dm := regexp_match(lower(coalesce(NEW.day, '')), '(\d{1,2})\s+([a-zà-ù]+)\s+(\d{4})');
  sm := regexp_match(coalesce(NEW.time_slot, ''), '^\s*(\d{1,2})');
  IF dm IS NULL OR sm IS NULL THEN
    RAISE EXCEPTION 'Data o orario non validi';
  END IF;
  mi := array_position(months, dm[2]);
  IF mi IS NULL THEN
    RAISE EXCEPTION 'Data o orario non validi';
  END IF;
  slot_start := make_timestamptz(dm[3]::int, mi, dm[1]::int, sm[1]::int, 0, 0, 'Europe/Rome');
  IF slot_start < now() + interval '24 hours' THEN
    RAISE EXCEPTION 'Si può prenotare con almeno 24 ore di anticipo';
  END IF;

  -- Massimo possibile: +60% notturno/festivo e +10% lunga distanza
  max_price := ceil(base * 1.6 * 1.1) + 1;
  IF NEW.price IS NULL OR NEW.price::numeric < base OR NEW.price::numeric > max_price THEN
    NEW.price := base;
  END IF;

  NEW.status := 'pending';
  NEW.cancelled_by := NULL;
  NEW.cancelled_at := NULL;
  NEW.cancel_reason := NULL;
  NEW.responded_at := NULL;
  NEW.completed_at := NULL;
  NEW.reminder_sent_at := NULL;
  NEW.stripe_session_id := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_booking_insert_trg ON public.bookings;
CREATE TRIGGER enforce_booking_insert_trg
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_insert();

-- 2) Registro degli accessi e dei tentativi su /admin. Solo la funzione admin-data (service role) lo usa:
--    RLS attiva e nessuna policy, quindi nessun utente dell'app può leggerlo o scriverlo.
CREATE TABLE IF NOT EXISTS public.admin_access_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  ip text NOT NULL DEFAULT 'unknown',
  action text NOT NULL DEFAULT 'list',
  success boolean NOT NULL,
  detail text
);
ALTER TABLE public.admin_access_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_access_log FROM PUBLIC, anon, authenticated;
CREATE INDEX IF NOT EXISTS admin_access_log_recent_idx ON public.admin_access_log (success, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_access_log_ip_idx ON public.admin_access_log (ip, created_at DESC);

-- 3) I nuovi profili partono sempre non verificati, qualunque funzione li crei.
--    (il nome inizia con "zz" così il trigger scatta per ultimo). La verifica avviene solo da /admin.
CREATE OR REPLACE FUNCTION public.force_profile_unverified_on_insert()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.verified := false;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS zz_profiles_force_unverified ON public.profiles;
CREATE TRIGGER zz_profiles_force_unverified
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.force_profile_unverified_on_insert();
