import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { signature } from "../_shared/wijayapay.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

const ack = () => new Response(JSON.stringify({ status: true }), {
  status: 200,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    let payload: Record<string, any> = {};
    if (req.method === "GET") {
      payload = Object.fromEntries(new URL(req.url).searchParams.entries());
    } else {
      payload = await req.json().catch(() => ({}));
    }
    console.log("WijayaPay callback:", JSON.stringify(payload));

    const d = payload?.data || payload || {};
    const refId = String(d.ref_id || payload.ref_id || "");
    const status = String(payload.status || payload.status_pembayaran || d.status || "").toLowerCase();

    if (!refId) {
      console.error("Callback missing ref_id");
      return ack();
    }

    // Verify X-Signature = md5(code_merchant + api_key + ref_id)
    const sig = (req.headers.get("X-Signature") || req.headers.get("x-signature") || "").trim().toLowerCase();
    if (sig && sig !== signature(refId)) {
      console.error("Invalid callback signature for", refId);
      return ack();
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tx } = await admin
      .from("transactions").select("*")
      .eq("payment_reference", refId).maybeSingle();

    if (!tx) {
      console.warn("Transaction not found:", refId);
      return ack();
    }
    if (tx.status === "success" || tx.status === "completed") return ack();

    const isSuccess = status === "paid" || status === "success";
    const isFailure = ["failed", "fail", "expired", "cancel", "canceled", "cancelled"].includes(status);
    const creditAmount = Number(tx.amount || 0);
    const origMeta = (tx.payment_metadata as Record<string, unknown>) || {};

    if (isSuccess) {
      if (tx.type === "recharge") {
        const { data: profile } = await admin
          .from("profiles").select("balance, total_recharge").eq("user_id", tx.user_id).maybeSingle();
        if (profile) {
          await admin.from("profiles").update({
            balance: Number(profile.balance) + creditAmount,
            total_recharge: Number(profile.total_recharge) + creditAmount,
          }).eq("user_id", tx.user_id);
        }
      }
      await admin.from("transactions").update({
        status: "success",
        payment_metadata: { ...origMeta, provider_callback: payload },
      }).eq("id", tx.id);
    } else if (isFailure) {
      await admin.from("transactions").update({
        status: "failed",
        payment_metadata: { ...origMeta, provider_callback: payload },
      }).eq("id", tx.id);
    }

    return ack();
  } catch (e) {
    console.error("wijayapay webhook error", e);
    return new Response("ERROR", { status: 500 });
  }
});
