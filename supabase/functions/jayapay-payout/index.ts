import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { jayapayPost, jayapayTimestamp, JAYAPAY_MERCHANT_CODE } from "../_shared/jayapay.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Admin-triggered payout: sends approved withdraw to Jayapay disbursement.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { transaction_id, account_number, account_name } = body;
    let { bank_code } = body;
    if (!transaction_id || !bank_code || !account_number || !account_name) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Legacy mapping: rekening lama menyimpan nama brand, bukan kode numerik Jayapay
    const LEGACY_MAP: Record<string, string> = {
      OVO: "10001", DANA: "10002", GOPAY: "10003", "GO-PAY": "10003",
      SHOPEEPAY: "10008", LINKAJA: "10009", "LINK AJA": "10009",
      BCA: "014", MANDIRI: "008", BRI: "002", BNI: "009", BSI: "451",
      CIMB: "022", PERMATA: "013", DANAMON: "011", BTN: "200", MEGA: "426",
      OCBC: "028", PANIN: "019", MAYBANK: "016", BUKOPIN: "441",
      JAGO: "542", JENIUS: "213", SEABANK: "535", BTPN: "213",
      NEO: "490", "NEO COMMERCE": "490", BSS: "459",
    };
    const upper = String(bank_code).trim().toUpperCase();
    if (LEGACY_MAP[upper]) bank_code = LEGACY_MAP[upper];


    const { data: tx } = await admin.from("transactions").select("*").eq("id", transaction_id).maybeSingle();
    if (!tx || tx.type !== "withdraw") {
      return new Response(JSON.stringify({ error: "Invalid transaction" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotency guard — jangan proses ulang txn yg sudah pernah diproses
    if (tx.status && !["pending"].includes(tx.status)) {
      return new Response(
        JSON.stringify({ error: `Transaksi sudah berstatus '${tx.status}', tidak bisa diproses ulang` }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const origMeta = (tx.payment_metadata as Record<string, unknown>) || {};
    // grossAmount = jumlah yg DIPOTONG dari saldo user (sebelum pajak).
    // Untuk txn lama tanpa metadata, hitung gross = net / 0.9 (pajak 10%) supaya pajak ikut direfund.
    const netAmount = Number(tx.amount);
    const grossAmount = Number(origMeta.gross_amount ?? Math.round(netAmount / 0.9));
    const taxFee = Number(origMeta.tax_fee ?? (grossAmount - netAmount));

    const { data: profile } = await admin
      .from("profiles")
      .select("email, phone")
      .eq("user_id", tx.user_id)
      .maybeSingle();

    const orderNum = tx.payment_reference || `WD${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const projectRef = supabaseUrl.replace("https://", "").split(".")[0];
    const notifyUrl = `https://${projectRef}.supabase.co/functions/v1/jayapay-webhook`;

    // Helper refund — kembalikan FULL gross amount (termasuk pajak) + rollback total_withdraw
    const refundUser = async (reason: string, providerResp: unknown) => {
      const { data: prof } = await admin
        .from("profiles")
        .select("balance, total_withdraw")
        .eq("user_id", tx.user_id)
        .maybeSingle();
      if (prof) {
        await admin
          .from("profiles")
          .update({
            balance: Number(prof.balance) + grossAmount,
            total_withdraw: Math.max(0, Number(prof.total_withdraw) - Number(tx.amount)),
          })
          .eq("user_id", tx.user_id);
      }
      await admin
        .from("transactions")
        .update({
          payment_reference: orderNum,
          payment_method: bank_code,
          payment_metadata: { ...origMeta, provider_response: providerResp, refunded_amount: grossAmount },
          status: "refunded",
          description:
            (tx.description || "Withdraw") +
            ` — REFUND otomatis Rp ${grossAmount.toLocaleString("id-ID")} (gross incl. pajak Rp ${taxFee.toLocaleString("id-ID")}): ${reason}`,
        })
        .eq("id", tx.id);
    };

    // Official Jayapay Pay-Out payload — field & tipe harus persis sesuai docs
    let resp: { ok: boolean; json: any };
    try {
      resp = await jayapayPost("/id/disbursement/cash", {
        mchNo: JAYAPAY_MERCHANT_CODE,
        orderNum,
        amount: Math.trunc(Number(tx.amount)),
        bankCode: bank_code,
        bankCard: String(account_number),
        accountName: String(account_name)
          .replace(/[^\x20-\x7E]/g, "")
          .slice(0, 50),
        description: "Withdraw",
        feeType: 1,
        downNotifyUrl: notifyUrl,
        timestamp: String(Date.now()),
      });
    } catch (networkErr) {
      // Network/TLS/timeout error — saldo Jayapay belum kepotong, refund full
      await refundUser(`network error: ${(networkErr as Error).message}`, null);
      return new Response(
        JSON.stringify({ error: "Network error ke Jayapay, saldo direfund full", detail: (networkErr as Error).message }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const success =
      resp.ok && (resp.json?.platRespCode === "SUCCESS" || (resp.json?.success === true && resp.json?.code === "9999"));

    if (!success) {
      await refundUser(resp.json?.msg || resp.json?.platRespMessage || "unknown error", resp.json);
      return new Response(
        JSON.stringify({ error: resp.json?.platRespMessage || resp.json?.msg || "Payout failed", detail: resp.json }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await admin
      .from("transactions")
      .update({
        payment_reference: orderNum,
        payment_method: bank_code,
        payment_metadata: { ...origMeta, provider_response: resp.json },
        status: "processing",
      })
      .eq("id", tx.id);

    return new Response(JSON.stringify({ success: true, data: resp.json }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("payout error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
