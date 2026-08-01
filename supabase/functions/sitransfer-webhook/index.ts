import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

const ack = () => new Response(JSON.stringify({ status: "ok" }), {
  status: 200,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const payload = await req.json();
    console.log("SiTransfer callback:", JSON.stringify(payload));

    const d = payload?.data || payload || {};
    const trxId = String(d.transaction_id || "");
    const status = String(d.status || "").toLowerCase();
    const amount = Number(d.amount || 0);

    if (!trxId) {
      console.error("Callback missing transaction_id");
      return ack();
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tx } = await admin
      .from("transactions").select("*")
      .eq("payment_reference", trxId).maybeSingle();

    if (!tx) {
      console.warn("Transaction not found:", trxId);
      return ack();
    }

    if (tx.status === "success" || tx.status === "completed") return ack();

    const isSuccess = status === "success";
    const isFailure = ["failed", "fail", "expired", "cancel", "canceled", "cancelled"].includes(status);
    const expectedAmount = Number(tx.amount || 0);
    const origMeta = (tx.payment_metadata as Record<string, unknown>) || {};

    if (isSuccess) {
      // Security: amount from callback must match the recorded transaction amount.
      if (tx.type === "recharge" && amount > 0 && amount !== expectedAmount) {
        console.error("Amount mismatch on callback", { trxId, expectedAmount, amount });
        return ack();
      }

      if (tx.type === "recharge") {
        const { data: profile } = await admin
          .from("profiles").select("balance, total_recharge").eq("user_id", tx.user_id).maybeSingle();
        if (profile) {
          await admin.from("profiles").update({
            balance: Number(profile.balance) + expectedAmount,
            total_recharge: Number(profile.total_recharge) + expectedAmount,
          }).eq("user_id", tx.user_id);
        }
      }

      await admin.from("transactions").update({
        status: "success",
        payment_metadata: { ...origMeta, provider_callback: payload },
      }).eq("id", tx.id);
    } else if (isFailure) {
      if (tx.type === "withdraw") {
        const netAmount = Number(tx.amount || 0);
        const grossAmount = Number(origMeta.gross_amount ?? Math.round(netAmount / 0.9));
        const taxFee = Number(origMeta.tax_fee ?? (grossAmount - netAmount));

        const { data: profile } = await admin
          .from("profiles").select("balance, total_withdraw").eq("user_id", tx.user_id).maybeSingle();
        if (profile) {
          await admin.from("profiles").update({
            balance: Number(profile.balance) + grossAmount,
            total_withdraw: Math.max(0, Number(profile.total_withdraw) - netAmount),
          }).eq("user_id", tx.user_id);
        }
        await admin.from("transactions").update({
          status: "failed",
          payment_metadata: { ...origMeta, provider_callback: payload, refunded_amount: grossAmount, refunded_tax: taxFee },
          description: (tx.description || "Withdraw") +
            ` — REFUND full Rp ${grossAmount.toLocaleString("id-ID")} (incl. pajak Rp ${taxFee.toLocaleString("id-ID")}) via callback gagal`,
        }).eq("id", tx.id);
      } else {
        await admin.from("transactions").update({
          status: "failed",
          payment_metadata: { ...origMeta, provider_callback: payload },
        }).eq("id", tx.id);
      }
    }

    return ack();
  } catch (e) {
    console.error("sitransfer webhook error", e);
    return new Response("ERROR", { status: 500 });
  }
});
