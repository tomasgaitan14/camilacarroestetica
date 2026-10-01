import { describe, expect, it } from 'vitest'
import { serviceVisibility } from './catalog-visibility.js'
import type { Catalog } from './types.js'

const service = (id: string, active = true) => ({ id, name: id, description: '', duration_minutes: 60, active })
const professional = (id: string, serviceIds: string[], active = true) => ({ id, name: id, calendar_id: `${id}@group.calendar.google.com`, service_ids: serviceIds, active })

const catalog: Catalog = {
  services: [service('peeling'), service('semi'), service('masajes'), service('pausado', false), service('suelto')],
  professionals: [
    professional('camila', ['peeling', 'semi']),
    professional('natalia', ['semi', 'masajes']),
    professional('baja', ['suelto'], false),
  ],
  availability: [{ professional_id: 'camila', day_of_week: 1, start_time: '09:00', end_time: '18:00' }],
}

const visibilityOf = (id: string) => serviceVisibility(catalog, catalog.services.find(candidate => candidate.id === id)!)

describe('serviceVisibility', () => {
  it('shows a service when at least one active professional who offers it has a schedule', () => {
    expect(visibilityOf('peeling')).toBe('visible')
    expect(visibilityOf('semi')).toBe('visible')
  })

  it('hides it when the professionals who offer it have no schedule', () => {
    expect(visibilityOf('masajes')).toBe('no-schedule')
  })

  it('hides it when no active professional offers it', () => {
    expect(visibilityOf('suelto')).toBe('unassigned')
  })

  it('hides it when the service itself is inactive', () => {
    expect(visibilityOf('pausado')).toBe('inactive')
  })
})
