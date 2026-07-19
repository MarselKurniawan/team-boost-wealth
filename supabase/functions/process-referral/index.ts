import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Commission rates by level (on purchase)
// Level A (direct referral) = 10%, Level B (2nd gen) = 2%, Level C (3rd gen) = 1%
const COMMISSION_RATES: Record<string, number> = {
  A: 0.10, // 10%
  B: 0.02, // 2%
  C: 0.01, // 1%
};

// Rabat rates by level (on daily profit)
// Level A = 5%, Level B = 2%, Level C = 1%
const RABAT_RATES: Record<string, number> = {
  A: 0.05, // 5%
  B: 0.02, // 2%
  C: 0.01, // 1%
};

interface ReferrerData {
  user_id: string;
  name: string;
  balance: number;
  team_income: number;
  rabat_income: number;
  total_income: number;
  total_recharge: number;
}

interface ReferrerChain {
  level: 'A' | 'B' | 'C';
  referrer: ReferrerData;
}

// Helper function to get the referral chain (up to 3 levels)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getReferrerChain(supabaseAdmin: SupabaseClient<any, any, any>, userId: string): Promise<ReferrerChain[]> {
  const chain: ReferrerChain[] = [];
  let currentUserId = userId;
  const levels: Array<'A' | 'B' | 'C'> = ['A', 'B', 'C'];

  for (let i = 0; i < 3; i++) {
    // Get the current user's profile to find who referred them
    const { data: currentUser, error: userError } = await supabaseAdmin
      .from("profiles")
      .select("referred_by")
      .eq("user_id", currentUserId)
      .single();

    const userData = currentUser as { referred_by: string | null } | null;

    if (userError || !userData?.referred_by) {
      console.log(`No referrer found at level ${levels[i]} for user ${currentUserId}`);
      break;
    }

    // Find the referrer by their referral code
    const { data: referrer, error: referrerError } = await supabaseAdmin
      .from("profiles")
      .select("user_id, name, balance, team_income, rabat_income, total_income, total_recharge, referral_code")
      .eq("referral_code", userData.referred_by)
      .single();

    const referrerData = referrer as {
      user_id: string;
      name: string;
      balance: number;
      team_income: number;
      rabat_income: number;
      total_income: number;
      total_recharge: number;
      referral_code: string;
    } | null;

    if (referrerError || !referrerData) {
      console.log(`Referrer not found for code ${userData.referred_by} at level ${levels[i]}`);
      break;
    }

    chain.push({
      level: levels[i],
      referrer: {
        user_id: referrerData.user_id,
        name: referrerData.name,
        balance: referrerData.balance || 0,
        team_income: referrerData.team_income || 0,
        rabat_income: referrerData.rabat_income || 0,
        total_income: referrerData.total_income || 0,
        total_recharge: Number(referrerData.total_recharge || 0),
      },
    });

    console.log(`Found Level ${levels[i]} referrer: ${referrerData.name}`);

    // Move up the chain - use the referrer's user_id for the next iteration
    currentUserId = referrerData.user_id;
  }

  return chain;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client to bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, amount, type } = await req.json();

    if (!userId || !amount || !type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: userId, amount, type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${type} for user ${userId}, amount: ${amount}`);

    // Get the referral chain (up to 3 levels)
    const referrerChain = await getReferrerChain(supabaseAdmin, userId);

    if (referrerChain.length === 0) {
      console.log("No referrers found for user:", userId);
      return new Response(
        JSON.stringify({ success: true, message: "No referrers found", rewards: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${referrerChain.length} referrers in chain`);

    const rewards: Array<{ level: string; name: string; reward: number }> = [];

    // Get investor name for description
    const { data: investorData } = await supabaseAdmin
      .from("profiles")
      .select("name")
      .eq("user_id", userId)
      .single();

    const investor = investorData as { name: string } | null;
    const investorName = investor?.name || "User";

    // Process rewards for each level in the chain
    for (const { level, referrer } of referrerChain) {
      let reward = 0;
      let rewardType = "";
      let description = "";

      if (type === "commission") {
        // GATE: upline harus punya produk AKTIF dengan nominal >= pembelian bawahan.
        const { data: activeInvs } = await supabaseAdmin
          .from("investments")
          .select("amount")
          .eq("user_id", referrer.user_id)
          .eq("status", "active");
        const uplineMaxAmount = (activeInvs || []).reduce(
          (max: number, inv: { amount: number }) => Math.max(max, Number(inv.amount || 0)),
          0
        );
        if (uplineMaxAmount < amount) {
          console.log(`Level ${level} Commission SKIPPED for ${referrer.name}: upline max ${uplineMaxAmount} < ${amount}`);
          continue;
        }
        const commissionRate = COMMISSION_RATES[level];
        reward = Math.floor(amount * commissionRate);
        rewardType = "commission";
        description = `Komisi Level ${level} (${(commissionRate * 100).toFixed(0)}%) dari pembelian ${investorName}`;
        
        console.log(`Level ${level} Commission: ${commissionRate * 100}% = ${reward} for ${referrer.name}`);

        if (reward > 0) {
          // Update referrer balance and team_income
          const { error: updateError } = await supabaseAdmin
            .from("profiles")
            .update({
              balance: referrer.balance + reward,
              team_income: (referrer.team_income || 0) + reward,
              total_income: (referrer.total_income || 0) + reward,
            })
            .eq("user_id", referrer.user_id);

          if (updateError) {
            console.error(`Error updating referrer ${referrer.name}:`, updateError);
            continue;
          }
        }
      } else if (type === "rabat") {
        const rabatRate = RABAT_RATES[level];
        reward = Math.floor(amount * rabatRate);
        rewardType = "rabat";
        description = `Rabat Level ${level} (${(rabatRate * 100).toFixed(0)}%) dari profit harian ${investorName}`;

        console.log(`Level ${level} Rabat: ${rabatRate * 100}% = ${reward} for ${referrer.name}`);

        if (reward > 0) {
          // Update referrer balance and rabat_income
          const { error: updateError } = await supabaseAdmin
            .from("profiles")
            .update({
              balance: referrer.balance + reward,
              rabat_income: (referrer.rabat_income || 0) + reward,
              total_income: (referrer.total_income || 0) + reward,
            })
            .eq("user_id", referrer.user_id);

          if (updateError) {
            console.error(`Error updating referrer ${referrer.name}:`, updateError);
            continue;
          }
        }
      }

      if (reward > 0) {
        // Create transaction for referrer
        const { error: txError } = await supabaseAdmin
          .from("transactions")
          .insert({
            user_id: referrer.user_id,
            type: rewardType,
            amount: reward,
            status: "success",
            description: description,
          });

        if (txError) {
          console.error(`Error creating transaction for ${referrer.name}:`, txError);
        } else {
          rewards.push({ level, name: referrer.name, reward });
          console.log(`Successfully processed ${rewardType} Level ${level}: ${reward} for ${referrer.name}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        rewards,
        totalReward: rewards.reduce((sum, r) => sum + r.reward, 0)
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error processing referral:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
