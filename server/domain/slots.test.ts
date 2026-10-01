import { describe, expect, it } from 'vitest'
import { computeAvailableSlots, type AvailabilityBlock, type BusyInterval, type ProfessionalSchedule } from './slots.js'

const MONDAY = 1
const TUESDAY = 2
const MONDAY_DATE = '2026-10-05'
const DAYS_BEFORE = new Date('2026-10-01T12:00:00Z')

function schedule(professionalId: string, availability: AvailabilityBlock[], busy: BusyInterval[] = []): ProfessionalSchedule {
  return { professional_id: professionalId, availability, busy }
}

function mondayBlock(startTime: string, endTime: string): AvailabilityBlock {
  return { day_of_week: MONDAY, start_time: startTime, end_time: endTime }
}

describe('computeAvailableSlots', () => {
  it('offers consecutive slots of the service duration within the working hours', () => {
    const slots = computeAvailableSlots({
      date: MONDAY_DATE,
      durationMinutes: 60,
      earliestStart: DAYS_BEFORE,
      professionals: [schedule('ana', [mondayBlock('09:00', '12:00')])],
    })

    expect(slots).toEqual([
      { time: '09:00', professional_id: 'ana' },
      { time: '10:00', professional_id: 'ana' },
      { time: '11:00', professional_id: 'ana' },
    ])
  })

  it('does not offer a slot that would end after the working hours', () => {
    const slots = computeAvailableSlots({
      date: MONDAY_DATE,
      durationMinutes: 60,
      earliestStart: DAYS_BEFORE,
      professionals: [schedule('ana', [mondayBlock('09:00', '11:30')])],
    })

    expect(slots.map(slot => slot.time)).toEqual(['09:00', '10:00'])
  })

  it('only uses the working hours of the requested weekday', () => {
    const slots = computeAvailableSlots({
      date: MONDAY_DATE,
      durationMinutes: 60,
      earliestStart: DAYS_BEFORE,
      professionals: [schedule('ana', [
        mondayBlock('09:00', '10:00'),
        { day_of_week: TUESDAY, start_time: '15:00', end_time: '16:00' },
      ])],
    })

    expect(slots.map(slot => slot.time)).toEqual(['09:00'])
  })

  it('hides slots that overlap a calendar event, but not those that only touch it', () => {
    const slots = computeAvailableSlots({
      date: MONDAY_DATE,
      durationMinutes: 60,
      earliestStart: DAYS_BEFORE,
      professionals: [schedule('ana', [mondayBlock('09:00', '12:00')], [
        // 08:00 a 09:00 en Buenos Aires: termina justo cuando empieza el turno de las 09:00
        { start: new Date('2026-10-05T11:00:00Z'), end: new Date('2026-10-05T12:00:00Z') },
        // 10:30 a 11:00 en Buenos Aires: pisa el turno de las 10:00
        { start: new Date('2026-10-05T13:30:00Z'), end: new Date('2026-10-05T14:00:00Z') },
      ])],
    })

    expect(slots.map(slot => slot.time)).toEqual(['09:00', '11:00'])
  })

  it('hides slots that start before the earliest bookable start', () => {
    const slots = computeAvailableSlots({
      date: MONDAY_DATE,
      durationMinutes: 60,
      earliestStart: new Date('2026-10-05T13:15:00Z'),  // 10:15 en Buenos Aires
      professionals: [schedule('ana', [mondayBlock('09:00', '12:00')])],
    })

    expect(slots.map(slot => slot.time)).toEqual(['11:00'])
  })

  it('assigns each slot to the first free professional, in the given order', () => {
    const slots = computeAvailableSlots({
      date: MONDAY_DATE,
      durationMinutes: 60,
      earliestStart: DAYS_BEFORE,
      professionals: [
        schedule('ana', [mondayBlock('09:00', '11:00')], [
          // 09:00 a 10:00 en Buenos Aires
          { start: new Date('2026-10-05T12:00:00Z'), end: new Date('2026-10-05T13:00:00Z') },
        ]),
        schedule('bea', [mondayBlock('09:00', '12:00')]),
      ],
    })

    expect(slots).toEqual([
      { time: '09:00', professional_id: 'bea' },
      { time: '10:00', professional_id: 'ana' },
      { time: '11:00', professional_id: 'bea' },
    ])
  })

  it.each([0, -30, 30.5])('rejects a service duration of %s minutes', durationMinutes => {
    expect(() => computeAvailableSlots({
      date: MONDAY_DATE,
      durationMinutes,
      earliestStart: DAYS_BEFORE,
      professionals: [schedule('ana', [mondayBlock('09:00', '12:00')])],
    })).toThrow(RangeError)
  })
})
