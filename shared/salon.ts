// WhatsApp del salón, para lo que no se puede resolver desde la web
export const SALON_WHATSAPP = '5493446617979'

export function whatsappLink(phone: string, message?: string): string {
  const base = `https://wa.me/${phone}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}
