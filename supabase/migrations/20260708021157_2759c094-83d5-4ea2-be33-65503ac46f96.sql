
CREATE OR REPLACE FUNCTION public.claim_investment_atomic(_investment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv RECORD;
  v_ref timestamptz;
  v_next timestamptz;
  v_new_days integer;
  v_completed boolean;
  v_amount numeric;
  v_user_id uuid;
BEGIN
  -- Lock the investment row
  SELECT * INTO v_inv FROM public.investments
  WHERE id = _investment_id
  FOR UPDATE;

  IF NOT FOUND OR v_inv.status <> 'active' OR v_inv.days_remaining <= 0 THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'not_active');
  END IF;

  v_ref := COALESCE(v_inv.last_claimed_at, v_inv.created_at);
  IF v_ref IS NULL OR now() < v_ref + interval '24 hours' THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'not_due');
  END IF;

  v_next := v_ref + interval '24 hours';
  v_new_days := v_inv.days_remaining - 1;
  v_completed := v_new_days <= 0;
  v_amount := v_inv.daily_income;
  v_user_id := v_inv.user_id;

  UPDATE public.investments
  SET total_earned = COALESCE(total_earned, 0) + v_amount,
      days_remaining = v_new_days,
      last_claimed_at = v_next,
      status = CASE WHEN v_completed THEN 'completed' ELSE 'active' END
  WHERE id = _investment_id;

  INSERT INTO public.transactions (user_id, type, amount, status, description)
  VALUES (v_user_id, 'income', v_amount, 'success', 'Profit otomatis ' || v_inv.product_name);

  -- Atomic balance update (no read-modify-write from client)
  UPDATE public.profiles
  SET balance = COALESCE(balance, 0) + v_amount,
      total_income = COALESCE(total_income, 0) + v_amount
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'claimed', true,
    'amount', v_amount,
    'user_id', v_user_id,
    'completed', v_completed,
    'next_claim_at', v_next
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_investment_atomic(uuid) TO authenticated, service_role;
