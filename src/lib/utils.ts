import { format, parse } from 'date-fns'
import { es } from 'date-fns/locale'

export const DAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const ISO_DATE = 'yyyy-MM-dd'

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// 'yyyy-MM-dd' → 'jueves 1 de octubre'
export function formatDay(date: string): string {
  return format(parse(date, ISO_DATE, new Date()), "EEEE d 'de' MMMM", { locale: es })
}
