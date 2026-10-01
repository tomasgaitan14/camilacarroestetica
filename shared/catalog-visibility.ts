import type { Catalog, Professional, Service } from './types.js'

// Profesionales que pueden recibir turnos: activas y con al menos un bloque de horarios
export function workingProfessionals(catalog: Catalog): Professional[] {
  return catalog.professionals.filter(professional =>
    professional.active && catalog.availability.some(block => block.professional_id === professional.id))
}

export type ServiceVisibility = 'visible' | 'inactive' | 'unassigned' | 'no-schedule'

// Si el servicio se ve en /booking y, si no, por qué; es la misma regla que usa /api/services
export function serviceVisibility(catalog: Catalog, service: Service): ServiceVisibility {
  if (!service.active) return 'inactive'
  const offering = catalog.professionals.filter(professional => professional.active && professional.service_ids.includes(service.id))
  if (offering.length === 0) return 'unassigned'
  const working = new Set(workingProfessionals(catalog).map(professional => professional.id))
  return offering.some(professional => working.has(professional.id)) ? 'visible' : 'no-schedule'
}
