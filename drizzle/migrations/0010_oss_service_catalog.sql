CREATE OR REPLACE FUNCTION public.oss_service_catalog()
RETURNS TABLE(name text, min_price integer, max_price integer)
LANGUAGE sql IMMUTABLE SET search_path = public
AS $$
  SELECT v.name, v.min_price, v.max_price FROM (VALUES
    ('Accompagnamento per visite commissioni e uscite', 30, 35),
    ('Piccola spesa e commissioni per conto della persona', 25, 30),
    ('Preparazione pasti a domicilio', 25, 35),
    ('Supporto nella gestione leggera della casa', 25, 35),
    ('Assistenza al pasto e idratazione', 25, 35),
    ('Assistenza diurna alla persona e sollievo al caregiver', 25, 30),
    ('Assistenza notturna alla persona', 30, 40),
    ('Presenza e sorveglianza notturna', 25, 30),
    ('Compagnia socializzazione e attività ricreative', 20, 25),
    ('Igiene personale completa in doccia vasca o a letto', 35, 40),
    ('Igiene intima e cambio pannolone con vestizione e sistemazione', 25, 35),
    ('Routine del mattino con igiene alzata e colazione', 40, 50),
    ('Routine della sera con cena igiene e preparazione al riposo', 40, 50),
    ('Assistenza alla deambulazione', 25, 35),
    ('Aiuto nell’alzata e trasferimento letto poltrona carrozzina', 25, 35),
    ('Mobilizzazione e cambio postura a letto', 25, 35)
  ) AS v(name, min_price, max_price)
$$;

CREATE OR REPLACE FUNCTION public.enforce_nurse_service_catalog()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _type text;
  _min integer;
  _max integer;
BEGIN
  SELECT professional_type INTO _type FROM public.profiles WHERE id = NEW.professional_id;
  IF _type = 'infermiere' THEN
    SELECT c.min_price, c.max_price INTO _min, _max FROM public.nurse_service_catalog() c WHERE c.name = NEW.name;
    IF _min IS NULL THEN
      RAISE EXCEPTION 'Questa prestazione non è più disponibile per gli infermieri' USING ERRCODE = '23514';
    END IF;
  ELSIF _type = 'fisioterapista' THEN
    SELECT c.min_price, c.max_price INTO _min, _max FROM public.physio_service_catalog() c WHERE c.name = NEW.name;
    IF _min IS NULL THEN
      RAISE EXCEPTION 'Questa prestazione non è più disponibile per i fisioterapisti' USING ERRCODE = '23514';
    END IF;
  ELSIF _type = 'oss' THEN
    SELECT c.min_price, c.max_price INTO _min, _max FROM public.oss_service_catalog() c WHERE c.name = NEW.name;
    IF _min IS NULL THEN
      RAISE EXCEPTION 'Questa prestazione non è più disponibile per gli OSS' USING ERRCODE = '23514';
    END IF;
  ELSE
    RETURN NEW;
  END IF;
  IF NEW.price < _min OR NEW.price > _max THEN
    RAISE EXCEPTION 'Il prezzo deve essere compreso tra % € e % €', _min, _max USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_nurse_service_catalog() FROM PUBLIC, anon, authenticated;