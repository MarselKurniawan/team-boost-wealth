import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validasi user via JWT
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ success: false, message: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { code } = await req.json();
    if (!code || typeof code !== "string" || code.length > 64) {
      return new Response(JSON.stringify({ success: false, message: "Kode kupon tidak valid" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const upperCode = code.toUpperCase().trim();

    // Cari kupon
    const { data: coupon } = await admin
      .from("coupons")
      .select("*")
      .eq("code", upperCode)
      .maybeSingle();

    if (!coupon) {
      return new Response(JSON.stringify({ success: false, message: "Kode kupon tidak valid" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const c: any = coupon;
    const maxUses = c.max_uses ?? 1;
    const currentUses = c.current_uses ?? (c.is_used ? 1 : 0);

    if (currentUses >= maxUses) {
      return new Response(JSON.stringify({ success: false, message: "Kupon sudah habis dipakai" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cek user sudah klaim
    const { data: existing } = await admin
      .from("coupon_redemptions")
      .select("id")
      .eq("coupon_id", c.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ success: false, message: "Anda sudah pernah memakai kupon ini" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Hitung reward server-side (anti-tamper)
    const rMin = Number(c.reward_min ?? 100);
    const rMax = Number(c.reward_max ?? 1000);
    const lo = Math.max(0, Math.min(rMin, rMax));
    const hi = Math.max(lo, Math.max(rMin, rMax));
    const reward = Math.floor(Math.random() * (hi - lo + 1)) + lo;

    // Insert redemption
    const { error: redeemError } = await admin
      .from("coupon_redemptions")
      .insert({ coupon_id: c.id, user_id: user.id, reward_amount: reward });

    if (redeemError) {
      return new Response(JSON.stringify({ success: false, message: "Gagal menggunakan kupon" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newCount = currentUses + 1;
    await admin.from("coupons").update({
      current_uses: newCount,
      is_used: newCount >= maxUses,
      used_by: user.id,
      reward_amount: reward,
      used_at: new Date().toISOString(),
    }).eq("id", c.id);

    // Update saldo
    const { data: profile } = await admin
      .from("profiles").select("balance").eq("user_id", user.id).single();
    if (profile) {
      await admin.from("profiles")
        .update({ balance: Number(profile.balance) + reward })
        .eq("user_id", user.id);
    }

    await admin.from("transactions").insert({
      user_id: user.id,
      type: "income",
      amount: reward,
      status: "success",
      description: `Hadiah kupon: ${upperCode}`,
    });

    return new Response(JSON.stringify({ success: true, reward }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("redeem-coupon error:", e);
    return new Response(JSON.stringify({ success: false, message: "Terjadi kesalahan server" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
