-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Users can view their team members" ON public.profiles;

-- Create a database function to get user's referral code without triggering RLS
CREATE OR REPLACE FUNCTION public.get_my_referral_code()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT referral_code FROM public.profiles WHERE user_id = auth.uid()
$$;

-- Create new policy using the function to avoid recursion
CREATE POLICY "Users can view their team members"
ON public.profiles
FOR SELECT
USING (
  referred_by = public.get_my_referral_code()
);