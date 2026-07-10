
-- Drop old triggers
DROP TRIGGER IF EXISTS on_investment_grant_spin ON public.investments;
DROP TRIGGER IF EXISTS on_transaction_grant_spin ON public.transactions;

-- Rewrite function: only requires deposit, only direct referral
CREATE OR REPLACE FUNCTION public.grant_spin_if_qualified(_downline_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_referred_by TEXT;
  v_upline_id UUID;
  v_has_deposit BOOLEAN;
  v_already_granted BOOLEAN;
BEGIN
  -- Get the referral code this downline used to sign up
  SELECT referred_by INTO v_referred_by FROM public.profiles WHERE user_id = _downline_user_id;
  IF v_referred_by IS NULL OR v_referred_by = '' THEN RETURN; END IF;

  -- Find the upline who owns that referral code
  SELECT user_id INTO v_upline_id FROM public.profiles WHERE referral_code = v_referred_by LIMIT 1;
  IF v_upline_id IS NULL THEN RETURN; END IF;

  -- Check downline has at least one successful deposit
  SELECT EXISTS (
    SELECT 1 FROM public.transactions
    WHERE user_id = _downline_user_id
      AND type IN ('deposit','recharge')
      AND status IN ('success','approved','completed')
  ) INTO v_has_deposit;

  IF NOT v_has_deposit THEN RETURN; END IF;

  -- Check ticket not already granted for this source user
  SELECT EXISTS (
    SELECT 1 FROM public.spin_tickets
    WHERE user_id = v_upline_id AND source = 'referral' AND source_user_id = _downline_user_id
  ) INTO v_already_granted;

  IF v_already_granted THEN RETURN; END IF;

  INSERT INTO public.spin_tickets (user_id, source, source_user_id)
  VALUES (v_upline_id, 'referral', _downline_user_id);
END;
$$;

-- Recreate deposit trigger
CREATE OR REPLACE FUNCTION public.trg_spin_on_deposit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.type IN ('deposit','recharge')
     AND NEW.status IN ('success','approved','completed')
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.grant_spin_if_qualified(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_transaction_grant_spin
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.trg_spin_on_deposit();

-- Drop investment trigger function (no longer needed)
DROP FUNCTION IF EXISTS public.trg_spin_on_investment() CASCADE;
