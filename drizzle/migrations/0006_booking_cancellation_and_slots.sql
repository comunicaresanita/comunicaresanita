ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancelled_by text, ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

CREATE OR REPLACE FUNCTION public.enforce_booking_update_columns()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  is_patient boolean;
  is_professional boolean;
BEGIN
  IF current_setting('app.cancel_booking', true) = 'on' THEN
    RETURN NEW;
  END IF;
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = OLD.patient_id AND p.user_id = auth.uid()) INTO is_patient;
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = OLD.professional_id AND p.user_id = auth.uid()) INTO is_professional;

  IF is_professional AND NOT is_patient THEN
    IF NEW.patient_id IS DISTINCT FROM OLD.patient_id
       OR NEW.professional_id IS DISTINCT FROM OLD.professional_id
       OR NEW.service_name IS DISTINCT FROM OLD.service_name
       OR NEW.price IS DISTINCT FROM OLD.price
       OR NEW.day IS DISTINCT FROM OLD.day
       OR NEW.time_slot IS DISTINCT FROM OLD.time_slot
       OR NEW.stripe_session_id IS DISTINCT FROM OLD.stripe_session_id
       OR NEW.recipient_address IS DISTINCT FROM OLD.recipient_address
       OR NEW.recipient_type IS DISTINCT FROM OLD.recipient_type
       OR NEW.recipient_first_name IS DISTINCT FROM OLD.recipient_first_name
       OR NEW.recipient_last_name IS DISTINCT FROM OLD.recipient_last_name
       OR NEW.lives_in_condominio IS DISTINCT FROM OLD.lives_in_condominio
       OR NEW.floor_number IS DISTINCT FROM OLD.floor_number
       OR NEW.intercom_name IS DISTINCT FROM OLD.intercom_name
       OR NEW.access_notes IS DISTINCT FROM OLD.access_notes
       OR NEW.emergency_contact_name IS DISTINCT FROM OLD.emergency_contact_name
       OR NEW.emergency_contact_phone IS DISTINCT FROM OLD.emergency_contact_phone
       OR NEW.medical_notes IS DISTINCT FROM OLD.medical_notes
       OR NEW.cancelled_by IS DISTINCT FROM OLD.cancelled_by
       OR NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at
    THEN
      RAISE EXCEPTION 'Professionals can only update booking status';
    END IF;
  ELSIF is_patient THEN
    IF NEW.patient_id IS DISTINCT FROM OLD.patient_id
       OR NEW.professional_id IS DISTINCT FROM OLD.professional_id
       OR NEW.price IS DISTINCT FROM OLD.price
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.stripe_session_id IS DISTINCT FROM OLD.stripe_session_id
       OR NEW.cancelled_by IS DISTINCT FROM OLD.cancelled_by
       OR NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at
    THEN
      RAISE EXCEPTION 'Patients cannot modify ownership, price, status, or payment fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_patient_sensitive_booking_updates()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  is_patient boolean;
  is_professional boolean;
BEGIN
  IF current_setting('app.cancel_booking', true) = 'on' THEN
    RETURN NEW;
  END IF;
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND id = NEW.patient_id) INTO is_patient;
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND id = NEW.professional_id) INTO is_professional;
  IF is_patient AND NOT is_professional THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN RAISE EXCEPTION 'Patients cannot modify booking status'; END IF;
    IF NEW.price IS DISTINCT FROM OLD.price THEN RAISE EXCEPTION 'Patients cannot modify booking price'; END IF;
    IF NEW.stripe_session_id IS DISTINCT FROM OLD.stripe_session_id THEN RAISE EXCEPTION 'Patients cannot modify payment session'; END IF;
    IF NEW.professional_id IS DISTINCT FROM OLD.professional_id THEN RAISE EXCEPTION 'Patients cannot reassign booking professional'; END IF;
    IF NEW.patient_id IS DISTINCT FROM OLD.patient_id THEN RAISE EXCEPTION 'Patients cannot reassign booking patient'; END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Single, always-working cancellation path for both the user and the professional of a booking
CREATE OR REPLACE FUNCTION public.cancel_booking(_booking_id uuid)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  b public.bookings%ROWTYPE;
  by_role text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessione scaduta' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO b FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prenotazione non trovata' USING ERRCODE = 'P0002';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = b.professional_id AND user_id = auth.uid()) THEN
    by_role := 'professional';
  ELSIF EXISTS (SELECT 1 FROM public.profiles WHERE id = b.patient_id AND user_id = auth.uid()) THEN
    by_role := 'patient';
  ELSE
    RAISE EXCEPTION 'Non autorizzato' USING ERRCODE = '42501';
  END IF;
  IF b.status IN ('cancelled', 'cancellato') THEN
    RETURN by_role;
  END IF;
  PERFORM set_config('app.cancel_booking', 'on', true);
  UPDATE public.bookings SET status = 'cancelled', cancelled_by = by_role, cancelled_at = now() WHERE id = _booking_id;
  PERFORM set_config('app.cancel_booking', 'off', true);
  RETURN by_role;
END;
$function$;

REVOKE ALL ON FUNCTION public.cancel_booking(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_booking(uuid) TO authenticated;

-- Taken slots of a professional (no personal data), so cancelled ones are bookable again
CREATE OR REPLACE FUNCTION public.get_booked_slots(_professional_id uuid)
 RETURNS TABLE(day text, time_slot text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT b.day, b.time_slot FROM public.bookings b
  WHERE b.professional_id = _professional_id AND b.status NOT IN ('cancelled', 'cancellato');
$function$;

REVOKE ALL ON FUNCTION public.get_booked_slots(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_booked_slots(uuid) TO anon, authenticated;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_active_slot_unique
  ON public.bookings (professional_id, day, time_slot)
  WHERE status NOT IN ('cancelled', 'cancellato');