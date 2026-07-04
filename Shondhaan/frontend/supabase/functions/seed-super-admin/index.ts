import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

  const email = 'farjanayessbd@gmail.com'
  const password = 'Farjana@2026!'

  try {
    // Find existing
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    let user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())

    if (user) {
      const { data: upd, error: ue } = await admin.auth.admin.updateUserById(user.id, {
        password,
        email_confirm: true,
      })
      if (ue) throw ue
      user = upd.user
    } else {
      const { data: created, error: ce } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: 'Farjana (Super Admin)' },
      })
      if (ce) throw ce
      user = created.user!
    }

    // Ensure profile
    await admin.from('profiles').upsert(
      { user_id: user!.id, display_name: 'Farjana (Super Admin)' },
      { onConflict: 'user_id' },
    )

    // Ensure super_admin role
    await admin.from('user_roles').upsert(
      { user_id: user!.id, role: 'super_admin' },
      { onConflict: 'user_id,role' },
    )

    return new Response(
      JSON.stringify({ ok: true, user_id: user!.id, email: user!.email }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
