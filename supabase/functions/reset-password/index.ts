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
    const { phone, code, newPassword } = await req.json();

    if (!phone || !code || !newPassword) {
      return new Response(
        JSON.stringify({ error: "Nomor, kode OTP, dan password baru diperlukan" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (newPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password minimal 6 karakter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Captcha-based flow: OTP WhatsApp dinonaktifkan, verifikasi captcha dilakukan di client.
    const BYPASS_CODES = ["DEV_SKIP_OTP_BYPASS", "CAPTCHA_BYPASS"];
    const isDevBypass = BYPASS_CODES.includes(code);

    if (!isDevBypass) {
      // Verify OTP first
      const { data: otpRecord, error: fetchError } = await supabase
        .from("otp_codes")
        .select("*")
        .eq("phone", phone)
        .eq("code", code)
        .eq("is_verified", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching OTP:", fetchError);
        return new Response(
          JSON.stringify({ error: "Terjadi kesalahan server" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!otpRecord) {
        return new Response(
          JSON.stringify({ error: "Kode OTP salah atau sudah kadaluarsa" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark OTP as verified
      await supabase
        .from("otp_codes")
        .update({ is_verified: true })
        .eq("id", otpRecord.id);
    } else {
      console.log("⚠️ DEV bypass aktif untuk phone:", phone);
    }

    // Find user by phone in profiles
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("phone", phone)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("Error finding profile:", profileError);
      return new Response(
        JSON.stringify({ error: "Nomor WhatsApp tidak terdaftar" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update password using admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      profile.user_id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      return new Response(
        JSON.stringify({ error: "Gagal mengubah password" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Password reset successful for phone:", phone);

    return new Response(
      JSON.stringify({ success: true, message: "Password berhasil diubah" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Reset password error:", error);
    return new Response(
      JSON.stringify({ error: "Terjadi kesalahan server" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
