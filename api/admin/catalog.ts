import type { AdminCatalog, Catalog } from '../../shared/types.js'
import { checkCalendars, loadCatalog, parseCatalog, saveCatalog } from '../../server/catalog.js'
import { getConfig } from '../../server/config.js'
import { json, readJson, withErrors } from '../../server/http.js'
import { requireAdmin } from '../../server/session.js'

function withServiceAccount(catalog: Catalog): AdminCatalog {
  return { ...catalog, service_account_email: getConfig().serviceAccount.email }
}

export const GET = withErrors(async request => {
  requireAdmin(request)
  return json(withServiceAccount(await loadCatalog()))
})

// Reemplaza el catálogo entero: con un solo admin no hay ediciones en paralelo que pisar
export const PUT = withErrors(async request => {
  requireAdmin(request)
  const catalog = parseCatalog(await readJson(request))
  await checkCalendars(catalog)
  await saveCatalog(catalog)
  return json(withServiceAccount(catalog))
})
