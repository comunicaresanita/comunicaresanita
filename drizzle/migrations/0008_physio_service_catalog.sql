CREATE OR REPLACE FUNCTION public.physio_service_catalog()
RETURNS TABLE(name text, min_price integer, max_price integer)
LANGUAGE sql IMMUTABLE SET search_path = public
AS $$
  SELECT v.name, v.min_price, v.max_price FROM (VALUES
    ('Kinesio taping', 30, 40),
    ('Esercizio terapeutico personalizzato', 45, 65),
    ('Ginnastica dolce per anziani', 40, 55),
    ('Ginnastica posturale a domicilio', 45, 60),
    ('Riabilitazione neurologica', 55, 75),
    ('Riabilitazione post frattura', 50, 65),
    ('Riabilitazione post operatoria', 50, 70),
    ('Riabilitazione sportiva', 50, 70),
    ('Trattamento fisioterapico di cervicalgia o lombalgia', 45, 65),
    ('Riabilitazione del pavimento pelvico', 60, 80),
    ('Riabilitazione respiratoria', 50, 70),
    ('Linfodrenaggio manuale', 50, 70),
    ('Massoterapia decontratturante', 40, 60),
    ('Elettrostimolazione neuromuscolare', 35, 50),
    ('Laserterapia', 40, 55),
    ('Laserterapia Nd YAG', 50, 70),
    ('Onde d’urto radiali', 55, 80),
    ('Tecarterapia', 45, 65),
    ('Ultrasuonoterapia', 35, 50),
    ('Valutazione ecografica funzionale RUSI', 65, 90),
    ('Valutazione fisioterapica iniziale', 55, 75)
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