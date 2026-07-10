import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone } = await req.json();

    if (!phone) {
      return new Response(
        JSON.stringify({ error: "Nomor WhatsApp diperlukan" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize phone number: convert 08xx to 628xx for Fonnte
    let normalizedPhone = phone.replace(/[^0-9]/g, "");
    if (normalizedPhone.startsWith("0")) {
      normalizedPhone = "62" + normalizedPhone.substring(1);
    } else if (!normalizedPhone.startsWith("62")) {
      normalizedPhone = "62" + normalizedPhone;
    }
    console.log("Original phone:", phone, "Normalized:", normalizedPhone);

    const FONNTE_API_TOKEN = Deno.env.get("FONNTE_API_TOKEN");
    if (!FONNTE_API_TOKEN) {
      console.error("FONNTE_API_TOKEN not configured");
      return new Response(
        JSON.stringify({ error: "Konfigurasi server error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Rate limiting: check if OTP was sent in the last 60 seconds
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { data: recentOtp } = await supabase
      .from("otp_codes")
      .select("created_at")
      .eq("phone", phone)
      .gte("created_at", oneMinuteAgo)
      .limit(1);

    if (recentOtp && recentOtp.length > 0) {
      return new Response(
        JSON.stringify({ error: "Tunggu 60 detik sebelum mengirim OTP lagi" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting: max 5 OTPs per hour per phone
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: hourlyOtps } = await supabase
      .from("otp_codes")
      .select("id")
      .eq("phone", phone)
      .gte("created_at", oneHourAgo);

    if (hourlyOtps && hourlyOtps.length >= 5) {
      return new Response(
        JSON.stringify({ error: "Terlalu banyak permintaan OTP. Coba lagi dalam 1 jam." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean up expired OTPs for this phone
    await supabase.from("otp_codes").delete().eq("phone", phone).lt("expires_at", new Date().toISOString());

    // Store OTP
    const { error: insertError } = await supabase.from("otp_codes").insert({
      phone,
      code: otp,
      expires_at: expiresAt.toISOString(),
    });

    if (insertError) {
      console.error("Error storing OTP:", insertError);
      return new Response(
        JSON.stringify({ error: "Gagal menyimpan kode OTP" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send OTP via Fonnte
    const message = `Kode verifikasi InvestPro Anda: *${otp}*\n\nKode berlaku 5 menit. Jangan berikan kode ini kepada siapapun.`;

    const formData = new FormData();
    formData.append("target", normalizedPhone);
    formData.append("message", message);

    const fonntResponse = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: FONNTE_API_TOKEN,
      },
      body: formData,
    });

    const fonntResult = await fonntResponse.json();
    console.log("Fonnte response:", JSON.stringify(fonntResult));

    if (!fonntResponse.ok || fonntResult.status === false) {
      console.error("Fonnte API error:", fonntResult);
      return new Response(
        JSON.stringify({ error: "Gagal mengirim OTP ke WhatsApp" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Kode OTP telah dikirim ke WhatsApp Anda" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Send OTP error:", error);
    return new Response(
      JSON.stringify({ error: "Terjadi kesalahan server" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
