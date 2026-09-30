import { z } from 'zod'
import type { Availability, Catalog, Professional, Service } from '../shared/types.js'
import { canReadCalendar } from './calendar.js'
import { getConfig } from './config.js'
import { ValidationError } from './domain/errors.js'
import { isValidTime, normalizeTime } from './domain/time.js'
import { googleFetch } from './google.js'

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'

// Cada tabla es una pestaña de la hoja, con estos encabezados en la fila 1
const HEADERS = {
  services: ['id', 'name', 'description', 'duration_minutes', 'active'],
  professionals: ['id', 'name', 'calendar_id', 'service_ids', 'active'],
  availability: ['professional_id', 'day_of_week', 'start_time', 'end_time'],
} as const

type Tab = keyof typeof HEADERS
type Row = string[]

const TABS = Object.keys(HEADERS) as Tab[]
const SHEET_TRUE = 'TRUE'
const LIST_SEPARATOR = ','

const NAME_MAX_LENGTH = 100
const DESCRIPTION_MAX_LENGTH = 300
const CALENDAR_ID_MAX_LENGTH = 255
const DURATION_MIN_MINUTES = 5
const DURATION_MAX_MINUTES = 480
const SUNDAY = 0
const SATURDAY = 6

const name = z.string().trim()
  .min(1, { error: 'Falta el nombre' })
  .max(NAME_MAX_LENGTH, { error: `El nombre puede tener hasta ${NAME_MAX_LENGTH} caracteres` })

const serviceSchema = z.object({
  id: z.uuid(),
  name,
  description: z.string().trim().max(DESCRIPTION_MAX_LENGTH, { error: `La descripción puede tener hasta ${DESCRIPTION_MAX_LENGTH} caracteres` }),
  duration_minutes: z.number({ error: 'La duración tiene que ser un número' }).int()
    .min(DURATION_MIN_MINUTES, { error: `La duración mínima es ${DURATION_MIN_MINUTES} minutos` })
    .max(DURATION_MAX_MINUTES, { error: `La duración máxima es ${DURATION_MAX_MINUTES} minutos` }),
  active: z.boolean(),
})

const professionalSchema = z.object({
  id: z.uuid(),
  name,
  calendar_id: z.string().trim()
    .min(1, { error: 'Falta el ID del calendario' })
    .max(CALENDAR_ID_MAX_LENGTH, { error: 'El ID del calendario es demasiado largo' }),
  service_ids: z.array(z.uuid()),
  active: z.boolean(),
})

const time = z.string().refine(isValidTime, { error: 'Hora inválida' })

const availabilitySchema = z.object({
  professional_id: z.uuid(),
  day_of_week: z.number().int().min(SUNDAY).max(SATURDAY),
  start_time: time,
  end_time: time,
}).refine(block => block.start_time < block.end_time, {
  error: 'La hora de inicio tiene que ser anterior a la de fin',
  path: ['end_time'],
})

function hasDuplicates(ids: string[]): boolean {
  return new Set(ids).size !== ids.length
}

const catalogSchema = z.object({
  services: z.array(serviceSchema),
  professionals: z.array(professionalSchema),
  availability: z.array(availabilitySchema),
}).superRefine((catalog, ctx) => {
  const serviceIds = new Set(catalog.services.map(service => service.id))
  const professionalIds = new Set(catalog.professionals.map(professional => professional.id))

  if (hasDuplicates(catalog.services.map(service => service.id))) {
    ctx.addIssue({ code: 'custom', message: 'Hay dos servicios con el mismo id', path: ['services'] })
  }
  if (hasDuplicates(catalog.professionals.map(professional => professional.id))) {
    ctx.addIssue({ code: 'custom', message: 'Hay dos profesionales con el mismo id', path: ['professionals'] })
  }
  catalog.professionals.forEach((professional, index) => {
    if (professional.service_ids.some(id => !serviceIds.has(id))) {
      ctx.addIssue({ code: 'custom', message: `${professional.name} tiene un servicio que no existe`, path: ['professionals', index, 'service_ids'] })
    }
  })
  catalog.availability.forEach((block, index) => {
    if (!professionalIds.has(block.professional_id)) {
      ctx.addIssue({ code: 'custom', message: 'Hay un horario de una profesional que no existe', path: ['availability', index, 'professional_id'] })
    }
  })
})

export function parseCatalog(input: unknown): Catalog {
  const parsed = catalogSchema.safeParse(input)
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      fields[issue.path.join('.') || 'catalog'] ??= issue.message
    }
    throw new ValidationError(fields)
  }
  return parsed.data
}

// La hoja se editó a mano y quedó con datos que la app no puede usar
export class SheetDataError extends Error {
  constructor(fields: Record<string, string>) {
    const problems = Object.entries(fields).map(([field, message]) => `${field}: ${message}`)
    super(`La Google Sheet tiene datos inválidos (el índice 0 es la fila 2): ${problems.join('; ')}`)
    this.name = 'SheetDataError'
  }
}

