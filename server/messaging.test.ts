import { describe, expect, it } from 'vitest'
import { ConfigError } from './config.js'
import { loadMessagingConfig } from './messaging.js'

function configErrorFor(env: Record<string, string>): ConfigError {
  try {
    loadMessagingConfig(env)
  } catch (error) {
    if (error instanceof ConfigError) return error
    throw error
  }
  throw new Error('loadMessagingConfig no lanzó un ConfigError')
}

describe('loadMessagingConfig', () => {
  it('keeps WhatsApp off when WHATSAPP_MODE is not set, as in production', () => {
    expect(loadMessagingConfig({ ZERNIO_API_KEY: 'sk_prueba' })).toBeNull()
  })

  it('reads the sandbox simulation config, with the test phone reduced to digits', () => {
    expect(loadMessagingConfig({ WHATSAPP_MODE: 'zernio-sandbox', ZERNIO_API_KEY: 'sk_prueba', ZERNIO_TEST_PHONE: '+54 9 11 2345-6789' }))
      .toEqual({ mode: 'zernio-sandbox', apiKey: 'sk_prueba', baseUrl: 'https://zernio.com/api/v1', testPhone: '5491123456789' })
  })

  it('names the missing variables when the simulation is on', () => {
    expect(configErrorFor({ WHATSAPP_MODE: 'zernio-sandbox' }).variables).toEqual(['ZERNIO_API_KEY', 'ZERNIO_TEST_PHONE'])
  })

  it('rejects an unknown mode instead of silently not sending', () => {
    expect(configErrorFor({ WHATSAPP_MODE: 'meta' }).variables).toEqual(['WHATSAPP_MODE'])
  })
})
