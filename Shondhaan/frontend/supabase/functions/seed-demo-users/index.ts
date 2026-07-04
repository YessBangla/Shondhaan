// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEMO_PASSWORD = "Demo@1234";

const DEMO_USERS: Array<{
  email: string;
  role: string;
  display_name: string;
  phone: string;
  extra?: Record<string, any>;
}> = [
  { email: "superadmin@demo.yessbangla.xyz", role: "super_admin", display_name: "ডেমো সুপার অ্যাডমিন", phone: "01700000001" },
  { email: "admin@demo.yessbangla.xyz", role: "admin", display_name: "ডেমো অ্যাডমিন", phone: "01700000002" },
  { email: "moderator@demo.yessbangla.xyz", role: "moderator", display_name: "ডেমো মডারেটর", phone: "01700000003" },
  { email: "supervisor@demo.yessbangla.xyz", role: "supervisor", display_name: "ডেমো সুপারভাইজার", phone: "01700000004" },
  { email: "finance@demo.yessbangla.xyz", role: "finance", display_name: "ডেমো ফিন্যান্স", phone: "01700000005" },
  { email: "callcenter@demo.yessbangla.xyz", role: "call_center", display_name: "ডেমো কল সেন্টার", phone: "01700000006" },
  { email: "provider@demo.yessbangla.xyz", role: "provider", display_name: "ডেমো প্রোভাইডার", phone: "01700000007", extra: { service_category: "AC Service" } },
  { email: "representative@demo.yessbangla.xyz", role: "representative", display_name: "ডেমো রিপ্রেজেন্টেটিভ", phone: "01700000008", extra: { division: "Dhaka", district: "Dhaka", thana: "Mirpur", commission_percent: 10 } },
  { email: "martvendor@demo.yessbangla.xyz", role: "mart_vendor", display_name: "ডেমো মার্ট ভেন্ডর", phone: "01700000009" },
  { email: "martdelivery@demo.yessbangla.xyz", role: "mart_delivery", display_name: "ডেমো মার্ট ডেলিভারি", phone: "01700000010" },
  { email: "martcs@demo.yessbangla.xyz", role: "mart_cs", display_name: "ডেমো মার্ট কাস্টমার সার্ভিস", phone: "01700000011" },
  { email: "dealseller@demo.yessbangla.xyz", role: "yessdeal_seller", display_name: "ডেমো ডিল সেলার", phone: "01700000012" },
  { email: "employer@demo.yessbangla.xyz", role: "employer", display_name: "ডেমো এমপ্লয়ার", phone: "01700000013" },
  { email: "user@demo.yessbangla.xyz", role: "user", display_name: "ডেমো ইউজার", phone: "01700000014" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const results: any[] = [];

    for (const u of DEMO_USERS) {
      // Check if user already exists by listing users (filter by email)
      const { data: existing } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      let userId = existing?.users.find((x: any) => x.email === u.email)?.id;

      if (!userId) {
        // Create user
        const { data: created, error: createErr } = await supabase.auth.admin.createUser({
          email: u.email,
          password: DEMO_PASSWORD,
          email_confirm: true,
          user_metadata: { full_name: u.display_name, demo: true },
        });
        if (createErr) {
          results.push({ email: u.email, status: "error", message: createErr.message });
          continue;
        }
        userId = created.user!.id;
      } else {
        // Reset password to known value
        await supabase.auth.admin.updateUserById(userId, { password: DEMO_PASSWORD, email_confirm: true });
      }

      // Upsert profile
      await supabase.from("profiles").upsert(
        {
          user_id: userId,
          display_name: u.display_name,
          phone: u.phone,
        },
        { onConflict: "user_id" },
      );

      // Insert role (ignore conflict on duplicate)
      const { error: roleErr } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: u.role });
      if (roleErr && !roleErr.message.includes("duplicate")) {
        // not fatal
      }

      // Representative-specific extra
      if (u.role === "representative" && u.extra) {
        await supabase.from("area_representatives").upsert(
          {
            user_id: userId,
            name: u.display_name,
            phone: u.phone,
            division: u.extra.division,
            district: u.extra.district,
            thana: u.extra.thana,
            commission_percent: u.extra.commission_percent,
            is_active: true,
          },
          { onConflict: "user_id" },
        );
      }

      // Employer-specific extra
      if (u.role === "employer") {
        await supabase.from("employer_profiles").upsert(
          {
            user_id: userId,
            company_name: "Demo Company Ltd.",
            company_name_bn: "ডেমো কোম্পানি লিমিটেড",
            contact_person: u.display_name,
            contact_phone: u.phone,
            contact_email: u.email,
            division: "Dhaka",
            district: "Dhaka",
            thana: "Gulshan",
            address: "House 1, Road 1, Gulshan, Dhaka",
            industry_type: "Services",
            employee_count: "1-25",
            is_active: true,
            is_verified: true,
          },
          { onConflict: "user_id" },
        );
      }

      results.push({ email: u.email, role: u.role, status: "ok", user_id: userId });
    }

    return new Response(
      JSON.stringify({
        success: true,
        password: DEMO_PASSWORD,
        count: results.length,
        users: results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ success: false, error: e?.message ?? String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});