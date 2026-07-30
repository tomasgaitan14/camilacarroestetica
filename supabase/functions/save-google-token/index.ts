import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401, headers: CORS_HEADERS })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return new Response('Unauthorized', { status: 401, headers: CORS_HEADERS })
  }

  const body = await req.json()
  const refreshToken: string | undefined = body?.refresh_token
  if (!refreshToken) {
    return new Response('refresh_token requerido', { status: 400, headers: CORS_HEADERS })
  }

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
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS_HEADERS })
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: CORS_HEADERS })
})
