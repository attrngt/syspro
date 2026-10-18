import { describe, it, expect } from 'vitest'
import { formatTimeWib } from './time'

describe('formatTimeWib', () => {
  it('mengonversi waktu UTC ke format HH.mm WIB (UTC+7)', () => {
    // 01:00 UTC = 08.00 WIB
    const utcDate = new Date('2026-10-14T01:00:00Z')
    expect(formatTimeWib(utcDate)).toBe('08.00')
  })
})