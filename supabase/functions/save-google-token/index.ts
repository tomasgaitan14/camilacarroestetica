import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3'

async function getAccessToken(refreshToken: string): Promise<string | null> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  return data.access_token ?? null
}

async function createTurnosCalendar(accessToken: string): Promise<string | null> {
  // Crea el calendario
  const createRes = await fetch(`${GOOGLE_CALENDAR_BASE}/calendars`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: 'Turnos Camila Carro',
      timeZone: 'America/Argentina/Buenos_Aires',
    }),
  })
  const calendar = await createRes.json()
  if (!calendar.id) {
    console.error('Error creando calendario:', calendar)
    return null
  }

  // Establece color violeta (grape) en la lista del usuario
  await fetch(`${GOOGLE_CALENDAR_BASE}/users/me/calendarList/${calendar.id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ colorId: 'grape' }),
  })

  return calendar.id
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

  // Guarda el refresh token
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

  // Crea el calendario "Turnos Camila Carro" si no existe aún
  const { data: tokenRow } = await adminClient
    .from('staff_tokens')
    .select('calendar_id')
    .eq('professional_id', user.id)
    .single()

  if (!tokenRow?.calendar_id) {
    const accessToken = await getAccessToken(refreshToken)
    if (accessToken) {
      const calendarId = await createTurnosCalendar(accessToken)
      if (calendarId) {
        await adminClient
          .from('staff_tokens')
          .update({ calendar_id: calendarId })
          .eq('professional_id', user.id)
      }
    }
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: CORS_HEADERS })
})
