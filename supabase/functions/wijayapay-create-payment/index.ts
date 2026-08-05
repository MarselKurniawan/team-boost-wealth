import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { wijayaPost, wijayaGet, wijayaErrorMessage } from "../_shared/wijayapay.ts";

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
    const channelCode = String(body.method || body.channel || "QRIS").toUpperCase();

    if (!amount || amount < 10000 || amount > 100000000) {
      return json({ error: "Jumlah tidak valid (min Rp 10.000)" }, 400);
    }

    // Validate channel against merchant's active channels
    const chResp = await wijayaGet("/get-payment");
    if (!chResp.ok || chResp.json?.success !== true) {
      return json({ error: wijayaErrorMessage(chResp.json), detail: chResp.json }, 502);
    }
    const channel = (chResp.json.data || []).find(
      (c: any) => String(c.code).toUpperCase() === channelCode && String(c.status).toLowerCase() === "active",
    );
    if (!channel) return json({ error: `Metode pembayaran ${channelCode} tidak aktif` }, 400);
    if (amount < Number(channel.min_trx) || amount > Number(channel.max_trx)) {
      return json({
        error: `Nominal untuk ${channel.name} harus antara Rp ${Number(channel.min_trx).toLocaleString("id-ID")} - Rp ${Number(channel.max_trx).toLocaleString("id-ID")}`,
      }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await admin
      .from("profiles").select("name, phone, email").eq("user_id", user.id).maybeSingle();

    const refId = `DEP-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const callbackUrl = `${supabaseUrl}/functions/v1/wijayapay-webhook`;

    const resp = await wijayaPost("/transaction/create", {
      payment_method: channelCode,
      code: channelCode,
      metode: channelCode,
      code_payment: channelCode,
      nominal: amount,
      amount,
      callback_url: callbackUrl,
      customer_name: (profile?.name || "Member").toString().slice(0, 50),
      customer_phone: (profile?.phone || "").toString().slice(0, 20),
      customer_email: (profile?.email || "").toString().slice(0, 80),
    }, refId);

    if (!resp.ok || resp.json?.success !== true) {
      console.error("[WijayaPay] create failed", resp.status, wijayaErrorMessage(resp.json));
      return json({ error: wijayaErrorMessage(resp.json), detail: resp.json }, 502);
    }

    const d = resp.json.data || {};
    const totalBayar = Number(d.total_bayar || amount);
    console.log("[WijayaPay] create data keys", JSON.stringify(Object.keys(d)));

    // WijayaPay uses different field names per channel (VA / retail code)
    const vaNumber =
      d.nomor_va || d.no_va || d.va_number || d.virtual_account || d.no_virtual_account ||
      d.payment_code || d.kode_bayar || d.code_bayar || d.nomor_pembayaran || d.pay_code || null;

    const { data: tx, error: txErr } = await admin.from("transactions").insert({
      user_id: user.id,
      type: "recharge",
      amount,
      status: "pending",
      description: `Deposit via WijayaPay (${d.payment_name || channelCode})`,
      payment_reference: refId,
      payment_method: channelCode,
      payment_url: d.qr_image || d.payment_url || null,
      payment_metadata: { ...d, ref_id: refId, credit_amount: amount },
    }).select().single();
    if (txErr) throw txErr;

    return json({
      success: true,
      transaction_id: refId,
      trx_reference: d.trx_reference || null,
      channel: d.payment_name || channelCode,
      channel_code: channelCode,
      amount,
      total_bayar: totalBayar,
      total_fee: Number(d.total_fee || 0),
      expired_at: d.expired || null,
      qris_image: d.qr_image || null,
      qris_data: d.qr_string || null,
      payment_url: d.payment_url || null,
      nomor_va: vaNumber,
      va_number: vaNumber,
      raw: d,
      instruction: d.tutorial_pembayaran || channel.tutorial_pembayaran || null,
      tx_id: tx.id,
    });
  } catch (e) {
    console.error("wijayapay create-payment error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
