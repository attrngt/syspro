import { describe, it, expect } from 'vitest'
import {
  evaluateSessionReminder,
  evaluateTagihanBilling,
  evaluateTagihanDeadline,
  evaluateTagihanExpiry,
  jamPenagihanBerikut,
  tanggalWib,
} from './reminder-policy.ts'

describe('Session Reminder Policy (PRD 11.3 & 15.3)', () => {
  const mulaiAt = new Date('2026-10-15T01:00:00Z') // Kamis 08.00 WIB
  const cutoffAt = new Date('2026-10-15T00:00:00Z') // Kamis 07.00 WIB

  it('Sesi 08.00 WIB, sekarang H-1 08.00 WIB -> pengingat pertama dibuat (+5 jam)', () => {
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

  it('Sesi dibuat 10 jam sebelum mulai, jam 15.00 WIB -> pengingat pertama segera', () => {
    const mulaiMalam = new Date('2026-10-15T12:00:00Z') // 19.00 WIB
    const cutoffMalam = new Date('2026-10-15T11:00:00Z') // 18.00 WIB
    const now = new Date('2026-10-15T08:00:00Z') // 15.00 WIB (4 jam sebelum mulai)
    const res = evaluateSessionReminder(
      {
        mulaiAt: mulaiMalam,
        cutoffAt: cutoffMalam,
        nextReminderAt: now,
        reminderCount: 0,
        mode: null,
        status: 'menunggu',
      },
      now
    )
    expect(res.type).toBe('send_reminder')
  })

  it('Sesi dibuat 10 jam sebelum mulai, jam 22.00 WIB -> defer ke 06.30 WIB', () => {
    const mulaiBesok = new Date('2026-10-15T01:00:00Z') // 08.00 WIB
    const cutoffBesok = new Date('2026-10-15T00:00:00Z') // 07.00 WIB
    const now = new Date('2026-10-14T15:00:00Z') // 22.00 WIB malam
    const res = evaluateSessionReminder(
      {
        mulaiAt: mulaiBesok,
        cutoffAt: cutoffBesok,
        nextReminderAt: now,
        reminderCount: 0,
        mode: null,
        status: 'menunggu',
      },
      now
    )
    expect(res.type).toBe('defer_quiet_hours')
    if (res.type === 'defer_quiet_hours') {
      expect(res.nextReminderAt?.toISOString()).toBe('2026-10-14T23:30:00.000Z') // 06.30 WIB
    }
  })

  it('Sesi jam 06.00 WIB, cutoff 05.00 WIB -> slot 06.30 melewati cutoff sehingga nextReminderAt = null', () => {
    const mulaiPagi = new Date('2026-10-14T23:00:00Z') // 06.00 WIB
    const cutoffPagi = new Date('2026-10-14T22:00:00Z') // 05.00 WIB
    const now = new Date('2026-10-14T15:00:00Z') // 22.00 WIB malam
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

  it('Sesi status dibatalkan -> noop', () => {
    const now = new Date('2026-10-14T01:00:00Z')
    const res = evaluateSessionReminder(
      {
        mulaiAt,
        cutoffAt,
        nextReminderAt: now,
        reminderCount: 0,
        mode: null,
        status: 'dibatalkan',
      },
      now
    )
    expect(res.type).toBe('noop')
  })

  it('Sesi sudah memiliki mode (terkonfirmasi) -> noop', () => {
    const now = new Date('2026-10-14T01:00:00Z')
    const res = evaluateSessionReminder(
      {
        mulaiAt,
        cutoffAt,
        nextReminderAt: now,
        reminderCount: 1,
        mode: 'online',
        status: 'terkonfirmasi',
      },
      now
    )
    expect(res.type).toBe('noop')
  })
})

describe('Tagihan Pengganti Billing Policy (PRD A.1.10 & A.1.12)', () => {
  const tenggatAt = new Date('2026-11-01T01:00:00Z') // 1 Nov 08.00 WIB

  it('tanggalWib mengembalikan tanggal YYYY-MM-DD dalam zona Asia/Jakarta', () => {
    const t = new Date('2026-10-14T17:00:00Z') // 15 Okt 00.00 WIB
    expect(tanggalWib(t)).toBe('2026-10-15')
  })

  it('jamPenagihanBerikut mengembalikan 06.30 WIB hari berikutnya', () => {
    const now = new Date('2026-10-14T03:00:00Z') // 14 Okt 10.00 WIB
    const next = jamPenagihanBerikut(now)
    expect(tanggalWib(next)).toBe('2026-10-15')
    expect(next.toISOString()).toBe('2026-10-14T23:30:00.000Z') // 06.30 WIB 15 Okt
  })

  it('Langkah 1: Penagihan harian mengirim reminder dan menjadwalkan 06.30 WIB hari berikutnya', () => {
    const now = new Date('2026-10-15T23:30:00Z') // 16 Okt 06.30 WIB
    const res = evaluateTagihanBilling(
      {
        status: 'menunggu',
        tenggatAt,
        nextReminderAt: now,
        reminderCount: 1,
      },
      now
    )
    expect(res.type).toBe('send_billing')
    if (res.type === 'send_billing') {
      expect(res.newReminderCount).toBe(2)
      expect(res.nextReminderAt).not.toBeNull()
      expect(tanggalWib(res.nextReminderAt!)).toBe('2026-10-17')
    }
  })

  it('Langkah 1: Penagihan harian berhenti jika now >= tenggat_at', () => {
    const now = new Date('2026-11-01T01:30:00Z') // 1 Nov 08.30 WIB (lewat tenggat)
    const res = evaluateTagihanBilling(
      {
        status: 'menunggu',
        tenggatAt,
        nextReminderAt: now,
        reminderCount: 10,
      },
      now
    )
    expect(res.type).toBe('stop_billing')
    if (res.type === 'stop_billing') {
      expect(res.nextReminderAt).toBeNull()
    }
  })

  it('Langkah 1: Tagihan status bukan menunggu (misal diajukan) -> noop', () => {
    const now = new Date('2026-10-15T23:30:00Z')
    const res = evaluateTagihanBilling(
      {
        status: 'diajukan',
        tenggatAt,
        nextReminderAt: now,
        reminderCount: 2,
      },
      now
    )
    expect(res.type).toBe('noop')
  })

  it('Langkah 2: Tenggat terlewat memicu notifikasi jika belum pernah dinotifikasi', () => {
    const now = new Date('2026-11-01T02:00:00Z') // Lewat tenggat
    const res = evaluateTagihanDeadline(
      {
        status: 'menunggu',
        tenggatAt,
        tenggatNotifAt: null,
      },
      now
    )
    expect(res.type).toBe('notify_missed_deadline')
  })

  it('Langkah 2: Tenggat terlewat tidak memicu notifikasi ganda jika sudah ada tenggat_notif_at', () => {
    const now = new Date('2026-11-01T02:00:00Z')
    const res = evaluateTagihanDeadline(
      {
        status: 'menunggu',
        tenggatAt,
        tenggatNotifAt: new Date('2026-11-01T01:05:00Z'),
      },
      now
    )
    expect(res.type).toBe('noop')
  })

  it('Langkah 3: Tagihan kedaluwarsa setelah tanggal_selesai semester terlewati', () => {
    const now = new Date('2027-02-01T00:00:00Z')
    const res = evaluateTagihanExpiry(
      {
        status: 'menunggu',
        semesterTanggalSelesai: '2027-01-31',
      },
      now
    )
    expect(res.type).toBe('expire_tagihan')
  })

  it('Langkah 3: Tagihan belum kedaluwarsa sebelum akhir semester', () => {
    const now = new Date('2026-12-01T00:00:00Z')
    const res = evaluateTagihanExpiry(
      {
        status: 'menunggu',
        semesterTanggalSelesai: '2027-01-31',
      },
      now
    )
    expect(res.type).toBe('noop')
  })
})
