import { addMinutes } from 'date-fns'
import { z } from 'zod'
import { HTTP_STATUS } from '../shared/http.js'
import type { BookingConfirmation, Catalog, ClientBooking, Professional, PublicService, Service } from '../shared/types.js'
import { createEvent, deleteEvent, findEventsByProperty, listBusy, type StoredEvent } from './calendar.js'
import { loadCatalog } from './catalog.js'
import { dateSchema, parseFields, type BookingRequest } from './domain/booking-request.js'
import { CLIENT_CHANGE_MIN_HOURS, MAX_FUTURE_BOOKINGS_PER_PHONE } from '../shared/booking-rules.js'
import { workingProfessionals } from '../shared/catalog-visibility.js'
import { canBookAnother, earliestBookableStart, lastBookableDate } from './domain/booking-window.js'
import {
  canClientChange,
  toBookingRef,
  type CancellationRequest,
  type RescheduleRequest,
} from './domain/client-changes.js'
import { ValidationError } from './domain/errors.js'
import { computeAvailableSlots, type AvailableSlot } from './domain/slots.js'
import { toInstant, toLocalDate, toLocalTime, weekdayOf } from './domain/time.js'
import { GoogleApiError } from './google.js'
import { HttpError } from './http.js'

// Propiedades privadas del evento: no se ven en el calendario y permiten encontrar los turnos de un cliente
const EVENT_PROPERTY = {
  CLIENT_PHONE: 'client_phone',
  CLIENT_NAME: 'client_name',
  SERVICE_ID: 'service_id',
} as const

const UNKNOWN_SERVICE_NAME = 'Turno'
const UNKNOWN_CLIENT_NAME = 'Cliente'

interface Client {
  name: string
  phone: string
}

function professionalsFor(catalog: Catalog, serviceId: string): Professional[] {
  return catalog.professionals.filter(professional => professional.active && professional.service_ids.includes(serviceId))
}

// Servicios que se pueden reservar: activos y con alguna profesional que tenga horarios.
// Cada uno va en el grupo de la primera profesional (orden de Equipo) que lo hace, sin exponer quién es.
export function publicServices(catalog: Catalog): PublicService[] {
  const working = workingProfessionals(catalog)

  return catalog.services
    .filter(service => service.active)
    .map(service => {
      const offering = working.filter(professional => professional.service_ids.includes(service.id))
      const offeringIds = new Set(offering.map(professional => professional.id))
      const weekdays = [...new Set(catalog.availability
        .filter(block => offeringIds.has(block.professional_id))
        .map(block => block.day_of_week))]
        .sort((a, b) => a - b)
      return {
        id: service.id,
        name: service.name,
        description: service.description,
        duration_minutes: service.duration_minutes,
        weekdays,
        group: offering.length > 0 ? working.indexOf(offering[0]) : -1,
      }
    })
    .filter(service => service.weekdays.length > 0)
    // sort es estable: dentro de cada grupo se mantiene el orden de Servicios
    .sort((a, b) => a.group - b.group)
}

function activeService(catalog: Catalog, serviceId: string | null): Service {
  const service = catalog.services.find(candidate => candidate.id === serviceId && candidate.active)
  if (!service) throw new ValidationError({ service_id: 'Ese servicio ya no está disponible' })
  return service
}

// Cruza los horarios configurados con lo que hay cargado hoy en cada calendario
async function findSlots(catalog: Catalog, service: Service, date: string, now: Date): Promise<AvailableSlot[]> {
  if (date < toLocalDate(now) || date > lastBookableDate(now)) return []

  const weekday = weekdayOf(date)
  const working = professionalsFor(catalog, service.id)
    .filter(professional => catalog.availability.some(block => block.professional_id === professional.id && block.day_of_week === weekday))

  const schedules = await Promise.all(working.map(async professional => ({
    professional_id: professional.id,
    availability: catalog.availability.filter(block => block.professional_id === professional.id),
    busy: await listBusy(professional.calendar_id, date),
  })))

  return computeAvailableSlots({
    date,
    durationMinutes: service.duration_minutes,
    professionals: schedules,
    earliestStart: earliestBookableStart(now),
  })
}

const slotQuerySchema = z.object({
  service_id: z.uuid({ error: 'Elegí un servicio' }),
  date: dateSchema,
})

export async function availableTimes(query: URLSearchParams, now: Date): Promise<string[]> {
  const { service_id: serviceId, date } = parseFields(slotQuerySchema, Object.fromEntries(query))
  const catalog = await loadCatalog()
  const slots = await findSlots(catalog, activeService(catalog, serviceId), date, now)
  return slots.map(slot => slot.time)
}

// Vuelve a consultar los calendarios justo antes de crear el evento, por si alguien cargó algo a mano
async function takeSlot(catalog: Catalog, service: Service, date: string, time: string, now: Date): Promise<Professional> {
  const slot = (await findSlots(catalog, service, date, now)).find(candidate => candidate.time === time)
  if (!slot) throw new HttpError(HTTP_STATUS.CONFLICT, 'Ese horario ya fue tomado. Volvé atrás y elegí otro.')

  const professional = catalog.professionals.find(candidate => candidate.id === slot.professional_id)
  if (!professional) throw new Error(`Slot asignado a una profesional que no está en el catálogo: ${slot.professional_id}`)
  return professional
}

