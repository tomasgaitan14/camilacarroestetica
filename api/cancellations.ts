import type { ClientBookingsResponse } from '../shared/types.js'
import { cancelClientBooking } from '../server/booking.js'
import { parseCancellation } from '../server/domain/client-changes.js'
import { json, readJson, withErrors } from '../server/http.js'

export const POST = withErrors(async request => {
  const cancellation = parseCancellation(await readJson(request))
  return json({ bookings: await cancelClientBooking(cancellation, new Date()) } satisfies ClientBookingsResponse)
})
