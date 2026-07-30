// Edge Function: send-daily-summary
// Corre todos los días a las 8am (Argentina). Para cada profesional con calendar_id,
// crea o actualiza un evento "📋 Turnos del día" en su Google Calendar con el resumen del día.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3/calendars'

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

function todayRange(): { from: string; to: string } {
  const now = new Date()
  // Ajusta a Argentina (UTC-3)
  const argOffset = -3 * 60
  const localNow = new Date(now.getTime() + (argOffset - now.getTimezoneOffset()) * 60000)
  const dateStr = localNow.toISOString().slice(0, 10)
  return {
    from: `${dateStr}T00:00:00-03:00`,
    to:   `${dateStr}T23:59:59-03:00`,
  }
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { from, to } = todayRange()
  const todayDate = from.slice(0, 10) // yyyy-MM-dd

  // Trae todos los profesionales con calendar_id y token
  const { data: tokens } = await supabase
    .from('staff_tokens')
    .select('professional_id, google_refresh_token, calendar_id')
    .not('calendar_id', 'is', null)

  if (!tokens || tokens.length === 0) {
    return new Response(JSON.stringify({ skipped: 'no tokens' }), { status: 200 })
  }

  const results = await Promise.all(tokens.map(async (row) => {
    // Trae los turnos del día para este profesional
    const { data: appts } = await supabase
      .from('appointments')
      .select('*, service:services(name), client_name, starts_at, ends_at')
      .eq('professional_id', row.professional_id)
      .eq('status', 'confirmed')
      .gte('starts_at', from)
      .lte('starts_at', to)
      .order('starts_at')

    const accessToken = await getAccessToken(row.google_refresh_token)
    if (!accessToken) return { id: row.professional_id, error: 'token_failed' }

    const calendarId = encodeURIComponent(row.calendar_id)
    const eventsUrl = `${GOOGLE_CALENDAR_BASE}/${calendarId}/events`

    if (!appts || appts.length === 0) {
      // Sin turnos: crea un evento informativo igual para que quede registro
      const summaryTitle = '📋 Sin turnos hoy'
      await upsertSummaryEvent(accessToken, eventsUrl, todayDate, summaryTitle, 'No hay turnos confirmados para hoy.')
      return { id: row.professional_id, turnos: 0 }
    }

    const lines = appts.map(a => {
      const time = new Date(a.starts_at).toLocaleTimeString('es-AR', {
        hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires'
      })
      return `• ${time} — ${a.service?.name} (${a.client_name})`
    })

    const summaryTitle = `📋 ${appts.length} turno${appts.length > 1 ? 's' : ''} hoy`
    const description = lines.join('\n')

    await upsertSummaryEvent(accessToken, eventsUrl, todayDate, summaryTitle, description)
    return { id: row.professional_id, turnos: appts.length }
  }))

  return new Response(JSON.stringify({ ok: true, results }), { status: 200 })
})

async function upsertSummaryEvent(
  accessToken: string,
  eventsUrl: string,
  dateStr: string, // yyyy-MM-dd
  title: string,
  description: string,
) {
  // Busca si ya existe un evento de resumen para hoy (por extendedProperties)
  const searchRes = await fetch(
    `${eventsUrl}?privateExtendedProperty=dailySummary%3D${dateStr}&singleEvents=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const existing = await searchRes.json()
  const existingEvent = existing.items?.[0]

  const eventBody = JSON.stringify({
    summary: title,
    description,
    start: { dateTime: `${dateStr}T08:00:00-03:00` },
    end:   { dateTime: `${dateStr}T08:15:00-03:00` },
    colorId: 'sage', // verde suave para distinguirlo de los turnos
    reminders: {
      useDefault: false,
      overrides: [{ method: 'popup', minutes: 0 }], // notificación al inicio del evento (8am)
    },
    extendedProperties: {
      private: { dailySummary: dateStr },
    },
  })

  if (existingEvent?.id) {
    // Actualiza el evento existente
    await fetch(`${eventsUrl}/${existingEvent.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: eventBody,
    })
  } else {
    // Crea el evento nuevo
    await fetch(eventsUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: eventBody,
    })
  }
}
