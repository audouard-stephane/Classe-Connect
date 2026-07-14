CREATE TABLE public.ics_feeds (
  token UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  ics_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ics_feeds TO anon;
GRANT SELECT ON public.ics_feeds TO authenticated;
GRANT ALL ON public.ics_feeds TO service_role;

ALTER TABLE public.ics_feeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read by token" ON public.ics_feeds
  FOR SELECT USING (true);