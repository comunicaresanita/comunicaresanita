CREATE OR REPLACE FUNCTION public.nurse_service_catalog()
RETURNS TABLE(name text, min_price integer, max_price integer)
LANGUAGE sql IMMUTABLE SET search_path = public
AS $$
  SELECT v.name, v.min_price, v.max_price FROM (VALUES
    ('Bendaggio compressivo', 35, 50),
    ('Bendaggio compressivo multistrato', 55, 80),
    ('Bendaggio elastocompressivo degli arti inferiori', 45, 70),
    ('Bendaggio semplice', 25, 40),
    ('Cateterismo vescicale intermittente per svuotamento della vescica', 30, 45),
    ('Posizionamento o sostituzione di catetere vescicale maschile o femminile', 50, 65),
    ('Clisma evacuativo mediante dispositivo tipo clisma-sac/enteroclisma', 40, 60),
    ('Clistere evacuativo con sonda rettale', 35, 55),
    ('Clistere evacuativo senza sonda rettale', 25, 40),
    ('Somministrazione di microclisma medicato prescritto', 25, 35),
    ('Gestione della colostomia', 35, 55),
    ('Gestione dell’ileostomia', 35, 55),
    ('Gestione della nefrostomia', 35, 55),
    ('Gestione della tracheostomia', 50, 70),
    ('Gestione dell’urostomia', 35, 55),
    ('Medicazione del catetere venoso centrale (CVC)', 40, 55),
    ('Medicazione del Midline', 35, 45),
    ('Medicazione del PICC', 40, 50),
    ('Medicazione del Port-a-Cath', 40, 55),
    ('Medicazione di ferita chirurgica complessa', 50, 75),
    ('Medicazione di ferita chirurgica semplice', 30, 45),
    ('Medicazione di ferita traumatica complessa', 55, 75),
    ('Medicazione di ferita traumatica profonda', 45, 65),
    ('Medicazione di ferita traumatica superficiale', 30, 45),
    ('Valutazione e protezione cutanea nella lesione da pressione, stadio 1', 25, 35),
    ('Medicazione della lesione da pressione, stadio 2', 30, 45),
    ('Medicazione della lesione da pressione, stadio 3', 45, 65),
    ('Medicazione della lesione da pressione, stadio 4', 60, 85),
    ('Medicazione del sito PEG e cura della cute peristomale lesionata', 30, 45),
    ('Controllo infermieristico combinato: glicemia capillare e rilevazione completa dei parametri vitali', 35, 45),
    ('Misurazione della glicemia capillare', 25, 30),
    ('Rilevazione completa dei parametri vitali', 30, 40),
    ('Educazione e addestramento del caregiver alla gestione della PEG', 40, 50),
    ('Educazione e addestramento del caregiver alla gestione del sondino nasogastrico', 40, 50),
    ('Gestione della nutrizione parenterale prescritta', 50, 75),
    ('Gestione della PEG con somministrazione della nutrizione enterale prescritta', 45, 60),
    ('Gestione del sondino nasogastrico con somministrazione della nutrizione enterale prescritta', 45, 60),
    ('Rimozione di graffette metalliche', 25, 40),
    ('Rimozione di punti di sutura cutanea con filo', 20, 35),
    ('Somministrazione di gocce auricolari', 25, 30),
    ('Somministrazione di gocce nasali', 25, 30),
    ('Aerosolterapia', 25, 35),
    ('Somministrazione di terapia inalatoria mediante inalatore prescritto', 25, 30),
    ('Somministrazione di eparina a basso peso molecolare', 25, 35),
    ('Somministrazione di insulina per via sottocutanea', 25, 35),
    ('Somministrazione di terapia intramuscolare', 25, 35),
    ('Somministrazione di terapia sottocutanea', 25, 35),
    ('Gestione della terapia infusionale tramite pompa', 45, 65),
    ('Infusione endovenosa con accesso venoso già presente', 40, 55),
    ('Infusione endovenosa con posizionamento dell''accesso incluso', 50, 70),
    ('Infusione sottocutanea (ipodermoclisi)', 30, 45),
    ('Somministrazione di terapia tramite catetere venoso centrale (CVC)', 45, 65),
    ('Somministrazione di terapia tramite PICC o Midline', 40, 60),
    ('Preparazione settimanale della terapia orale', 25, 40),
    ('Somministrazione di farmaci tramite PEG', 30, 45),
    ('Somministrazione di farmaci tramite sondino nasogastrico', 30, 45),
    ('Somministrazione di terapia sublinguale/orale prescritta', 25, 30),
    ('Somministrazione di farmaci per via rettale (supposte o preparati prescritti)', 25, 30),
    ('Applicazione di terapia topica prescritta (creme, pomate o gel medicati)', 25, 30),
    ('Applicazione o sostituzione di cerotto medicato transdermico', 25, 30),
    ('Instillazione di colliri o altri preparati oftalmici prescritti', 25, 30),
    ('Somministrazione di terapia vaginale prescritta (ovuli, compresse o creme vaginali)', 25, 35),
    ('Lavaggio vaginale terapeutico prescritto', 40, 50)
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
    IF NEW.price < _min OR NEW.price > _max THEN
      RAISE EXCEPTION 'Il prezzo deve essere compreso tra % € e % €', _min, _max USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_nurse_service_catalog() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_nurse_service_catalog ON public.services;
CREATE TRIGGER enforce_nurse_service_catalog
BEFORE INSERT OR UPDATE OF name, price, professional_id ON public.services
FOR EACH ROW EXECUTE FUNCTION public.enforce_nurse_service_catalog();