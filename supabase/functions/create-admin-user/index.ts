import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { phone, password } = await req.json();
    const cleanPhone = String(phone).replace(/[^0-9]/g, "");
    const email = `${cleanPhone}@wa.investpro.id`;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Try create user
    let userId: string | null = null;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { phone: cleanPhone, name: cleanPhone },
    });

    if (createErr) {
      // Maybe user exists - find it
      const { data: list } = await admin.auth.admin.listUsers();
      const existing = list?.users?.find((u: any) => u.email === email);
      if (!existing) throw createErr;
      userId = existing.id;
      // Update password
      await admin.auth.admin.updateUserById(userId, { password });
    } else {
      userId = created.user!.id;
    }

    // Assign admin role
    await admin.from("user_roles").upsert({ user_id: userId, role: "admin" });

    return new Response(JSON.stringify({ success: true, user_id: userId, email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
