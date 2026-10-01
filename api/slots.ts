import type { SlotsResponse } from '../shared/types.js'
import { availableTimes } from '../server/booking.js'
import { json, withErrors } from '../server/http.js'

// GET /api/slots?service_id=<uuid>&date=yyyy-MM-dd
export const GET = withErrors(async request => {
  const slots = await availableTimes(new URL(request.url).searchParams, new Date())
  return json({ slots } satisfies SlotsResponse)
})
