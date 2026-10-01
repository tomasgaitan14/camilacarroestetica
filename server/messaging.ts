import { ConfigError, type Env } from './config.js'

// Envío de WhatsApp intercambiable. Sin WHATSAPP_MODE está apagado (producción, hasta que esté Meta);
// con "zernio-sandbox" es una simulación: todo va al celular de prueba por el sandbox de Zernio.
const ZERNIO_SANDBOX_MODE = 'zernio-sandbox'
const DEFAULT_ZERNIO_BASE_URL = 'https://zernio.com/api/v1'

export interface MessagingConfig {
  mode: typeof ZERNIO_SANDBOX_MODE
  apiKey: string
  baseUrl: string
  testPhone: string  // solo dígitos, con código de país
}

export function loadMessagingConfig(env: Env): MessagingConfig | null {
  const mode = env.WHATSAPP_MODE?.trim()
  if (!mode) return null
  if (mode !== ZERNIO_SANDBOX_MODE) {
    throw new ConfigError([{ variable: 'WHATSAPP_MODE', detail: `el único modo disponible es ${ZERNIO_SANDBOX_MODE}` }])
  }

  const apiKey = env.ZERNIO_API_KEY?.trim() ?? ''
  const testPhone = (env.ZERNIO_TEST_PHONE ?? '').replace(/\D/g, '')
  const missing = [
    ...(apiKey ? [] : ['ZERNIO_API_KEY']),
    ...(testPhone ? [] : ['ZERNIO_TEST_PHONE']),
  ]
  if (missing.length > 0) throw new ConfigError(missing.map(variable => ({ variable, detail: 'falta' })))

  const baseUrl = (env.ZERNIO_BASE_URL?.trim() || DEFAULT_ZERNIO_BASE_URL).replace(/\/+$/, '')
  return { mode, apiKey, baseUrl, testPhone }
}

let cachedConfig: MessagingConfig | null | undefined

export function getMessagingConfig(): MessagingConfig | null {
  if (cachedConfig === undefined) cachedConfig = loadMessagingConfig(process.env)
  return cachedConfig
}

// Falló el envío (red, sandbox sin sesión, fuera de la ventana de 24 h, etc.); la reserva no se cae por esto
export class MessagingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MessagingError'
  }
}

async function zernio<T>(config: MessagingConfig, path: string, init: { method?: string, body?: unknown, idempotencyKey?: string } = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${config.baseUrl}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        ...(init.idempotencyKey ? { 'Idempotency-Key': init.idempotencyKey } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    })
  } catch (error) {
    // fetch tira TypeError cuando no hay red o no resuelve el host
    if (error instanceof TypeError) throw new MessagingError(`No se pudo contactar a Zernio: ${error.message}`)
    throw error
  }
  if (!response.ok) throw new MessagingError(`Zernio respondió ${response.status}: ${(await response.text()).slice(0, 300)}`)
  return await response.json() as T
}

interface ZernioConversation {
  id: string
  accountId: string
  participantId: string
}

// El sandbox solo puede escribirle al celular de prueba, en la conversación que abrió al activar la sesión
async function testConversation(config: MessagingConfig): Promise<ZernioConversation> {
  const { data } = await zernio<{ data: ZernioConversation[] }>(config, '/inbox/conversations')
  const conversation = data.find(candidate => String(candidate.participantId).replace(/\D/g, '') === config.testPhone)
  if (!conversation) {
    throw new MessagingError('No hay conversación con el celular de prueba: escribile al número del sandbox de Zernio')
  }
  return conversation
}

export interface OutgoingMessage {
  to: string             // celular del cliente, normalizado (549…)
  text: string
  idempotencyKey: string // si se reintenta, Zernio no lo manda dos veces
}

// Devuelve false si los mensajes están apagados
export async function sendWhatsApp(message: OutgoingMessage): Promise<boolean> {
  const config = getMessagingConfig()
  if (!config) return false

  const conversation = await testConversation(config)
  await zernio(config, `/inbox/conversations/${conversation.id}/messages`, {
    method: 'POST',
    body: { accountId: conversation.accountId, message: `Simulación: mensaje para +${message.to}\n\n${message.text}` },
    idempotencyKey: message.idempotencyKey,
  })
  return true
}
