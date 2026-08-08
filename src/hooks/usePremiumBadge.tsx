import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const PREMIUM_THRESHOLD = 280000;

/** Total akumulasi pembelian produk. Badge "Premium" aktif jika total >= 280.000 */
export const usePremiumBadge = () => {
  const { user } = useAuth();
  const [totalInvested, setTotalInvested] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!user) { setTotalInvested(0); setLoading(false); return; }
      const { data } = await supabase
        .from("investments")
        .select("amount")
        .eq("user_id", user.id);
      if (!active) return;
      setTotalInvested((data || []).reduce((s, r: any) => s + Number(r.amount || 0), 0));
      setLoading(false);
    };
    load();
    return () => { active = false; };
  }, [user?.id]);

  return { totalInvested, isPremium: totalInvested >= PREMIUM_THRESHOLD, loading };
};
