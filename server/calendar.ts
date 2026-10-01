import { APP_TIME_ZONE, dayInterval, toInstant, type TimeInterval } from './domain/time.js'
import { GoogleApiError, googleFetch } from './google.js'

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3/calendars'
// Más eventos que esto en un solo día no existen en el salón: no hace falta paginar
const MAX_EVENTS_PER_DAY = 250
// Turnos futuros de un mismo cliente en un calendario: con esto alcanza sin paginar
const MAX_EVENTS_PER_CLIENT = 50
const MIDNIGHT = '00:00'
// Calendario inexistente o no compartido con la cuenta de servicio
const CALENDAR_UNREACHABLE_STATUSES = [403, 404]

interface EventTime {
  dateTime?: string
  date?: string  // solo en los eventos de todo el día
}

interface CalendarEvent {
  id: string
  start: EventTime
  end: EventTime
  extendedProperties?: { private?: Record<string, string> }
}

function eventsUrl(calendarId: string, params?: URLSearchParams): string {
  const url = `${CALENDAR_API}/${encodeURIComponent(calendarId)}/events`
  return params ? `${url}?${params}` : url
}

function instantOf(time: EventTime): Date {
  if (time.dateTime) return new Date(time.dateTime)
  if (time.date) return toInstant(time.date, MIDNIGHT)
  throw new Error('Evento de Google Calendar sin fecha de inicio o fin')
}

// Cualquier evento ocupa su horario, incluso los de todo el día o los marcados como "disponible"
export async function listBusy(calendarId: string, date: string): Promise<TimeInterval[]> {
  const day = dayInterval(date)
  const params = new URLSearchParams({
    timeMin: day.start.toISOString(),
    timeMax: day.end.toISOString(),
    singleEvents: 'true',
    maxResults: String(MAX_EVENTS_PER_DAY),
  })
  const { items = [] } = await googleFetch<{ items?: CalendarEvent[] }>(eventsUrl(calendarId, params))
  return items.map(event => ({ start: instantOf(event.start), end: instantOf(event.end) }))
}

export interface NewEvent {
  summary: string
  description: string
  start: Date
  end: Date
  // Datos que no se muestran en el calendario pero sirven para buscar el evento después
  privateProperties: Record<string, string>
}

// Devuelve el id del evento creado
export async function createEvent(calendarId: string, event: NewEvent): Promise<string> {
  const created = await googleFetch<{ id: string }>(eventsUrl(calendarId), {
    method: 'POST',
    body: {
      summary: event.summary,
      description: event.description,
      start: { dateTime: event.start.toISOString(), timeZone: APP_TIME_ZONE },
      end: { dateTime: event.end.toISOString(), timeZone: APP_TIME_ZONE },
      extendedProperties: { private: event.privateProperties },
    },
  })
  return created.id
}

export interface StoredEvent {
  id: string
  start: Date
  end: Date
  privateProperties: Record<string, string>
}

async function listStoredEvents(calendarId: string, params: URLSearchParams): Promise<StoredEvent[]> {
  params.set('singleEvents', 'true')
  params.set('orderBy', 'startTime')
  const { items = [] } = await googleFetch<{ items?: CalendarEvent[] }>(eventsUrl(calendarId, params))
  return items.map(event => ({
    id: event.id,
    start: instantOf(event.start),
    end: instantOf(event.end),
    privateProperties: event.extendedProperties?.private ?? {},
  }))
}

// Eventos que terminan después de `from` y tienen esa propiedad privada, ordenados por inicio
export async function findEventsByProperty(calendarId: string, name: string, value: string, from: Date): Promise<StoredEvent[]> {
  return listStoredEvents(calendarId, new URLSearchParams({
    privateExtendedProperty: `${name}=${value}`,
    timeMin: from.toISOString(),
    maxResults: String(MAX_EVENTS_PER_CLIENT),
  }))
}

// Eventos que se superponen con [from, to), ordenados por inicio
export async function listEventsBetween(calendarId: string, from: Date, to: Date): Promise<StoredEvent[]> {
  return listStoredEvents(calendarId, new URLSearchParams({
    timeMin: from.toISOString(),
    timeMax: to.toISOString(),
    maxResults: String(MAX_EVENTS_PER_DAY),
  }))
}

// Recibe todas las propiedades privadas (las que ya tenía y las nuevas): así da igual si Google combina o reemplaza el mapa
export async function setPrivateProperties(calendarId: string, eventId: string, properties: Record<string, string>): Promise<void> {
  await googleFetch(`${eventsUrl(calendarId)}/${encodeURIComponent(eventId)}`, {
    method: 'PATCH',
    body: { extendedProperties: { private: properties } },
  })
}

export async function deleteEvent(calendarId: string, eventId: string): Promise<void> {
  await googleFetch(`${eventsUrl(calendarId)}/${encodeURIComponent(eventId)}`, { method: 'DELETE' })
}

export async function canReadCalendar(calendarId: string): Promise<boolean> {
  try {
    await googleFetch(eventsUrl(calendarId, new URLSearchParams({ maxResults: '1' })))
    return true
  } catch (error) {
    if (error instanceof GoogleApiError && CALENDAR_UNREACHABLE_STATUSES.includes(error.status)) return false
    throw error
  }
}
