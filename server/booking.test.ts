import { describe, expect, it } from 'vitest'
import type { Catalog } from '../shared/types.js'
import { publicServices } from './booking.js'

const service = (id: string, name: string) => ({ id, name, description: '', duration_minutes: 60, active: true })
const professional = (id: string, serviceIds: string[]) => ({ id, name: id, calendar_id: `${id}@group.calendar.google.com`, service_ids: serviceIds, active: true })
const thursday = (professionalId: string) => ({ professional_id: professionalId, day_of_week: 4, start_time: '09:00', end_time: '13:00' })

describe('publicServices', () => {
  it('groups services by the first professional who does them, in team order, keeping the services order inside each group', () => {
    const catalog: Catalog = {
      services: [service('depilacion', 'Depilación'), service('peeling', 'Peeling'), service('masajes', 'Masajes'), service('bronceado', 'Bronceado')],
      professionals: [professional('camila', ['peeling', 'bronceado']), professional('marti', ['depilacion', 'masajes', 'peeling'])],
      availability: [thursday('camila'), thursday('marti')],
    }

    const services = publicServices(catalog)

    expect(services.map(({ name, group }) => `${group} ${name}`)).toEqual([
      '0 Peeling',
      '0 Bronceado',
      '1 Depilación',
      '1 Masajes',
    ])
  })
})
