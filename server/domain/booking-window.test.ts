import { describe, expect, it } from 'vitest'
import { canBookAnother, earliestBookableStart, lastBookableDate } from './booking-window.js'

describe('booking window', () => {
  it('only offers slots starting at least 2 hours from now', () => {
    const now = new Date('2026-10-05T15:00:00Z')  // lunes 12:00 en Buenos Aires

    expect(earliestBookableStart(now).toISOString()).toBe('2026-10-05T17:00:00.000Z')
  })

  it('counts the 30 days from the Buenos Aires date, even late at night when UTC is already tomorrow', () => {
    const lateMondayNight = new Date('2026-10-06T02:30:00Z')  // lunes 5 a las 23:30 en Buenos Aires

    expect(lastBookableDate(lateMondayNight)).toBe('2026-11-04')
  })

  it('lets a phone hold up to 3 future bookings', () => {
    expect(canBookAnother(2)).toBe(true)
    expect(canBookAnother(3)).toBe(false)
  })
})
