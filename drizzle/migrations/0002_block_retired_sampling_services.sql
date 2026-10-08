CREATE OR REPLACE FUNCTION public.reject_sampling_service() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF NEW.name ILIKE '%preliev%' THEN
  RAISE EXCEPTION 'Le prestazioni di prelievo non sono disponibili sulla piattaforma' USING ERRCODE = '23514';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER reject_sampling_service BEFORE INSERT OR UPDATE OF name ON public.services FOR EACH ROW EXECUTE FUNCTION public.reject_sampling_service();