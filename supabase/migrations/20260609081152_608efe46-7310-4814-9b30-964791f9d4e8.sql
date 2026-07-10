
CREATE OR REPLACE FUNCTION public.get_my_team()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  email text,
  name text,
  phone text,
  referral_code text,
  referred_by text,
  balance numeric,
  total_income numeric,
  total_recharge numeric,
  total_withdraw numeric,
  team_income numeric,
  rabat_income numeric,
  vip_level integer,
  created_at timestamptz,
  updated_at timestamptz,
  level text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  my_code text;
BEGIN
  SELECT referral_code INTO my_code FROM public.profiles WHERE user_id = auth.uid();
  IF my_code IS NULL OR my_code = '' THEN RETURN; END IF;

  RETURN QUERY
  WITH level_a AS (
    SELECT p.* FROM public.profiles p WHERE p.referred_by = my_code
  ),
  level_b AS (
    SELECT p.* FROM public.profiles p
    WHERE p.referred_by IN (SELECT a.referral_code FROM level_a a WHERE a.referral_code IS NOT NULL AND a.referral_code <> '')
  ),
  level_c AS (
    SELECT p.* FROM public.profiles p
    WHERE p.referred_by IN (SELECT b.referral_code FROM level_b b WHERE b.referral_code IS NOT NULL AND b.referral_code <> '')
  )
  SELECT a.id, a.user_id, a.email, a.name, a.phone, a.referral_code, a.referred_by,
         a.balance, a.total_income, a.total_recharge, a.total_withdraw,
         a.team_income, a.rabat_income, a.vip_level, a.created_at, a.updated_at, 'A'::text
    FROM level_a a
  UNION ALL
  SELECT b.id, b.user_id, b.email, b.name, b.phone, b.referral_code, b.referred_by,
         b.balance, b.total_income, b.total_recharge, b.total_withdraw,
         b.team_income, b.rabat_income, b.vip_level, b.created_at, b.updated_at, 'B'::text
    FROM level_b b
  UNION ALL
  SELECT c.id, c.user_id, c.email, c.name, c.phone, c.referral_code, c.referred_by,
         c.balance, c.total_income, c.total_recharge, c.total_withdraw,
         c.team_income, c.rabat_income, c.vip_level, c.created_at, c.updated_at, 'C'::text
    FROM level_c c;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_team() TO authenticated;
