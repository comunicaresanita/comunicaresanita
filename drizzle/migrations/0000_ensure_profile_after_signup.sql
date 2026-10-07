CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_setting('app.profile_bootstrap', true) = 'on' THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NOT NULL THEN
    IF TG_OP = 'INSERT' THEN
      NEW.role := 'paziente';
      NEW.verified := false;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.role IS DISTINCT FROM OLD.role THEN NEW.role := OLD.role; END IF;
      IF NEW.verified IS DISTINCT FROM OLD.verified THEN NEW.verified := OLD.verified; END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_profile_from_auth_user(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u record;
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id) THEN RETURN; END IF;
  SELECT id, email, raw_user_meta_data AS m INTO u FROM auth.users WHERE id = _user_id;
  IF NOT FOUND THEN RETURN; END IF;
  PERFORM set_config('app.profile_bootstrap', 'on', true);
  INSERT INTO public.profiles (user_id, role, first_name, last_name, email, address, bio, numero_opi, partita_iva, verified, lat, lng, professional_type, numero_fnofi, phone)
  VALUES (
    u.id,
    CASE WHEN u.m->>'role' = 'professionista' THEN 'professionista' ELSE 'paziente' END,
    COALESCE(u.m->>'first_name', ''),
    COALESCE(u.m->>'last_name', ''),
    u.email,
    COALESCE(u.m->>'address', ''),
    COALESCE(u.m->>'bio', ''),
    COALESCE(u.m->>'numero_opi', ''),
    COALESCE(u.m->>'partita_iva', ''),
    (u.m->>'role') = 'professionista',
    NULLIF(u.m->>'lat', '')::double precision,
    NULLIF(u.m->>'lng', '')::double precision,
    NULLIF(u.m->>'professional_type', ''),
    COALESCE(u.m->>'numero_fnofi', ''),
    COALESCE(u.m->>'phone', '')
  );
  PERFORM set_config('app.profile_bootstrap', 'off', true);
END;
$$;
REVOKE ALL ON FUNCTION public.create_profile_from_auth_user(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.ensure_my_profile()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  PERFORM public.create_profile_from_auth_user(auth.uid());
END;
$$;
REVOKE ALL ON FUNCTION public.ensure_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_my_profile() TO authenticated;

-- Backfill accounts created without a profile
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT u.id FROM auth.users u LEFT JOIN public.profiles p ON p.user_id = u.id WHERE p.id IS NULL LOOP
    PERFORM public.create_profile_from_auth_user(r.id);
  END LOOP;
END $$;