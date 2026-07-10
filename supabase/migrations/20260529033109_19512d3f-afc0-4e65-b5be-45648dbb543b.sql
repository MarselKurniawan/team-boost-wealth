-- Ganti logika spin: dari "saat daftar" menjadi "saat bawahan sudah deposit DAN beli produk"
DROP TRIGGER IF EXISTS on_profile_referral_grant_spin ON public.profiles;

CREATE OR REPLACE FUNCTION public.grant_spin_if_qualified(_downline_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referred_by TEXT;
  v_upline_id UUID;
  v_has_deposit BOOLEAN;
  v_has_invest BOOLEAN;
  v_already_granted BOOLEAN;
BEGIN
  SELECT referred_by INTO v_referred_by FROM public.profiles WHERE user_id = _downline_user_id;
  IF v_referred_by IS NULL OR v_referred_by = '' THEN RETURN; END IF;

  SELECT user_id INTO v_upline_id FROM public.profiles WHERE referral_code = v_referred_by LIMIT 1;
  IF v_upline_id IS NULL THEN RETURN; END IF;

  -- Cek bawahan sudah pernah deposit sukses
  SELECT EXISTS (
    SELECT 1 FROM public.transactions
    WHERE user_id = _downline_user_id
      AND type IN ('deposit','recharge')
      AND status IN ('success','approved','completed')
  ) INTO v_has_deposit;

  -- Cek bawahan sudah pernah beli produk
  SELECT EXISTS (
    SELECT 1 FROM public.investments WHERE user_id = _downline_user_id
  ) INTO v_has_invest;

  IF NOT (v_has_deposit AND v_has_invest) THEN RETURN; END IF;

  -- Cek tiket dari source_user ini belum pernah diberikan
  SELECT EXISTS (
    SELECT 1 FROM public.spin_tickets
    WHERE user_id = v_upline_id AND source = 'referral' AND source_user_id = _downline_user_id
  ) INTO v_already_granted;

  IF v_already_granted THEN RETURN; END IF;

  INSERT INTO public.spin_tickets (user_id, source, source_user_id)
  VALUES (v_upline_id, 'referral', _downline_user_id);
END;
$$;

-- Trigger di investments: saat bawahan beli produk
CREATE OR REPLACE FUNCTION public.trg_spin_on_investment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.grant_spin_if_qualified(NEW.user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_investment_grant_spin ON public.investments;
CREATE TRIGGER on_investment_grant_spin
AFTER INSERT ON public.investments
FOR EACH ROW EXECUTE FUNCTION public.trg_spin_on_investment();

-- Trigger di transactions: saat deposit jadi sukses
CREATE OR REPLACE FUNCTION public.trg_spin_on_deposit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

DROP TRIGGER IF EXISTS on_transaction_grant_spin ON public.transactions;
CREATE TRIGGER on_transaction_grant_spin
AFTER INSERT OR UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.trg_spin_on_deposit();