async function createBookingEvent(professional: Professional, service: Service, client: Client, start: Date): Promise<void> {
  await createEvent(professional.calendar_id, {
    summary: `${service.name} — ${client.name}`,
    description: [
      `Cliente: ${client.name}`,
      `Teléfono: +${client.phone}`,
      `WhatsApp: https://wa.me/${client.phone}`,
      'Reservado desde la web',
    ].join('\n'),
    start,
    end: addMinutes(start, service.duration_minutes),
    privateProperties: {
      [EVENT_PROPERTY.CLIENT_PHONE]: client.phone,
      [EVENT_PROPERTY.CLIENT_NAME]: client.name,
      [EVENT_PROPERTY.SERVICE_ID]: service.id,
    },
  })
}

export async function book(request: BookingRequest, now: Date): Promise<BookingConfirmation> {
  const catalog = await loadCatalog()
  const service = activeService(catalog, request.service_id)

  // Contra reservas falsas en masa: reprogramar no pasa por acá, así que no cuenta
  const upcoming = await findClientEvents(catalog, request.client_phone, now)
  if (!canBookAnother(upcoming.length)) {
    throw new HttpError(
      HTTP_STATUS.CONFLICT,
      `Ya tenés ${MAX_FUTURE_BOOKINGS_PER_PHONE} turnos reservados. Para sacar otro, cancelá alguno desde "Cancelar o reprogramar".`,
    )
  }

  const professional = await takeSlot(catalog, service, request.date, request.time, now)

  const client = { name: request.client_name, phone: request.client_phone }
  await createBookingEvent(professional, service, client, toInstant(request.date, request.time))

  return { date: request.date, time: request.time, service_name: service.name, professional_name: professional.name }
}

interface ClientEvent {
  booking: ClientBooking
  professional: Professional
  event: StoredEvent
}

function toClientBooking(catalog: Catalog, professional: Professional, event: StoredEvent, now: Date): ClientBooking {
  const service = catalog.services.find(candidate => candidate.id === event.privateProperties[EVENT_PROPERTY.SERVICE_ID])
  return {
    ref: toBookingRef(professional.id, event.id),
    service_id: service?.id ?? null,
    service_name: service?.name ?? UNKNOWN_SERVICE_NAME,
    professional_name: professional.name,
    date: toLocalDate(event.start),
    time: toLocalTime(event.start),
    can_change: canClientChange(event.start, now),
  }
}

// Turnos futuros del celular en los calendarios de las profesionales activas
async function findClientEvents(catalog: Catalog, phone: string, now: Date): Promise<ClientEvent[]> {
  const perProfessional = await Promise.all(catalog.professionals
    .filter(professional => professional.active)
    .map(async professional => {
      const events = await findEventsByProperty(professional.calendar_id, EVENT_PROPERTY.CLIENT_PHONE, phone, now)
      return events.map(event => ({ booking: toClientBooking(catalog, professional, event, now), professional, event }))
    }))
  return perProfessional.flat().sort((a, b) => a.event.start.getTime() - b.event.start.getTime())
}

// El turno tiene que ser de ese celular: así una referencia sola no alcanza para tocarlo
function changeableEvent(events: ClientEvent[], ref: string): ClientEvent {
  const target = events.find(candidate => candidate.booking.ref === ref)
  if (!target) throw new HttpError(HTTP_STATUS.NOT_FOUND, 'No encontramos ese turno. Volvé a buscar tus turnos.')
  if (!target.booking.can_change) {
    throw new HttpError(HTTP_STATUS.CONFLICT, `Faltan menos de ${CLIENT_CHANGE_MIN_HOURS} h para el turno: escribinos para cambiarlo.`)
  }
  return target
}

export async function listClientBookings(phone: string, now: Date): Promise<ClientBooking[]> {
  const catalog = await loadCatalog()
  return (await findClientEvents(catalog, phone, now)).map(found => found.booking)
}

// Devuelve los turnos que le quedan al cliente
export async function cancelClientBooking(request: CancellationRequest, now: Date): Promise<ClientBooking[]> {
  const catalog = await loadCatalog()
  const events = await findClientEvents(catalog, request.client_phone, now)
  const target = changeableEvent(events, request.ref)
  await deleteEvent(target.professional.calendar_id, target.event.id)
  return events.filter(found => found !== target).map(found => found.booking)
}

// Crea el turno nuevo antes de borrar el viejo: si el horario nuevo ya no está, el cliente conserva el suyo
export async function rescheduleClientBooking(request: RescheduleRequest, now: Date): Promise<BookingConfirmation> {
  const catalog = await loadCatalog()
  const target = changeableEvent(await findClientEvents(catalog, request.client_phone, now), request.ref)
  const service = activeService(catalog, target.booking.service_id)
  const professional = await takeSlot(catalog, service, request.date, request.time, now)

  const client = {
    name: target.event.privateProperties[EVENT_PROPERTY.CLIENT_NAME] ?? UNKNOWN_CLIENT_NAME,
    phone: request.client_phone,
  }
  await createBookingEvent(professional, service, client, toInstant(request.date, request.time))

  try {
    await deleteEvent(target.professional.calendar_id, target.event.id)
  } catch (error) {
    // El turno nuevo ya está creado: mejor un duplicado visible en el calendario que fallarle al cliente
    if (!(error instanceof GoogleApiError)) throw error
    console.error(`No se pudo borrar el turno reprogramado ${request.ref}`, error)
  }

  return { date: request.date, time: request.time, service_name: service.name, professional_name: professional.name }
}
