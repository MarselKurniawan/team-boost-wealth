REVOKE EXECUTE ON FUNCTION public.get_referral_team(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_team() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_referral_team(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_team() TO authenticated, service_role;