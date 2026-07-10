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
    const { userId, newPassword } = await req.json();

    if (!userId || !newPassword) {
      return new Response(
        JSON.stringify({ error: "userId dan newPassword diperlukan" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller is admin via auth token
    const authHeader = req.headers.get("Authorization");
    let isAdmin = false;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      // Skip if token is the anon key
      try {
        const { data: { user: caller } } = await supabase.auth.getUser(token);
        if (caller) {
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", caller.id)
            .eq("role", "admin")
            .maybeSingle();
          if (roleData) isAdmin = true;
        }
      } catch (e) {
        console.log("Auth check failed:", e);
      }
    }

    // Also check x-admin-key header for internal/tool calls
    const adminKey = req.headers.get("x-admin-key");
    if (adminKey && adminKey === supabaseServiceKey) {
      isAdmin = true;
    }

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Forbidden: admin only" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      return new Response(
        JSON.stringify({ error: "Gagal mengubah password" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Password reset successful for userId:", userId);

    return new Response(
      JSON.stringify({ success: true, message: "Password berhasil diubah" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Admin reset password error:", error);
    return new Response(
      JSON.stringify({ error: "Terjadi kesalahan server" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
