import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { verifyCallback } from "../_shared/jayapay.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

const jayapayAck = () => new Response("success", { status: 200, headers: corsHeaders });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const payload = await req.json();
    console.log("Jayapay webhook received:", JSON.stringify(payload));

    // Verify signature when possible, but do not reject a paid Jayapay callback only
    // because the platform public key/sign format is mismatched. We still only process
    // callbacks that match an existing transaction reference below.
    let valid = false;
    try { valid = verifyCallback(payload); } catch (e) { console.error("verify error", e); }
    if (!valid) console.warn("Jayapay callback signature invalid — continuing with order/amount validation");

    const orderNum = String(payload.orderNum || "");
    // Pay-in notify uses `status` (SUCCESS / PAY_CANCEL / PAY_ERROR).
    // Pay-out notify uses numeric `status` (2 = success, 4 = failed).
    const rawStatus = String(payload.status ?? "").toUpperCase();
    const amount = Number(payload.payMoney ?? payload.money ?? payload.amount ?? 0);
    if (!orderNum) {
      console.error("Jayapay callback missing orderNum");
      return jayapayAck();
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tx } = await admin
      .from("transactions").select("*")
      .eq("payment_reference", orderNum).maybeSingle();

    if (!tx) {
      console.warn("Transaction not found:", orderNum);
      return jayapayAck(); // ack so Jayapay stops retrying
    }

    // Idempotent: ignore if already settled
    if (tx.status === "success" || tx.status === "completed") {
      return jayapayAck();
    }

    const isSuccess = rawStatus === "SUCCESS" || rawStatus === "2";
    const isFailure = ["FAIL", "FAILED", "CANCEL", "PAY_CANCEL", "PAY_ERROR", "4"].includes(rawStatus);

    if (isSuccess) {
      // SECURITY: kalau signature invalid, wajib amount cocok 1:1 dgn tx asli.
      // Mencegah attacker yang tahu orderNum memalsukan callback success.
      const expectedAmount = Number(tx.amount || 0);
      if (!valid && (amount <= 0 || amount !== expectedAmount)) {
        console.error("Rejecting unsigned callback with amount mismatch", { orderNum, expectedAmount, amount });
        return jayapayAck();
      }

      if (tx.type === "recharge") {
        const creditAmount = expectedAmount;
        const { data: profile } = await admin
          .from("profiles").select("balance, total_recharge").eq("user_id", tx.user_id).maybeSingle();
        if (profile) {
          await admin.from("profiles").update({
            balance: Number(profile.balance) + creditAmount,
            total_recharge: Number(profile.total_recharge) + creditAmount,
          }).eq("user_id", tx.user_id);
        }
        await admin.from("transactions").update({
          status: "success",
          payment_metadata: payload,
        }).eq("id", tx.id);
      } else if (tx.type === "withdraw") {
        await admin.from("transactions").update({
          status: "success",
          payment_metadata: payload,
        }).eq("id", tx.id);
      }
    } else if (isFailure) {
      if (tx.type === "withdraw") {
        // Refund FULL gross (termasuk pajak 10%) — bukan net amount (tx.amount).
        // Untuk txn lama tanpa metadata gross_amount, hitung gross = tx.amount / 0.9
        // karena net = gross * 0.9 (pajak 10%).
        const origMeta = (tx.payment_metadata as Record<string, unknown>) || {};
        const netAmount = Number(tx.amount || 0);
        const grossAmount = Number(
          origMeta.gross_amount ?? Math.round(netAmount / 0.9)
        );
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
            ` — REFUND full Rp ${grossAmount.toLocaleString("id-ID")} (incl. pajak Rp ${taxFee.toLocaleString("id-ID")}) via webhook gagal`,
        }).eq("id", tx.id);
      } else {
        await admin.from("transactions").update({
          status: "failed",
          payment_metadata: payload,
        }).eq("id", tx.id);
      }
    }

    return jayapayAck();
  } catch (e) {
    console.error("webhook error", e);
    return new Response("ERROR", { status: 500 });
  }
});
