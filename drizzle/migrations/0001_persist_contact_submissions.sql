CREATE TABLE public.contact_submissions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 created_at timestamptz NOT NULL DEFAULT now(),
 nome text NOT NULL,
 email text NOT NULL,
 messaggio text NOT NULL,
 request_fingerprint text NOT NULL
);
GRANT ALL ON public.contact_submissions TO service_role;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
CREATE INDEX contact_submissions_fingerprint_created_idx ON public.contact_submissions (request_fingerprint, created_at DESC);
COMMENT ON TABLE public.contact_submissions IS 'Contact messages saved by the public form; read only through server-validated team access.';