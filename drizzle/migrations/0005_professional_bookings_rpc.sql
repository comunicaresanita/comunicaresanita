CREATE OR REPLACE FUNCTION public.get_professional_bookings()
RETURNS TABLE (id uuid, service_name text, price integer, day text, time_slot text, status text, created_at timestamptz,
  recipient_type text, recipient_first_name text, recipient_last_name text, recipient_address text,
  lives_in_condominio boolean, intercom_name text, floor_number text, access_notes text,
  emergency_contact_name text, emergency_contact_phone text, medical_notes text,
  patient_first_name text, patient_last_name text, patient_phone text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.id, b.service_name, b.price, b.day, b.time_slot, b.status, b.created_at,
    b.recipient_type, b.recipient_first_name, b.recipient_last_name, b.recipient_address,
    b.lives_in_condominio, b.intercom_name, b.floor_number, b.access_notes,
    b.emergency_contact_name, b.emergency_contact_phone, b.medical_notes,
    p.first_name, p.last_name, p.phone
  FROM bookings b JOIN profiles p ON p.id = b.patient_id
  WHERE b.professional_id IN (SELECT pr.id FROM profiles pr WHERE pr.user_id = auth.uid() AND pr.role = 'professionista')
  ORDER BY b.created_at DESC
$$;
REVOKE ALL ON FUNCTION public.get_professional_bookings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_professional_bookings() TO authenticated;