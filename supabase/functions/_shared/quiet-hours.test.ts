import { describe, it, expect } from 'vitest'
import { isQuietHour, nextAllowedPushTime } from './quiet-hours.ts'

describe('Quiet Hours (Jam Tenang 21.00 - 06.30 WIB)', () => {
  // PRD 15.3:
  // 20.59 WIB -> Bukan jam tenang
  // 21.00 WIB -> Jam tenang
  // 06.29 WIB -> Jam tenang
  // 06.30 WIB -> Bukan jam tenang

  it('20.59 WIB bukan jam tenang (UTC 13:59)', () => {
    const t = new Date('2026-10-14T13:59:00Z')
    expect(isQuietHour(t)).toBe(false)
  })

  it('21.00 WIB adalah jam tenang (UTC 14:00)', () => {
    const t = new Date('2026-10-14T14:00:00Z')
    expect(isQuietHour(t)).toBe(true)
  })

  it('06.29 WIB adalah jam tenang (UTC 23:29)', () => {
    const t = new Date('2026-10-14T23:29:00Z')
    expect(isQuietHour(t)).toBe(true)
  })

  it('06.30 WIB bukan jam tenang (UTC 23:30)', () => {
    const t = new Date('2026-10-14T23:30:00Z')
    expect(isQuietHour(t)).toBe(false)
  })

  it('23.00 WIB (UTC 16:00), nextAllowedPushTime mengembalikan 06.30 WIB hari berikutnya', () => {
    const input = new Date('2026-10-14T16:00:00Z') // 23:00 WIB 14 Okt
    const next = nextAllowedPushTime(input)
    expect(next.toISOString()).toBe('2026-10-14T23:30:00.000Z') // 06:30 WIB 15 Okt
  })

  it('02.00 WIB (UTC 19:00), nextAllowedPushTime mengembalikan 06.30 WIB pada hari yang sama', () => {
    const input = new Date('2026-10-14T19:00:00Z') // 02:00 WIB 15 Okt
    const next = nextAllowedPushTime(input)
    expect(next.toISOString()).toBe('2026-10-14T23:30:00.000Z') // 06:30 WIB 15 Okt
  })

  it('Waktu di luar jam tenang dikembalikan apa adanya', () => {
    const siang = new Date('2026-10-14T05:00:00Z') // 12.00 WIB
    expect(nextAllowedPushTime(siang)).toBe(siang)
  })
})
