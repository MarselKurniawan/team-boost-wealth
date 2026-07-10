
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS term_type text NOT NULL DEFAULT 'long';
ALTER TABLE public.investments ADD COLUMN IF NOT EXISTS term_type text NOT NULL DEFAULT 'long';

-- Backfill existing rows explicitly to 'long' (as instructed: current listing = long-term)
UPDATE public.products SET term_type = 'long' WHERE term_type IS NULL OR term_type NOT IN ('long','short');
UPDATE public.investments SET term_type = 'long' WHERE term_type IS NULL OR term_type NOT IN ('long','short');

-- RPC to get user ids among a given set who have at least one long-term investment
CREATE OR REPLACE FUNCTION public.get_long_term_investors(_user_ids uuid[])
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT i.user_id
  FROM public.investments i
  WHERE i.user_id = ANY(_user_ids)
    AND COALESCE(i.term_type, 'long') = 'long';
$$;

GRANT EXECUTE ON FUNCTION public.get_long_term_investors(uuid[]) TO authenticated;
