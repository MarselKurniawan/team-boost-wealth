-- Add rabat_income column to profiles table to track rabat separately from commission
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS rabat_income NUMERIC DEFAULT 0;