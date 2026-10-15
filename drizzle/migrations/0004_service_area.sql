ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS service_area jsonb;
CREATE OR REPLACE VIEW public.public_professionals AS
SELECT id, role, first_name, last_name, bio, photo_url, lat, lng, zona, professional_type, verified, created_at, long_distance_ok, service_area
FROM public.profiles WHERE role = 'professionista'::text;
GRANT SELECT ON public.public_professionals TO anon, authenticated;
GRANT ALL ON public.public_professionals TO service_role;