
-- Add category and promo fields to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'reguler';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS promo_price numeric NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS promo_daily_income numeric NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS promo_validity integer NULL;
