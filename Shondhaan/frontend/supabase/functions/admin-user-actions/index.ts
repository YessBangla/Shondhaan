import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization') || ''
    if (!authHeader) return jsonResponse({ error: 'unauthorized' }, 401)

    // Identify caller
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userErr } = await userClient.auth.getUser()
    if (userErr || !userData.user) return jsonResponse({ error: 'unauthorized' }, 401)
    const callerId = userData.user.id

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

    // Verify caller is admin or super_admin
    const { data: roles } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerId)
    const roleSet = new Set((roles || []).map((r: any) => r.role))
    const isSuper = roleSet.has('super_admin')
    const isAdmin = roleSet.has('admin') || isSuper
    if (!isAdmin) return jsonResponse({ error: 'forbidden' }, 403)

    const body = await req.json().catch(() => ({}))
    const action: string = body.action
    const targetUserId: string | undefined = body.user_id

    if (!action) return jsonResponse({ error: 'action required' }, 400)

    // ----- LIST ALL USERS (with auth metadata + profiles + roles) -----
    if (action === 'list_users') {
      const page = Math.max(1, Number(body.page || 1))
      const perPage = Math.min(200, Math.max(10, Number(body.per_page || 50)))
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
      if (error) return jsonResponse({ error: error.message }, 500)

      const ids = data.users.map((u) => u.id)
      const [{ data: profiles }, { data: allRoles }] = await Promise.all([
        admin.from('profiles').select('*').in('user_id', ids),
        admin.from('user_roles').select('id, user_id, role').in('user_id', ids),
      ])

      const merged = data.users.map((u) => {
        const p = profiles?.find((pp: any) => pp.user_id === u.id) || {}
        const ur = allRoles?.filter((r: any) => r.user_id === u.id) || []
        return {
          id: u.id,
          email: u.email,
          phone: u.phone,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          email_confirmed_at: u.email_confirmed_at,
          banned_until: (u as any).banned_until,
          profile: p,
          roles: ur,
        }
      })

      return jsonResponse({ users: merged, total: data.users.length, page })
    }

    // ----- CREATE USER -----
    if (action === 'create_user') {
      const { email, password, phone, display_name, roles: newRoles } = body
      if (!email || !password) return jsonResponse({ error: 'email & password required' }, 400)

      const { data: created, error } = await admin.auth.admin.createUser({
        email,
        password,
        phone: phone || undefined,
        email_confirm: true,
        user_metadata: { full_name: display_name || '' },
      })
      if (error) return jsonResponse({ error: error.message }, 400)

      const newId = created.user!.id
      await admin.from('profiles').upsert({
        user_id: newId,
        display_name: display_name || null,
        phone: phone || null,
        email,
      }, { onConflict: 'user_id' })

      if (Array.isArray(newRoles) && newRoles.length) {
        await admin.from('user_roles').insert(
          newRoles.map((r: string) => ({ user_id: newId, role: r }))
        )
      }

      return jsonResponse({ user_id: newId })
    }

    if (!targetUserId) return jsonResponse({ error: 'user_id required' }, 400)

    // ----- SET STATUS (active | suspended | banned) -----
    if (action === 'set_status') {
      const status: string = body.status
      const reason: string | null = body.reason || null
      if (!['active', 'suspended', 'banned'].includes(status)) {
        return jsonResponse({ error: 'invalid status' }, 400)
      }

      // Update profile
      await admin.from('profiles').update({
        status,
        status_reason: reason,
        status_changed_at: new Date().toISOString(),
        status_changed_by: callerId,
      }).eq('user_id', targetUserId)

      // Apply auth ban (banned_until: 100 yrs for ban, 1 yr for suspend, none for active)
      const banDuration =
        status === 'banned' ? '876000h' : status === 'suspended' ? '8760h' : 'none'
      await admin.auth.admin.updateUserById(targetUserId, { ban_duration: banDuration } as any)

      return jsonResponse({ ok: true })
    }

    // ----- RESET PASSWORD (send link) -----
    if (action === 'send_password_reset') {
      const { data: target } = await admin.auth.admin.getUserById(targetUserId)
      const email = target.user?.email
      if (!email) return jsonResponse({ error: 'no email on file' }, 400)
      const { error } = await admin.auth.admin.generateLink({ type: 'recovery', email })
      if (error) return jsonResponse({ error: error.message }, 400)
      return jsonResponse({ ok: true })
    }

    // ----- SET PASSWORD DIRECTLY -----
    if (action === 'set_password') {
      const password: string = body.password
      if (!password || password.length < 6)
        return jsonResponse({ error: 'password must be at least 6 chars' }, 400)
      const { error } = await admin.auth.admin.updateUserById(targetUserId, { password })
      if (error) return jsonResponse({ error: error.message }, 400)
      return jsonResponse({ ok: true })
    }

    // ----- UPDATE PROFILE -----
    if (action === 'update_profile') {
      const allowed = [
        'display_name', 'phone', 'address', 'avatar_url', 'email',
        'nid_number', 'nid_front_url', 'nid_back_url', 'notes',
      ]
      const updates: any = {}
      for (const k of allowed) if (k in body) updates[k] = body[k]
      updates.updated_at = new Date().toISOString()
      await admin.from('profiles').update(updates).eq('user_id', targetUserId)
      // Sync auth email/phone if changed
      const authPatch: any = {}
      if (body.email) authPatch.email = body.email
      if (body.phone) authPatch.phone = body.phone
      if (Object.keys(authPatch).length) {
        await admin.auth.admin.updateUserById(targetUserId, authPatch)
      }
      return jsonResponse({ ok: true })
    }

    // ----- VERIFY / UNVERIFY -----
    if (action === 'set_verified') {
      const verified = !!body.verified
      await admin.from('profiles').update({
        is_verified: verified,
        verified_at: verified ? new Date().toISOString() : null,
        verified_by: verified ? callerId : null,
      }).eq('user_id', targetUserId)
      return jsonResponse({ ok: true })
    }

    // ----- DELETE USER -----
    if (action === 'delete_user') {
      if (!isSuper) return jsonResponse({ error: 'super_admin only' }, 403)
      const { error } = await admin.auth.admin.deleteUser(targetUserId)
      if (error) return jsonResponse({ error: error.message }, 400)
      return jsonResponse({ ok: true })
    }

    return jsonResponse({ error: 'unknown action' }, 400)
  } catch (e) {
    return jsonResponse({ error: String((e as Error).message || e) }, 500)
  }
})