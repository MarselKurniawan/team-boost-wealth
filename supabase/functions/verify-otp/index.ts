import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_ATTEMPTS = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone, code } = await req.json();

    if (!phone || !code || typeof phone !== "string" || typeof code !== "string") {
      return new Response(
        JSON.stringify({ error: "Nomor dan kode OTP diperlukan" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Basic format guard - prevent oversized payloads
    if (phone.length > 20 || code.length > 10) {
      return new Response(
        JSON.stringify({ error: "Format tidak valid" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Ambil OTP terbaru (belum verified, belum expired) untuk nomor ini
    const { data: latestOtp } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("phone", phone)
      .eq("is_verified", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latestOtp) {
      return new Response(
        JSON.stringify({ error: "Kode OTP salah atau sudah kadaluarsa" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const currentAttempts = Number((latestOtp as any).attempts || 0);

    if (currentAttempts >= MAX_ATTEMPTS) {
      // Hanguskan OTP supaya user wajib minta kode baru
      await supabase
        .from("otp_codes")
        .update({ is_verified: true })
        .eq("id", (latestOtp as any).id);
      return new Response(
        JSON.stringify({ error: "Terlalu banyak percobaan. Silakan minta kode baru." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Kode salah → increment attempts
    if ((latestOtp as any).code !== code) {
      const newAttempts = currentAttempts + 1;
      await supabase
        .from("otp_codes")
        .update({
          attempts: newAttempts,
          // Habiskan kode kalau sudah max
          is_verified: newAttempts >= MAX_ATTEMPTS ? true : false,
        })
        .eq("id", (latestOtp as any).id);

      const remaining = Math.max(0, MAX_ATTEMPTS - newAttempts);
      return new Response(
        JSON.stringify({
          error: remaining > 0
            ? `Kode OTP salah. Sisa percobaan: ${remaining}`
            : "Terlalu banyak percobaan. Silakan minta kode baru.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Kode benar → verifikasi
    await supabase
      .from("otp_codes")
      .update({ is_verified: true })
      .eq("id", (latestOtp as any).id);

    return new Response(
      JSON.stringify({ success: true, message: "Nomor WhatsApp berhasil diverifikasi" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Verify OTP error:", error);
    return new Response(
      JSON.stringify({ error: "Terjadi kesalahan server" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
