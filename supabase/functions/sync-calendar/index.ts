// Edge Function: sync-calendar
// Se llama desde un trigger de DB cuando se crea o cancela un turno.
// Crea/elimina el evento correspondiente en Google Calendar de la profesional.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3/calendars'

// Payload que envía el trigger de Supabase
interface TriggerPayload {
  type: 'INSERT' | 'UPDATE'
  record: {
    id: string
    professional_id: string
    service_id: string
    client_name: string
    client_phone: string
    starts_at: string
    ends_at: string
    status: string
    google_event_id: string | null
    created_via: string
  }
  old_record: Record<string, unknown> | null
}

Deno.serve(async (req: Request) => {
  try {
    const payload: TriggerPayload = await req.json()
    const { type, record } = payload

    // Solo procesar INSERT (turno creado) y UPDATE a cancelled/rescheduled (turno cancelado)
    const isCreate = type === 'INSERT'
    const isCancel = type === 'UPDATE' && (record.status === 'cancelled' || record.status === 'rescheduled')
    if (!isCreate && !isCancel) {
      return new Response(JSON.stringify({ skipped: true }), { status: 200 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Obtiene el refresh token y calendar_id de la profesional
    const { data: tokenRow } = await supabase
      .from('staff_tokens')
      .select('google_refresh_token, calendar_id')
      .eq('professional_id', record.professional_id)
      .single()

    if (!tokenRow) {
      return new Response(JSON.stringify({ skipped: 'no_token' }), { status: 200 })
    }

    // Obtiene un access token fresco usando el refresh token
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
        refresh_token: tokenRow.google_refresh_token,
        grant_type: 'refresh_token',
      }),
    })

    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token

    if (!accessToken) {
      console.error('No se pudo obtener access token de Google:', tokenData)
      return new Response(JSON.stringify({ error: 'token_failed' }), { status: 200 })
    }

    const calendarId = tokenRow.calendar_id ?? 'primary'
    const eventsUrl = `${GOOGLE_CALENDAR_BASE}/${encodeURIComponent(calendarId)}/events`

    if (isCreate) {
      // Trae nombre del servicio para el título del evento
      const { data: service } = await supabase
        .from('services')
        .select('name')
        .eq('id', record.service_id)
        .single()

      const eventTitle = `${service?.name ?? 'Turno'} — ${record.client_name}`
      const eventDescription = `Cliente: ${record.client_name}\nTeléfono: ${record.client_phone}\nReservado vía: ${record.created_via}`

      const eventRes = await fetch(eventsUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: eventTitle,
          description: eventDescription,
          start: { dateTime: record.starts_at, timeZone: 'America/Argentina/Buenos_Aires' },
          end: { dateTime: record.ends_at, timeZone: 'America/Argentina/Buenos_Aires' },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 60 },
              { method: 'popup', minutes: 1440 }, // 24hs antes
            ],
          },
        }),
      })

      const event = await eventRes.json()

      if (event.id) {
        await supabase
          .from('appointments')
          .update({ google_event_id: event.id })
          .eq('id', record.id)
      } else {
        console.error('Error creando evento en GCal:', event)
      }

    } else if (isCancel && record.google_event_id) {
      await fetch(`${eventsUrl}/${record.google_event_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err) {
    console.error('sync-calendar error:', err)
    return new Response(JSON.stringify({ error: 'internal' }), { status: 500 })
  }
})
