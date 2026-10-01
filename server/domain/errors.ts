// Datos de entrada inválidos: un mensaje para mostrar por cada campo con problemas
export class ValidationError extends Error {
  readonly fields: Record<string, string>

  constructor(fields: Record<string, string>) {
    super(`Datos inválidos: ${Object.keys(fields).join(', ')}`)
    this.name = 'ValidationError'
    this.fields = fields
  }
}
