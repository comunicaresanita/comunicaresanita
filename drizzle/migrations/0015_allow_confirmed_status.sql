-- A2: lo stato "confirmed" non era ammesso dalla regola bookings_status_check,
-- quindi respond_booking(_accept := true) veniva respinto. Si aggiunge senza togliere gli stati esistenti.
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending', 'confirmed', 'paid', 'completed', 'cancelled', 'refunded'));
