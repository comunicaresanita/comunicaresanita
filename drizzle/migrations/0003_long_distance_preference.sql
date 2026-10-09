ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS long_distance_ok boolean NOT NULL DEFAULT false;
CREATE OR REPLACE VIEW public.public_professionals AS
 SELECT id, role, first_name, last_name, bio, photo_url, lat, lng, zona, professional_type, verified, created_at, long_distance_ok
   FROM public.profiles
  WHERE role = 'professionista'::text;