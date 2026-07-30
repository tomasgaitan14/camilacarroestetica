import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401 })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return new Response('Unauthorized', { status: 401 })

  const body = await req.json()
  const refreshToken: string | undefined = body?.refresh_token
  if (!refreshToken) return new Response('refresh_token requerido', { status: 400 })

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { error } = await adminClient
    .from('staff_tokens')
    .upsert(
      { professional_id: user.id, google_refresh_token: refreshToken, updated_at: new Date().toISOString() },
      { onConflict: 'professional_id' }
    )

  if (error) {
    console.error('Error guardando token:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
})
