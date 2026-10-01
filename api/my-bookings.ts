import type { ClientBookingsResponse } from '../shared/types.js'
import { listClientBookings } from '../server/booking.js'
import { parseClientLookup } from '../server/domain/client-changes.js'
import { json, readJson, withErrors } from '../server/http.js'

// POST y no GET: el celular va en el cuerpo, no en la URL
export const POST = withErrors(async request => {
  const { client_phone: phone } = parseClientLookup(await readJson(request))
  return json({ bookings: await listClientBookings(phone, new Date()) } satisfies ClientBookingsResponse)
})
