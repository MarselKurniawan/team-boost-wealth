
-- 1. Add profit_mode to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS profit_mode text NOT NULL DEFAULT 'daily';

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_profit_mode_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_profit_mode_check CHECK (profit_mode IN ('daily','locked'));

-- 2. Add profit_mode snapshot to investments
ALTER TABLE public.investments
  ADD COLUMN IF NOT EXISTS profit_mode text NOT NULL DEFAULT 'daily';

ALTER TABLE public.investments
  DROP CONSTRAINT IF EXISTS investments_profit_mode_check;
ALTER TABLE public.investments
  ADD CONSTRAINT investments_profit_mode_check CHECK (profit_mode IN ('daily','locked'));

-- 3. Rewrite claim_investment_atomic to handle locked mode
CREATE OR REPLACE FUNCTION public.claim_investment_atomic(_investment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_inv RECORD;
  v_ref timestamptz;
  v_next timestamptz;
  v_new_days integer;
  v_completed boolean;
  v_amount numeric;
  v_user_id uuid;
  v_payout numeric;
  v_is_locked boolean;
BEGIN
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
  v_is_locked := COALESCE(v_inv.profit_mode, 'daily') = 'locked';

  UPDATE public.investments
  SET total_earned = COALESCE(total_earned, 0) + v_amount,
      days_remaining = v_new_days,
      last_claimed_at = v_next,
      status = CASE WHEN v_completed THEN 'completed' ELSE 'active' END
  WHERE id = _investment_id;

  IF v_is_locked THEN
    -- Locked: no daily payout. Only credit balance when contract completes.
    IF v_completed THEN
      v_payout := COALESCE(v_inv.total_income, v_inv.daily_income * v_inv.validity);
      INSERT INTO public.transactions (user_id, type, amount, status, description)
      VALUES (v_user_id, 'income', v_payout, 'success',
              'Payout kontrak selesai ' || v_inv.product_name);
      UPDATE public.profiles
      SET balance = COALESCE(balance, 0) + v_payout,
          total_income = COALESCE(total_income, 0) + v_payout
      WHERE user_id = v_user_id;
      RETURN jsonb_build_object(
        'claimed', true,
        'amount', v_payout,
        'user_id', v_user_id,
        'completed', true,
        'locked_payout', true,
        'next_claim_at', v_next
      );
    END IF;
    -- Locked but not completed: cycle advanced, no cash credit
    RETURN jsonb_build_object(
      'claimed', true,
      'amount', 0,
      'user_id', v_user_id,
      'completed', false,
      'locked_accrual', true,
      'next_claim_at', v_next
    );
  END IF;

  -- Daily mode: credit balance immediately
  INSERT INTO public.transactions (user_id, type, amount, status, description)
  VALUES (v_user_id, 'income', v_amount, 'success', 'Profit otomatis ' || v_inv.product_name);

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
$function$;
