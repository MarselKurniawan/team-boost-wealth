
-- Sinkronkan term_type di investments dgn product (biar data historis tidak salah hitung)
UPDATE public.investments i
SET term_type = p.term_type
FROM public.products p
WHERE i.product_id = p.id
  AND COALESCE(i.term_type,'') IS DISTINCT FROM COALESCE(p.term_type,'long');

-- Buat get_long_term_investors mengacu ke products.term_type (source of truth),
-- fallback ke investments.term_type kalau product sudah dihapus.
CREATE OR REPLACE FUNCTION public.get_long_term_investors(_user_ids uuid[])
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT i.user_id
  FROM public.investments i
  LEFT JOIN public.products p ON p.id = i.product_id
  WHERE i.user_id = ANY(_user_ids)
    AND COALESCE(p.term_type, i.term_type, 'long') = 'long';
$$;
