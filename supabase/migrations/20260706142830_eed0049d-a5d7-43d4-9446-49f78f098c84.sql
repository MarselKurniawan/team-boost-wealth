ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock integer;

CREATE OR REPLACE FUNCTION public.decrement_product_stock(_product_id uuid, _qty integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated integer;
BEGIN
  UPDATE public.products
  SET stock = stock - _qty
  WHERE id = _product_id
    AND stock IS NOT NULL
    AND stock >= _qty;
  GET DIAGNOSTICS updated = ROW_COUNT;
  IF updated = 0 THEN
    -- If stock is NULL (unlimited), treat as success without changing.
    IF EXISTS (SELECT 1 FROM public.products WHERE id = _product_id AND stock IS NULL) THEN
      RETURN TRUE;
    END IF;
    RETURN FALSE;
  END IF;
  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.decrement_product_stock(uuid, integer) TO authenticated;