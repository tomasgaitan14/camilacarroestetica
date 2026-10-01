import { HTTP_STATUS } from '../../shared/http.js'
import { HttpError, json, withErrors } from '../../server/http.js'
import { sendDueReminders } from '../../server/notifications.js'
import { constantTimeEqual } from '../../server/session.js'

// Con menos caracteres, la clave que usa GitHub Actions se podría adivinar
const CRON_SECRET_MIN_LENGTH = 32

function requireCronSecret(request: Request): void {
  const secret = process.env.CRON_SECRET?.trim() ?? ''
  if (secret.length < CRON_SECRET_MIN_LENGTH) {
    throw new HttpError(HTTP_STATUS.SERVICE_UNAVAILABLE, 'Los recordatorios no están configurados')
  }
  if (!constantTimeEqual(request.headers.get('authorization') ?? '', `Bearer ${secret}`)) {
    throw new HttpError(HTTP_STATUS.UNAUTHORIZED, 'No autorizado')
  }
}

// Lo llama GitHub Actions cada 15 minutos
export const POST = withErrors(async request => {
  requireCronSecret(request)
  return json(await sendDueReminders(new Date()))
})
