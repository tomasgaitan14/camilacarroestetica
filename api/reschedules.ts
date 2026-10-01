import { rescheduleClientBooking } from '../server/booking.js'
import { parseReschedule } from '../server/domain/client-changes.js'
import { json, readJson, withErrors } from '../server/http.js'

export const POST = withErrors(async request => {
  const now = new Date()
  const reschedule = parseReschedule(await readJson(request), now)
  return json(await rescheduleClientBooking(reschedule, now))
})
