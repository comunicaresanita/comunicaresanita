-- "Prenotazione effettuata": il paziente o il professionista della prenotazione la segna come eseguita
-- (dallo storico/dashboard o dall'email del giorno). La recensione resta solo del paziente.
-- Stato finale: 'completed' (già ammesso da bookings_status_check).
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;

CREATE OR REPLACE FUNCTION public.complete_booking(_booking_id uuid)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  b public.bookings%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessione scaduta' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO b FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prenotazione non trovata' USING ERRCODE = 'P0002';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id IN (b.patient_id, b.professional_id) AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Non autorizzato' USING ERRCODE = '42501';
  END IF;
  IF b.status = 'completed' THEN
    RETURN 'completed';
  END IF;
  IF b.status NOT IN ('confirmed', 'paid') THEN
    RAISE EXCEPTION 'La prenotazione non è stata confermata dal professionista' USING ERRCODE = 'P0001';
  END IF;
  PERFORM set_config('app.cancel_booking', 'on', true);
  UPDATE public.bookings SET status = 'completed', completed_at = now() WHERE id = _booking_id;
  PERFORM set_config('app.cancel_booking', 'off', true);
  RETURN 'completed';
END;
$function$;

REVOKE ALL ON FUNCTION public.complete_booking(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_booking(uuid) TO authenticated;

-- Recensioni: una per prenotazione, solo del paziente e solo dopo "effettuata".
CREATE UNIQUE INDEX IF NOT EXISTS reviews_booking_unique ON public.reviews (booking_id);

DROP POLICY IF EXISTS "Patients review own completed bookings" ON public.reviews;
CREATE POLICY "Patients review own completed bookings" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = reviews.patient_id AND p.user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = reviews.booking_id AND b.patient_id = reviews.patient_id
        AND b.professional_id = reviews.professional_id AND b.status = 'completed'
    )
  );

-- Il paziente vede la propria recensione (serve per non proporla due volte).
DROP POLICY IF EXISTS "Patients read own reviews" ON public.reviews;
CREATE POLICY "Patients read own reviews" ON public.reviews
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = reviews.patient_id AND p.user_id = auth.uid()));
