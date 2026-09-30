import { addMinutes } from 'date-fns'
import { z } from 'zod'
import { HTTP_STATUS } from '../shared/http.js'
import type { BookingConfirmation, Catalog, Professional, PublicService, Service } from '../shared/types.js'
import { createEvent, listBusy } from './calendar.js'
import { loadCatalog } from './catalog.js'
import type { BookingRequest } from './domain/booking-request.js'
import { ValidationError } from './domain/errors.js'
import { computeAvailableSlots, type AvailableSlot } from './domain/slots.js'
import { isValidDate, toInstant, weekdayOf } from './domain/time.js'
import { HttpError } from './http.js'

function professionalsFor(catalog: Catalog, serviceId: string): Professional[] {
  return catalog.professionals.filter(professional => professional.active && professional.service_ids.includes(serviceId))
}

// Servicios que se pueden reservar: activos y con alguna profesional que tenga horarios
export function publicServices(catalog: Catalog): PublicService[] {
  return catalog.services
    .filter(service => service.active)
    .map(service => {
      const professionalIds = new Set(professionalsFor(catalog, service.id).map(professional => professional.id))
      const weekdays = [...new Set(catalog.availability
        .filter(block => professionalIds.has(block.professional_id))
        .map(block => block.day_of_week))]
        .sort((a, b) => a - b)
      return {
        id: service.id,
        name: service.name,
        description: service.description,
        duration_minutes: service.duration_minutes,
        weekdays,
      }
    })
    .filter(service => service.weekdays.length > 0)
}

function activeService(catalog: Catalog, serviceId: string): Service {
  const service = catalog.services.find(candidate => candidate.id === serviceId && candidate.active)
  if (!service) throw new ValidationError({ service_id: 'Ese servicio ya no está disponible' })
  return service
}

// Cruza los horarios configurados con lo que hay cargado hoy en cada calendario
async function findSlots(catalog: Catalog, service: Service, date: string, now: Date): Promise<AvailableSlot[]> {
  const weekday = weekdayOf(date)
  const working = professionalsFor(catalog, service.id)
    .filter(professional => catalog.availability.some(block => block.professional_id === professional.id && block.day_of_week === weekday))

  const schedules = await Promise.all(working.map(async professional => ({
    professional_id: professional.id,
    availability: catalog.availability.filter(block => block.professional_id === professional.id),
    busy: await listBusy(professional.calendar_id, date),
  })))

  return computeAvailableSlots({ date, durationMinutes: service.duration_minutes, professionals: schedules, now })
}

const slotQuerySchema = z.object({
  service_id: z.uuid({ error: 'Elegí un servicio' }),
  date: z.string().refine(isValidDate, { error: 'Elegí una fecha válida' }),
})

export async function availableTimes(query: URLSearchParams, now: Date): Promise<string[]> {
  const parsed = slotQuerySchema.safeParse(Object.fromEntries(query))
  if (!parsed.success) {
    throw new ValidationError(Object.fromEntries(parsed.error.issues.map(issue => [String(issue.path[0]), issue.message])))
  }
  const catalog = await loadCatalog()
  const slots = await findSlots(catalog, activeService(catalog, parsed.data.service_id), parsed.data.date, now)
  return slots.map(slot => slot.time)
}

// Vuelve a consultar los calendarios justo antes de crear el evento, por si alguien cargó algo a mano
export async function book(request: BookingRequest, now: Date): Promise<BookingConfirmation> {
  const catalog = await loadCatalog()
  const service = activeService(catalog, request.service_id)
  const slots = await findSlots(catalog, service, request.date, now)

  const slot = slots.find(candidate => candidate.time === request.time)
  if (!slot) throw new HttpError(HTTP_STATUS.CONFLICT, 'Ese horario ya fue tomado. Volvé atrás y elegí otro.')

  const professional = catalog.professionals.find(candidate => candidate.id === slot.professional_id)
  if (!professional) throw new Error(`Slot asignado a una profesional que no está en el catálogo: ${slot.professional_id}`)

  const start = toInstant(request.date, request.time)
  await createEvent(professional.calendar_id, {
    summary: `${service.name} — ${request.client_name}`,
    description: [
      `Cliente: ${request.client_name}`,
      `Teléfono: +${request.client_phone}`,
      `WhatsApp: https://wa.me/${request.client_phone}`,
      'Reservado desde la web',
    ].join('\n'),
    start,
    end: addMinutes(start, service.duration_minutes),
  })

  return {
    date: request.date,
    time: request.time,
    service_name: service.name,
    professional_name: professional.name,
  }
}
