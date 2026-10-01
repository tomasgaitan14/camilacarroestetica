import { book } from '../server/booking.js'
import { parseBookingRequest } from '../server/domain/booking-request.js'
import { json, readJson, withErrors } from '../server/http.js'

export const POST = withErrors(async request => {
  const now = new Date()
  const bookingRequest = parseBookingRequest(await readJson(request), now)
  // El link de cancelar del WhatsApp apunta al mismo sitio donde se reservó (local, preview o producción)
  return json(await book(bookingRequest, now, new URL(request.url).origin))
})
