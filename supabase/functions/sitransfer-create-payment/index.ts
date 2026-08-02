import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sitransferPost, sitransferErrorMessage } from "../_shared/sitransfer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const amount = Math.trunc(Number(body.amount));
    const channel = String(body.method || body.channel || "QRIS").toUpperCase();

    if (!amount || amount < 10000 || amount > 100000000) {
      return json({ error: "Jumlah tidak valid (min Rp 10.000)" }, 400);
    }
    if (!["QRIS", "DANA"].includes(channel)) {
      return json({ error: "Metode pembayaran tidak didukung" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await admin
      .from("profiles").select("name, phone").eq("user_id", user.id).maybeSingle();

    const username = (profile?.phone || profile?.name || user.id).toString().replace(/[^A-Za-z0-9._-]/g, "").slice(0, 32) || "user";

    const resp = await sitransferPost("/generate", {
      channel,
      amount,
      player_username: username,
    });

    if (!resp.ok || resp.json?.success !== true) {
      const raw = sitransferErrorMessage(resp.json);
      const friendly = /invalid or inactive credentials/i.test(raw)
        ? "Store Key SiTransfer tidak valid atau belum aktif. Hubungi admin untuk memperbarui kredensial."
        : raw;
      console.error("[SiTransfer] generate failed", resp.status, raw);
      return json({ error: friendly, detail: resp.json }, 502);
    }

    const d = resp.json.data || {};
    const trxId = String(d.transaction_id || "");

    const { data: tx, error: txErr } = await admin.from("transactions").insert({
      user_id: user.id,
      type: "recharge",
      amount,
      status: "pending",
      description: `Deposit via SiTransfer (${channel})`,
      payment_reference: trxId,
      payment_method: channel,
      payment_url: d.payment_url || d.qris_image || null,
      payment_metadata: d,
    }).select().single();
    if (txErr) throw txErr;

    return json({
      success: true,
      transaction_id: trxId,
      channel,
      amount,
      expired_at: d.expired_at || null,
      qris_image: d.qris_image || null,
      qris_data: d.qris_data || null,
      payment_url: d.payment_url || null,
      instruction: d.instruction || null,
      tx_id: tx.id,
    });
  } catch (e) {
    console.error("sitransfer create-payment error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
