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
    const { phone, password } = await req.json();

    if (!phone || !password) {
      return new Response(
        JSON.stringify({ error: "Nomor WhatsApp dan password diperlukan" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

    // Clean phone number
    const cleanPhone = phone.replace(/[^0-9]/g, "");

    // Strategy 1: Try dummy email login
    const dummyEmail = `${cleanPhone}@wa.investpro.id`;
    console.log("Trying dummy email:", dummyEmail);
    const { data: dummyData, error: dummyError } = await supabaseAuth.auth.signInWithPassword({
      email: dummyEmail,
      password,
    });

    if (!dummyError && dummyData.session) {
      console.log("Login success with dummy email");
      return new Response(
        JSON.stringify({ 
          success: true, 
          session: dummyData.session,
          user: dummyData.user 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log("Dummy email failed:", dummyError?.message);

    // Strategy 2: Look up real email from profiles using service role (bypasses RLS)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("phone", phone)
      .maybeSingle();

    console.log("Profile lookup result:", profile, "error:", profileError);

    if (profileError || !profile?.email) {
      return new Response(
        JSON.stringify({ error: "Nomor WhatsApp atau password salah" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Strategy 3: Login with real email
    console.log("Trying real email:", profile.email);
    const { data: realData, error: realError } = await supabaseAuth.auth.signInWithPassword({
      email: profile.email,
      password,
    });

    if (realError) {
      console.log("Real email login failed:", realError.message);
      return new Response(
        JSON.stringify({ error: "Nomor WhatsApp atau password salah" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Login success with real email");
    return new Response(
      JSON.stringify({ 
        success: true, 
        session: realData.session,
        user: realData.user 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Login by phone error:", error);
    return new Response(
      JSON.stringify({ error: "Terjadi kesalahan server" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
