import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { wijayaGet, wijayaErrorMessage } from "../_shared/wijayapay.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// User-triggered status polling for a pending deposit.
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
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const refId = String(body.transaction_id || body.ref_id || "").trim();
    if (!refId) return json({ error: "transaction_id wajib diisi" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: tx } = await admin
      .from("transactions").select("*")
      .eq("payment_reference", refId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!tx) return json({ error: "Transaksi tidak ditemukan" }, 404);

    if (tx.status === "success" || tx.status === "completed") {
      return json({ success: true, status: "success", already: true });
    }

    const resp = await wijayaGet("/get-status", { ref_id: refId });
    if (!resp.ok || (resp.json?.success === false)) {
      return json({ error: wijayaErrorMessage(resp.json), detail: resp.json }, 502);
    }

    const d = resp.json.data || {};
    const raw = String(resp.json.status_pembayaran || resp.json.status || "").toLowerCase();
    const status = raw === "paid" ? "success" : raw === "expired" ? "expired" : raw || "pending";
    const origMeta = (tx.payment_metadata as Record<string, unknown>) || {};

    if (status === "success" && tx.type === "recharge") {
      const creditAmount = Number(tx.amount || 0);
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
        payment_metadata: { ...origMeta, provider_status: d },
      }).eq("id", tx.id);
    } else if (["failed", "expired", "cancel", "canceled", "cancelled"].includes(status)) {
      await admin.from("transactions").update({
        status: "failed",
        payment_metadata: { ...origMeta, provider_status: d },
      }).eq("id", tx.id);
    }

    return json({ success: true, status, data: d });
  } catch (e) {
    console.error("wijayapay check-status error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
