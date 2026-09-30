import { describe, expect, it } from 'vitest'
import { ConfigError, loadConfig, type Env } from './config.js'

// Misma forma que el JSON que descarga Google Cloud para una cuenta de servicio
const SERVICE_ACCOUNT_FILE = {
  type: 'service_account',
  project_id: 'camila-carro-turnos',
  private_key_id: 'id-falso',
  private_key: '-----BEGIN PRIVATE KEY-----\nclave-falsa-solo-para-tests\n',
  client_email: 'turnos-dev@camila-carro-turnos.iam.gserviceaccount.com',
  client_id: '000000000000000000000',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/turnos-dev%40camila-carro-turnos.iam.gserviceaccount.com',
  universe_domain: 'googleapis.com',
}

// El JSON del cliente OAuth, que se confunde fácil con la clave de la cuenta de servicio
const OAUTH_CLIENT_FILE = {
  web: {
    client_id: '000000000000-cliente-falso.apps.googleusercontent.com',
    project_id: 'camila-carro-turnos',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_secret: 'secreto-falso-de-prueba',
    javascript_origins: ['http://localhost:3000'],
  },
}

const SHEET_ID = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
const OAUTH_CLIENT_ID = '000000000000-cliente-falso.apps.googleusercontent.com'
const SESSION_SECRET = 'secreto-de-sesion-falso-para-tests-0123456789'

function encodeKey(file: object): string {
  return Buffer.from(JSON.stringify(file)).toString('base64')
}

function configErrorFor(env: Env): ConfigError {
  try {
    loadConfig(env)
  } catch (error) {
    if (error instanceof ConfigError) return error
    throw error
  }
  throw new Error('loadConfig no lanzó un ConfigError')
}

function validEnv(): Env {
  return {
    GOOGLE_SERVICE_ACCOUNT_KEY: encodeKey(SERVICE_ACCOUNT_FILE),
    GOOGLE_SHEET_ID: SHEET_ID,
    GOOGLE_OAUTH_CLIENT_ID: OAUTH_CLIENT_ID,
    ADMIN_EMAILS: 'tom@example.com',
    SESSION_SECRET,
  }
}

describe('loadConfig', () => {
  it('returns the parsed config when every variable is valid', () => {
    expect(loadConfig(validEnv())).toEqual({
      serviceAccount: {
        email: SERVICE_ACCOUNT_FILE.client_email,
        privateKey: SERVICE_ACCOUNT_FILE.private_key,
      },
      sheetId: SHEET_ID,
      oauthClientId: OAUTH_CLIENT_ID,
      adminEmails: ['tom@example.com'],
      sessionSecret: SESSION_SECRET,
    })
  })

  it('ignores surrounding whitespace, like the trailing newline left by `echo | vercel env add`', () => {
    const config = loadConfig({ ...validEnv(), GOOGLE_SHEET_ID: `${SHEET_ID}\n` })

    expect(config.sheetId).toBe(SHEET_ID)
  })

  it('reads ADMIN_EMAILS as a comma-separated list, trimmed, lowercased and without empty entries', () => {
    const config = loadConfig({ ...validEnv(), ADMIN_EMAILS: ' Tom@Example.com, ,camila@example.com ' })

    expect(config.adminEmails).toEqual(['tom@example.com', 'camila@example.com'])
  })

  it('names every missing or blank variable in the error', () => {
    const error = configErrorFor({ ...validEnv(), GOOGLE_SHEET_ID: undefined, SESSION_SECRET: '   ' })

    expect(error.variables).toEqual(['GOOGLE_SHEET_ID', 'SESSION_SECRET'])
  })

  it('rejects a service account key pasted as raw JSON instead of base64', () => {
    const error = configErrorFor({ ...validEnv(), GOOGLE_SERVICE_ACCOUNT_KEY: JSON.stringify(SERVICE_ACCOUNT_FILE) })

    expect(error.variables).toEqual(['GOOGLE_SERVICE_ACCOUNT_KEY'])
  })

  it('rejects a base64 JSON file that is not a service account key', () => {
    const error = configErrorFor({ ...validEnv(), GOOGLE_SERVICE_ACCOUNT_KEY: encodeKey(OAUTH_CLIENT_FILE) })

    expect(error.variables).toEqual(['GOOGLE_SERVICE_ACCOUNT_KEY'])
  })

  it('rejects a SESSION_SECRET shorter than 32 characters', () => {
    const error = configErrorFor({ ...validEnv(), SESSION_SECRET: 'a'.repeat(31) })

    expect(error.variables).toEqual(['SESSION_SECRET'])
  })

  it('accepts a SESSION_SECRET of exactly 32 characters', () => {
    const config = loadConfig({ ...validEnv(), SESSION_SECRET: 'a'.repeat(32) })

    expect(config.sessionSecret).toBe('a'.repeat(32))
  })

  it('rejects ADMIN_EMAILS when an entry is not an email', () => {
    const error = configErrorFor({ ...validEnv(), ADMIN_EMAILS: 'tom@example.com, camila' })

    expect(error.variables).toEqual(['ADMIN_EMAILS'])
  })

  it('rejects ADMIN_EMAILS when it only has separators', () => {
    const error = configErrorFor({ ...validEnv(), ADMIN_EMAILS: ' , ,' })

    expect(error.variables).toEqual(['ADMIN_EMAILS'])
  })

  it('rejects a GOOGLE_OAUTH_CLIENT_ID that is not a Google client ID', () => {
    const error = configErrorFor({ ...validEnv(), GOOGLE_OAUTH_CLIENT_ID: OAUTH_CLIENT_FILE.web.client_secret })

    expect(error.variables).toEqual(['GOOGLE_OAUTH_CLIENT_ID'])
  })

  it('rejects a GOOGLE_SHEET_ID pasted as the full spreadsheet URL', () => {
    const error = configErrorFor({
      ...validEnv(),
      GOOGLE_SHEET_ID: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit#gid=0`,
    })

    expect(error.variables).toEqual(['GOOGLE_SHEET_ID'])
  })
})
