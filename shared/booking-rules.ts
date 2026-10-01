// Reglas de reserva que decidió Tom (2026-10-01); las usan el front y las funciones de /api
export const MIN_NOTICE_HOURS = 2
export const MAX_DAYS_AHEAD = 30
export const MAX_FUTURE_BOOKINGS_PER_PHONE = 3
// Cancelar o reprogramar se puede hasta estas horas antes; después, el cliente tiene que escribir
export const CLIENT_CHANGE_MIN_HOURS = 24
