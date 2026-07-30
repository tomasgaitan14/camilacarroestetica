// Edge Function: sync-calendar
// Se llama cuando se crea, actualiza o cancela un turno.
// Crea/actualiza/elimina el evento correspondiente en Google Calendar de la profesional.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'

interface SyncPayload {
  appointment_id: string
  action: 'created' | 'cancelled' | 'rescheduled'
}

Deno.serve(async (req: Request) => {
  try {
    const payload: SyncPayload = await req.json()
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Obtiene el turno con datos del servicio y la profesional
    const { data: appt } = await supabase
      .from('appointments')
      .select('*, professional:staff_profiles(*), service:services(*)')
      .eq('id', payload.appointment_id)
      .single()

    if (!appt) return new Response('Turno no encontrado', { status: 404 })

    // Obtiene el refresh token de la profesional
    const { data: tokenRow } = await supabase
      .from('staff_tokens')
      .select('google_refresh_token')
      .eq('professional_id', appt.professional_id)
      .single()

    if (!tokenRow) {
      // La profesional no tiene token guardado — se saltea sin error
      return new Response(JSON.stringify({ skipped: true }), { status: 200 })
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

    const eventTitle = `${appt.service.name} — ${appt.client_name}`
    const eventDescription = `Cliente: ${appt.client_name}\nTeléfono: ${appt.client_phone}\nReservado vía: ${appt.created_via}`

    if (payload.action === 'created') {
      // Crea el evento en Google Calendar
      const eventRes = await fetch(GOOGLE_CALENDAR_API, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: eventTitle,
          description: eventDescription,
          start: { dateTime: appt.starts_at },
          end: { dateTime: appt.ends_at },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 60 },
              { method: 'popup', minutes: 1440 },  // 24hs antes
            ],
          },
        }),
      })

      const event = await eventRes.json()

      // Guarda el google_event_id en el turno
      if (event.id) {
        await supabase
          .from('appointments')
          .update({ google_event_id: event.id })
          .eq('id', payload.appointment_id)
      }

    } else if ((payload.action === 'cancelled' || payload.action === 'rescheduled') && appt.google_event_id) {
      // Elimina el evento del calendario
      await fetch(`${GOOGLE_CALENDAR_API}/${appt.google_event_id}`, {
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
