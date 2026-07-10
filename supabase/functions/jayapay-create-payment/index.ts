import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getMerchantPublicKeyInfo, jayapayPost, JAYAPAY_MERCHANT_CODE } from "../_shared/jayapay.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const amount = Number(body.amount);
    const method = String(body.method || "QRIS");

    if (!amount || amount < 10000 || amount > 100000000) {
      return new Response(JSON.stringify({ error: "Jumlah tidak valid (min Rp 10.000)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await admin
      .from("profiles").select("name, email, phone").eq("user_id", user.id).maybeSingle();

    const orderNum = `DP${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;
    const projectRef = supabaseUrl.replace("https://", "").split(".")[0];
    const notifyUrl = `https://${projectRef}.supabase.co/functions/v1/jayapay-webhook`;

    const { data: tx, error: txErr } = await admin.from("transactions").insert({
      user_id: user.id,
      type: "recharge",
      amount,
      status: "pending",
      description: `Deposit via Jayapay (${method})`,
      payment_reference: orderNum,
      payment_method: method,
    }).select().single();
    if (txErr) throw txErr;

    const customerEmail = profile?.email && !profile.email.includes("@wa.investpro.id")
      ? profile.email
      : `${(profile?.phone || "user").replace(/[^0-9]/g, "")}@wa.investpro.id`;

    const customerPhone = (profile?.phone || "").replace(/[^0-9]/g, "") || "08000000000";

    const payInPayload = {
      mchNo: JAYAPAY_MERCHANT_CODE,
      method,
      orderNum,
      amount: Math.trunc(amount),
      productDetail: "Deposit Saldo",
      downNotifyUrl: notifyUrl,
      timestamp: String(Math.floor(Date.now() / 1000)),
      customerName: (profile?.name || "User").replace(/[^\x20-\x7E]/g, "").slice(0, 64) || "User",
      customerPhone,
      expiryPeriod: 1440,
      customerEmail,
    };

    // Official Jayapay Pay-In create endpoint: /{countryCode}/pay/prePay
    let resp = await jayapayPost("/id/pay/prePay", payInPayload);
    const timestampMsg = String(resp.json?.msg || resp.json?.message || resp.json?.platRespMessage || "");
    if (/timestamp must be a valid 13-digit number/i.test(timestampMsg)) {
      console.warn("Jayapay requested 13-digit timestamp despite docs using 10-digit; retrying with millisecond timestamp");
      resp = await jayapayPost("/id/pay/prePay", {
        ...payInPayload,
        timestamp: String(Date.now()),
      });
    }

    const success = resp.ok && (resp.json?.platRespCode === "SUCCESS" || (resp.json?.success === true && resp.json?.code === "9999"));
    if (!success) {
      await admin.from("transactions").update({
        status: "failed",
        payment_metadata: resp.json,
      }).eq("id", tx.id);
      const msg = String(resp.json?.platRespMessage || resp.json?.msg || "Jayapay error");
      const isSignatureError = /signature|sign/i.test(msg);
      const isMissingMerchantPublicKey = /publicKey has not been configured/i.test(msg);
      return new Response(JSON.stringify({
        error: isMissingMerchantPublicKey
          ? "Jayapay belum punya public key untuk merchantCode ini. Buka dashboard Jayapay → Collection & Payment Config → API Config, lalu paste nilai debug.publicKeyBase64 saja (TANPA -----BEGIN/END-----, tanpa enter, tanpa spasi)."
          : isSignatureError
          ? "Signature Jayapay ditolak. Pastikan JAYAPAY_PRIVATE_KEY cocok dengan public key merchant yang di-upload di dashboard Jayapay (Collection & Payment Config → API Config)."
          : msg,
        detail: resp.json,
        sentPayload: payInPayload,
        endpoint: "/id/pay/prePay",
        signMode: resp.signMode,
        debug: getMerchantPublicKeyInfo(),
      }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = resp.json?.data || resp.json || {};
    const cashierUrl = data.url || data.cashierUrl || data.payData || null;
    const payData = data.payData || null;

    await admin.from("transactions").update({
      payment_url: cashierUrl,
      payment_metadata: data,
    }).eq("id", tx.id);

    return new Response(JSON.stringify({
      success: true,
      orderNum,
      cashierUrl,
      payData,
      platOrderNum: data.platOrderNum,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("create-payment error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
