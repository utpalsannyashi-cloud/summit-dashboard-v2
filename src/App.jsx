CREATE TABLE IF NOT EXISTS public.sd_resources (
  id text PRIMARY KEY,
  team_id text NOT NULL,
  name text NOT NULL,
  quantity integer DEFAULT 1,
  current_vertical text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.sd_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for sd_resources" 
ON public.sd_resources FOR ALL 
USING (true) WITH CHECK (true);
