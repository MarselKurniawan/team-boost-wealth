ALTER TABLE public.investments DROP CONSTRAINT IF EXISTS investments_product_id_fkey;
ALTER TABLE public.investments ADD CONSTRAINT investments_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;