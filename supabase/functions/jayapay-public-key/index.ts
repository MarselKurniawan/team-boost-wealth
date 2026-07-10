import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createPrivateKey, createPublicKey } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function pemCandidates(input: string): string[] {
  const trimmed = input.trim().replace(/\\n/g, "\n");
  if (trimmed.includes("BEGIN")) return [trimmed];
  const body = trimmed.replace(/\s+/g, "").match(/.{1,64}/g)?.join("\n") || "";
  return [
    `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----`,
    `-----BEGIN RSA PRIVATE KEY-----\n${body}\n-----END RSA PRIVATE KEY-----`,
  ];
}

function getPublicKeyInfo() {
  const raw = Deno.env.get("JAYAPAY_PRIVATE_KEY") || "";
  if (!raw.trim()) throw new Error("JAYAPAY_PRIVATE_KEY belum tersedia di runtime");

  let lastError: Error | null = null;
  for (const pem of pemCandidates(raw)) {
    try {
      const privateKey = createPrivateKey({ key: pem, format: "pem" });
      const publicKey = createPublicKey(privateKey);
      const der = publicKey.export({ type: "spki", format: "der" }) as Buffer;
      const pemPublic = publicKey.export({ type: "spki", format: "pem" }) as string;
      const details = (publicKey as unknown as { asymmetricKeyDetails?: { modulusLength?: number } }).asymmetricKeyDetails;
      return {
        merchantNo: (Deno.env.get("JAYAPAY_MCH_NO") || "").trim(),
        env: (Deno.env.get("JAYAPAY_ENV") || "production").trim(),
        modulusBits: details?.modulusLength || (der.length > 200 ? 2048 : 1024),
        publicKeyBase64: der.toString("base64"),
        publicKeyPem: pemPublic,
      };
    } catch (e) {
      lastError = e as Error;
    }
  }
  throw new Error(`Private key tidak bisa dibaca: ${lastError?.message || "unknown error"}`);
}

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
    const { data: { user } } = await userClient.auth.getUser();
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

    return new Response(JSON.stringify(getPublicKeyInfo(), null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
