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

// Returns the active payment channels of the merchant account.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const resp = await wijayaGet("/get-payment");
    if (!resp.ok || resp.json?.success !== true) {
      return json({ error: wijayaErrorMessage(resp.json), detail: resp.json }, 502);
    }
    const channels = (resp.json.data || [])
      .filter((c: any) => String(c.status).toLowerCase() === "active")
      .map((c: any) => ({
        group: c.group,
        code: c.code,
        name: c.name,
        image: c.image,
        fee_amount: Number(c.fee_amount || 0),
        fee_percent: Number(c.fee_percent || 0),
        min_trx: Number(c.min_trx || 0),
        max_trx: Number(c.max_trx || 0),
        type_fee: c.type_fee,
        tutorial_pembayaran: c.tutorial_pembayaran || "",
      }));

    return json({ success: true, channels });
  } catch (e) {
    console.error("wijayapay channels error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
