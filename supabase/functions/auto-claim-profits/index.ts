import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CYCLE_MS = 24 * 60 * 60 * 1000;

// Rates harus sama dgn process-referral
const RABAT_RATES: Record<string, number> = { A: 0.05, B: 0.03, C: 0.02 };

interface Investment {
  id: string;
  user_id: string;
  product_name: string;
  daily_income: number;
  last_claimed_at: string | null;
  created_at: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  try {
    const { data: invs, error } = await admin
      .from("investments")
      .select("id,user_id,product_name,daily_income,last_claimed_at,created_at")
      .eq("status", "active")
      .gt("days_remaining", 0);

    if (error) throw error;

    const now = Date.now();
    const due = (invs as Investment[]).filter((inv) => {
      const ref = inv.last_claimed_at || inv.created_at;
      if (!ref) return false;
      return now >= new Date(ref).getTime() + CYCLE_MS;
    });

    let claimed = 0;
    let totalPaid = 0;
    const users = new Set<string>();

    for (const inv of due) {
      // Atomic claim: locks row, updates investment, inserts transaction, adds to balance.
      const { data: result, error: rpcErr } = await admin.rpc("claim_investment_atomic", {
        _investment_id: inv.id,
      });
      if (rpcErr) {
        console.error("claim_investment_atomic error", inv.id, rpcErr);
        continue;
      }
      const res: any = result;
      if (!res?.claimed) continue;

      const amount = Number(res.amount);
      claimed++;
      totalPaid += amount;
      users.add(inv.user_id);

      // Bayar rabat ke upline (Level A/B/C)
      await processRabatChain(admin, inv.user_id, amount);
    }

    return new Response(
      JSON.stringify({ success: true, claimed, totalPaid, users: users.size }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("auto-claim error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function processRabatChain(admin: any, userId: string, dailyProfit: number) {
  const levels: Array<"A" | "B" | "C"> = ["A", "B", "C"];
  let current = userId;

  const { data: investor } = await admin.from("profiles").select("name").eq("user_id", userId).single();
  const investorName = investor?.name || "User";

  for (let i = 0; i < 3; i++) {
    const { data: cur } = await admin
      .from("profiles")
      .select("referred_by")
      .eq("user_id", current)
      .single();
    if (!cur?.referred_by) break;

    const { data: upline } = await admin
      .from("profiles")
      .select("user_id,balance,rabat_income,total_income")
      .eq("referral_code", cur.referred_by)
      .single();
    if (!upline) break;

    const rate = RABAT_RATES[levels[i]];
    const reward = Math.floor(dailyProfit * rate);
    if (reward > 0) {
      await admin
        .from("profiles")
        .update({
          balance: Number(upline.balance) + reward,
          rabat_income: Number(upline.rabat_income || 0) + reward,
          total_income: Number(upline.total_income || 0) + reward,
        })
        .eq("user_id", upline.user_id);

      await admin.from("transactions").insert({
        user_id: upline.user_id,
        type: "rabat",
        amount: reward,
        status: "success",
        description: `Rabat Level ${levels[i]} (${(rate * 100).toFixed(0)}%) dari profit harian ${investorName}`,
      });
    }

    current = upline.user_id;
  }
}
