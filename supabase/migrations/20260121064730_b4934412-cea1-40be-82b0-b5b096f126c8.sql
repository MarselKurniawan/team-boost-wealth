-- Allow users to view profiles of users they referred (team members)
CREATE POLICY "Users can view their team members"
ON public.profiles
FOR SELECT
USING (
  referred_by IN (
    SELECT referral_code FROM public.profiles WHERE user_id = auth.uid()
  )
);