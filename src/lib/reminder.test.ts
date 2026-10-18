import { describe, it, expect } from 'vitest'
import { isQuietHour, nextAllowedPushTime } from '../../supabase/functions/_shared/quiet-hours'
import { evaluateSessionReminder } from '../../supabase/functions/_shared/reminder-policy'

describe('Jam Tenang (quiet-hours)', () => {
  it('20.59 WIB bukan jam tenang, 21.00 WIB adalah jam tenang', () => {
    expect(isQuietHour(new Date('2026-10-14T13:59:00Z'))).toBe(false)
    expect(isQuietHour(new Date('2026-10-14T14:00:00Z'))).toBe(true)
  })

  it('06.29 WIB adalah jam tenang, 06.30 WIB bukan jam tenang', () => {
    expect(isQuietHour(new Date('2026-10-14T23:29:00Z'))).toBe(true)
    expect(isQuietHour(new Date('2026-10-14T23:30:00Z'))).toBe(false)
  })

  it('23.00 WIB hari D digeser ke 06.30 WIB hari D+1', () => {
    const input = new Date('2026-10-14T16:00:00Z') // 23:00 WIB
    const next = nextAllowedPushTime(input)
    expect(next.toISOString()).toBe('2026-10-14T23:30:00.000Z') // 06:30 WIB besoknya
  })
})

describe('Kebijakan Pengingat (reminder-policy)', () => {
  const mulaiAt = new Date('2026-10-15T01:00:00Z') // Kamis 08.00 WIB
  const cutoffAt = new Date('2026-10-15T00:00:00Z') // Kamis 07.00 WIB

  it('Sesi 08.00 WIB, sekarang H-1 08.00 WIB -> pengingat pertama dibuat', () => {
    const now = new Date('2026-10-14T01:00:00Z') // Rabu 08.00 WIB
    const res = evaluateSessionReminder(
      {
        mulaiAt,
        cutoffAt,
        nextReminderAt: now,
        reminderCount: 0,
        mode: null,
        status: 'menunggu',
      },
      now
    )
    expect(res.type).toBe('send_reminder')
    if (res.type === 'send_reminder') {
      expect(res.newReminderCount).toBe(1)
      expect(res.nextReminderAt?.toISOString()).toBe('2026-10-14T06:00:00.000Z') // 13.00 WIB
    }
  })

  it('Sesi 08.00 WIB, sekarang H-1 23.00 WIB -> digeser ke 06.30 WIB tanpa kirim', () => {
    const now = new Date('2026-10-14T16:00:00Z') // Rabu 23.00 WIB
    const res = evaluateSessionReminder(
      {
        mulaiAt,
        cutoffAt,
        nextReminderAt: now,
        reminderCount: 3,
        mode: null,
        status: 'menunggu',
      },
      now
    )
    expect(res.type).toBe('defer_quiet_hours')
    if (res.type === 'defer_quiet_hours') {
      expect(res.nextReminderAt?.toISOString()).toBe('2026-10-14T23:30:00.000Z') // Kamis 06.30 WIB
    }
  })

  it('Sesi 08.00 WIB, sekarang H 07.00 WIB (cutoff) -> default Offline diterapkan', () => {
    const now = new Date('2026-10-15T00:00:00Z') // Kamis 07.00 WIB
    const res = evaluateSessionReminder(
      {
        mulaiAt,
        cutoffAt,
        nextReminderAt: now,
        reminderCount: 4,
        mode: null,
        status: 'menunggu',
      },
      now
    )
    expect(res.type).toBe('apply_default')
  })

  it('Sesi jam 06.00 WIB, cutoff 05.00 WIB, masuk jam tenang -> tidak ada pengingat karena 06.30 melewati cutoff', () => {
    const mulaiPagi = new Date('2026-10-14T23:00:00Z') // 06.00 WIB
    const cutoffPagi = new Date('2026-10-14T22:00:00Z') // 05.00 WIB
    const now = new Date('2026-10-14T15:00:00Z') // 22.00 WIB malam sebelumnya
    const res = evaluateSessionReminder(
      {
        mulaiAt: mulaiPagi,
        cutoffAt: cutoffPagi,
        nextReminderAt: now,
        reminderCount: 1,
        mode: null,
        status: 'menunggu',
      },
      now
    )
    expect(res.type).toBe('defer_quiet_hours')
    if (res.type === 'defer_quiet_hours') {
      expect(res.nextReminderAt).toBeNull()
    }
  })
})