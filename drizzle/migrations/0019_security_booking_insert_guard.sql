-- Sicurezza: alla creazione di una prenotazione il paziente non può scegliere prezzo o stato.
-- Il prezzo viene riportato entro i limiti reali (tariffa del professionista + maggiorazioni),
-- lo stato parte sempre da "pending" e i campi di gestione restano vuoti.
CREATE OR REPLACE FUNCTION public.enforce_booking_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  base numeric;
  max_price numeric;
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