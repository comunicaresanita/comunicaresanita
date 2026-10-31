ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS responded_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_reason text;

CREATE OR REPLACE FUNCTION public.respond_booking(_booking_id uuid, _accept boolean)
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
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = b.professional_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Non autorizzato' USING ERRCODE = '42501';
  END IF;
  IF b.status <> 'pending' THEN
    RAISE EXCEPTION 'La prenotazione non è più in attesa di risposta' USING ERRCODE = 'P0001';
  END IF;
  PERFORM set_config('app.cancel_booking', 'on', true);
  IF _accept THEN
    UPDATE public.bookings SET status = 'confirmed', responded_at = now() WHERE id = _booking_id;
  ELSE
    UPDATE public.bookings
      SET status = 'cancelled', cancelled_by = 'professional', cancelled_at = now(),
          cancel_reason = 'rejected', responded_at = now()
      WHERE id = _booking_id;
  END IF;
  PERFORM set_config('app.cancel_booking', 'off', true);
  RETURN CASE WHEN _accept THEN 'confirmed' ELSE 'rejected' END;
END;
$function$;

REVOKE ALL ON FUNCTION public.respond_booking(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_booking(uuid, boolean) TO authenticated;