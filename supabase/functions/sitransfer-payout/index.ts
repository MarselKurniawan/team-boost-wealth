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

// Map legacy / numeric codes to SiTransfer bank_target codes
const BANK_MAP: Record<string, string> = {
  BCA: "BCA", "014": "BCA",
  BRI: "BRI", "002": "BRI",
  MANDIRI: "MANDIRI", "008": "MANDIRI",
  BNI: "BNI", "009": "BNI",
  PERMATA: "PERMATA", "013": "PERMATA",
  CIMB: "CIMB", "022": "CIMB",
  DANAMON: "DANAMON", "011": "DANAMON",
  DANA: "DANA", "10002": "DANA",
  OVO: "OVO", "10001": "OVO",
};

// Admin-triggered payout via SiTransfer.
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

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Admin only" }, 403);

    const body = await req.json();
    const { transaction_id, account_number, account_name } = body;
    let { bank_code } = body;
    if (!transaction_id || !bank_code || !account_number || !account_name) {
      return json({ error: "Missing fields" }, 400);
    }

    const mapped = BANK_MAP[String(bank_code).trim().toUpperCase()];
    if (!mapped) return json({ error: `Bank/e-wallet '${bank_code}' tidak didukung SiTransfer` }, 400);
    bank_code = mapped;

    const { data: tx } = await admin.from("transactions").select("*").eq("id", transaction_id).maybeSingle();
    if (!tx || tx.type !== "withdraw") return json({ error: "Invalid transaction" }, 400);
    if (tx.status && tx.status !== "pending") {
      return json({ error: `Transaksi sudah berstatus '${tx.status}', tidak bisa diproses ulang` }, 409);
    }

    const origMeta = (tx.payment_metadata as Record<string, unknown>) || {};
    const netAmount = Number(tx.amount);
    const grossAmount = Number(origMeta.gross_amount ?? Math.round(netAmount / 0.9));
    const taxFee = Number(origMeta.tax_fee ?? (grossAmount - netAmount));

    const { data: profile } = await admin
      .from("profiles").select("name, phone").eq("user_id", tx.user_id).maybeSingle();
    const username = (profile?.phone || profile?.name || tx.user_id).toString()
      .replace(/[^A-Za-z0-9._-]/g, "").slice(0, 32) || "user";

    const refundUser = async (reason: string, providerResp: unknown) => {
      const { data: prof } = await admin
        .from("profiles").select("balance, total_withdraw").eq("user_id", tx.user_id).maybeSingle();
      if (prof) {
        await admin.from("profiles").update({
          balance: Number(prof.balance) + grossAmount,
          total_withdraw: Math.max(0, Number(prof.total_withdraw) - netAmount),
        }).eq("user_id", tx.user_id);
      }
      await admin.from("transactions").update({
        payment_method: bank_code,
        payment_metadata: { ...origMeta, provider_response: providerResp, refunded_amount: grossAmount },
        status: "refunded",
        description: (tx.description || "Withdraw") +
          ` — REFUND otomatis Rp ${grossAmount.toLocaleString("id-ID")} (gross incl. pajak Rp ${taxFee.toLocaleString("id-ID")}): ${reason}`,
      }).eq("id", tx.id);
    };

    let resp: { ok: boolean; json: Record<string, any> };
    try {
      resp = await sitransferPost("/payout", {
        player_username: username,
        account_name: String(account_name).replace(/[^\x20-\x7E]/g, "").slice(0, 50),
        account_number: String(account_number),
        bank_target: bank_code,
        amount: Math.trunc(netAmount),
      });
    } catch (networkErr) {
      await refundUser(`network error: ${(networkErr as Error).message}`, null);
      return json({ error: "Network error ke SiTransfer, saldo direfund full", detail: (networkErr as Error).message }, 502);
    }

    if (!resp.ok || resp.json?.success !== true) {
      await refundUser(sitransferErrorMessage(resp.json), resp.json);
      return json({ error: sitransferErrorMessage(resp.json), detail: resp.json }, 502);
    }

    const d = resp.json.data || {};
    const providerStatus = String(d.status || "").toLowerCase();

    await admin.from("transactions").update({
      payment_reference: d.transaction_id || tx.payment_reference,
      payment_method: bank_code,
      payment_metadata: { ...origMeta, provider_response: d },
      status: providerStatus === "success" ? "success" : "processing",
    }).eq("id", tx.id);

    return json({ success: true, data: d });
  } catch (e) {
    console.error("sitransfer payout error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