function sheetUrl(path: string): string {
  return `${SHEETS_API}/${getConfig().sheetId}/${path}`
}

// Filas de datos de cada pestaña, sin los encabezados; incluye filas vacías del medio
async function readTabs(): Promise<Record<Tab, Row[]>> {
  const params = new URLSearchParams(TABS.map((tab): [string, string] => ['ranges', `${tab}!A2:Z`]))
  const { valueRanges } = await googleFetch<{ valueRanges: { values?: Row[] }[] }>(sheetUrl(`values:batchGet?${params}`))
  return Object.fromEntries(TABS.map((tab, index) => [tab, valueRanges[index].values ?? []])) as Record<Tab, Row[]>
}

const isBlank = (row: Row) => row.every(cell => cell.trim() === '')
const toList = (cell: string) => cell.split(LIST_SEPARATOR).map(item => item.trim()).filter(item => item.length > 0)

// Sheets omite las celdas vacías del final de cada fila: por eso los valores por defecto
function serviceFromRow([id = '', name = '', description = '', duration = '', active = '']: Row): Service {
  return { id, name, description, duration_minutes: Number(duration), active: active.toUpperCase() === SHEET_TRUE }
}

function professionalFromRow([id = '', name = '', calendarId = '', serviceIds = '', active = '']: Row): Professional {
  return { id, name, calendar_id: calendarId, service_ids: toList(serviceIds), active: active.toUpperCase() === SHEET_TRUE }
}

function availabilityFromRow([professionalId = '', dayOfWeek = '', startTime = '', endTime = '']: Row): Availability {
  return {
    professional_id: professionalId,
    day_of_week: Number(dayOfWeek),
    start_time: normalizeTime(startTime),
    end_time: normalizeTime(endTime),
  }
}

export async function loadCatalog(): Promise<Catalog> {
  const tabs = await readTabs()
  const raw = {
    services: tabs.services.filter(row => !isBlank(row)).map(serviceFromRow),
    professionals: tabs.professionals.filter(row => !isBlank(row)).map(professionalFromRow),
    availability: tabs.availability.filter(row => !isBlank(row)).map(availabilityFromRow),
  }
  try {
    return parseCatalog(raw)
  } catch (error) {
    if (error instanceof ValidationError) throw new SheetDataError(error.fields)
    throw error
  }
}

const toCell = (active: boolean) => (active ? SHEET_TRUE : 'FALSE')

function toRows(catalog: Catalog): Record<Tab, Row[]> {
  return {
    services: catalog.services.map(service => [
      service.id, service.name, service.description, String(service.duration_minutes), toCell(service.active),
    ]),
    professionals: catalog.professionals.map(professional => [
      professional.id, professional.name, professional.calendar_id, professional.service_ids.join(LIST_SEPARATOR), toCell(professional.active),
    ]),
    availability: catalog.availability.map(block => [
      block.professional_id, String(block.day_of_week), block.start_time, block.end_time,
    ]),
  }
}

// Reescribe cada pestaña entera en un solo pedido: las filas que sobran se pisan con celdas vacías
export async function saveCatalog(catalog: Catalog): Promise<void> {
  const current = await readTabs()
  const rows = toRows(catalog)
  const data = TABS.map(tab => {
    const blankRows = Math.max(0, current[tab].length - rows[tab].length)
    const blank = HEADERS[tab].map(() => '')
    return {
      range: `${tab}!A1`,
      values: [[...HEADERS[tab]], ...rows[tab], ...Array.from({ length: blankRows }, () => blank)],
    }
  })
  // RAW: lo que se escribe queda como texto, así un nombre que empieza con '=' no se vuelve fórmula
  await googleFetch(sheetUrl('values:batchUpdate'), { method: 'POST', body: { valueInputOption: 'RAW', data } })
}

// Sin acceso al calendario, /booking fallaría para todos: se frena al guardar
export async function checkCalendars(catalog: Catalog): Promise<void> {
  const serviceAccountEmail = getConfig().serviceAccount.email
  const checks = await Promise.all(catalog.professionals.map(async (professional, index) => ({
    professional,
    index,
    readable: !professional.active || await canReadCalendar(professional.calendar_id),
  })))
  const fields: Record<string, string> = {}
  for (const { professional, index, readable } of checks) {
    if (!readable) {
      fields[`professionals.${index}.calendar_id`] =
        `No puedo ver el calendario de ${professional.name}. Revisá el ID y compartilo con ${serviceAccountEmail} con permiso "Hacer cambios en los eventos"`
    }
  }
  if (Object.keys(fields).length > 0) throw new ValidationError(fields)
}
