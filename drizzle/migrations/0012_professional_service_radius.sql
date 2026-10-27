ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS service_radius_km integer NOT NULL DEFAULT 10;
UPDATE public.profiles SET service_radius_km = 50 WHERE role = 'professionista' AND long_distance_ok = true;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_service_radius_km_range CHECK (service_radius_km BETWEEN 1 AND 300);
COMMENT ON COLUMN public.profiles.long_distance_ok IS 'DEPRECATED: replaced by service_radius_km';
CREATE OR REPLACE VIEW public.public_professionals AS
SELECT id, role, first_name, last_name, bio, photo_url, lat, lng, zona, professional_type, verified, created_at, long_distance_ok, service_area, service_radius_km
FROM public.profiles WHERE role = 'professionista'::text;
GRANT SELECT ON public.public_professionals TO anon, authenticated;
GRANT ALL ON public.public_professionals TO service_role;