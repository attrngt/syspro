import { describe, it, expect } from 'vitest'
import { formatTimeWib, formatDateWib, formatDateTimeId, toDateStringWib } from './time'

describe('formatTimeWib', () => {
  it('mengonversi waktu UTC ke format HH.mm WIB (UTC+7)', () => {
    const utcDate = new Date('2026-10-14T01:00:00Z')
    expect(formatTimeWib(utcDate)).toBe('08.00')
  })

  it('memformat tanggal ke nama hari dan tanggal pendek WIB', () => {
    const utcDate = new Date('2026-10-14T01:00:00Z')
    const formatted = formatDateWib(utcDate)
    expect(formatted).toContain('14')
  })

  it('memformat tanggal lengkap beserta jam WIB', () => {
    const utcDate = new Date('2026-10-14T01:00:00Z')
    const formatted = formatDateTimeId(utcDate)
    expect(formatted).toContain('08.00 WIB')
  })

  it('toDateStringWib mengembalikan string YYYY-MM-DD dalam WIB', () => {
    const utcDate = new Date('2026-10-14T18:00:00Z') // 15 Okt 01.00 WIB
    expect(toDateStringWib(utcDate)).toBe('2026-10-15')
  })
})