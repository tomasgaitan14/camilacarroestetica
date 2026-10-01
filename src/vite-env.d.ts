/// <reference types="vite/client" />

interface ImportMetaEnv {
  // "true" donde los avisos por WhatsApp están activos; no es secreto, termina en el navegador
  readonly VITE_WHATSAPP_NOTICE?: string
}
