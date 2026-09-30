import { publicServices } from '../server/booking.js'
import { loadCatalog } from '../server/catalog.js'
import { json, withErrors } from '../server/http.js'

export const GET = withErrors(async () => json(publicServices(await loadCatalog())))
