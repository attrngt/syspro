import { isQuietHour, nextAllowedPushTime } from './quiet-hours.ts'

export interface SessionReminderState {
  mulaiAt: Date
  cutoffAt: Date
  nextReminderAt: Date | null
  reminderCount: number
  mode: string | null
  status: string
}

export type ReminderAction =
  | { type: 'noop' }
  | { type: 'apply_default' }
  | { type: 'defer_quiet_hours'; nextReminderAt: Date | null }
  | {
      type: 'send_reminder'
      nextReminderAt: Date | null
      newReminderCount: number
    }

const FIVE_HOURS_MS = 5 * 60 * 60 * 1000
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000

export function tanggalWib(d: Date): string {
  const local = new Date(d.getTime() + WIB_OFFSET_MS)
  return local.toISOString().slice(0, 10)
}

/** 06.30 WIB hari berikutnya (PRD A.1.10 langkah 1) */
export function jamPenagihanBerikut(now: Date): Date {
  const local = new Date(now.getTime() + WIB_OFFSET_MS)
  const nextDayUtc = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate() + 1,
    6,
    30,
    0,
    0
  )
  return new Date(nextDayUtc - WIB_OFFSET_MS)
}

/** Logika pengingat sesi reguler ke dosen (PRD 11.3) */
export function evaluateSessionReminder(
  session: SessionReminderState,
  now: Date
): ReminderAction {
  if (session.status !== 'menunggu' || session.mode !== null) {
    return { type: 'noop' }
  }

  if (!session.nextReminderAt || session.nextReminderAt.getTime() > now.getTime()) {
    return { type: 'noop' }
  }

  // 1. Jika sekarang >= cutoff_at -> terapkan default Offline (PRD 11.3)
  if (now.getTime() >= session.cutoffAt.getTime()) {
    return { type: 'apply_default' }
  }

  // 2. Jika sekarang < mulai_at - 24 jam -> lewati
  const windowStartMs = session.mulaiAt.getTime() - TWENTY_FOUR_HOURS_MS
  if (now.getTime() < windowStartMs) {
    return { type: 'noop' }
  }

  // 3. Jika sedang jam tenang -> geser ke 06.30 WIB (atau null jika melewati cutoff)
  if (isQuietHour(now)) {
    const allowed = nextAllowedPushTime(now)
    const nextSlot = allowed.getTime() >= session.cutoffAt.getTime() ? null : allowed
    return { type: 'defer_quiet_hours', nextReminderAt: nextSlot }
  }

  // 4. Kirim pengingat & hitung slot berikutnya (+5 jam)
  let nextCandidate = new Date(now.getTime() + FIVE_HOURS_MS)
  if (isQuietHour(nextCandidate)) {
    nextCandidate = nextAllowedPushTime(nextCandidate)
  }

  const nextReminderAt =
    nextCandidate.getTime() >= session.cutoffAt.getTime() ? null : nextCandidate

  return {
    type: 'send_reminder',
    nextReminderAt,
    newReminderCount: session.reminderCount + 1,
  }
}

export interface TagihanBillingState {
  status: 'menunggu' | 'diajukan' | 'terjadwal' | 'kedaluwarsa' | 'dibatalkan'
  tenggatAt: Date
  nextReminderAt: Date | null
  reminderCount: number
}

export type TagihanBillingAction =
  | { type: 'noop' }
  | { type: 'stop_billing'; nextReminderAt: null }
  | {
      type: 'send_billing'
      nextReminderAt: Date | null
      newReminderCount: number
    }

/** Langkah 1: Penagihan harian tagihan pengganti (PRD A.1.10) */
export function evaluateTagihanBilling(
  tagihan: TagihanBillingState,
  now: Date
): TagihanBillingAction {
  if (tagihan.status !== 'menunggu') {
    return { type: 'noop' }
  }

  if (!tagihan.nextReminderAt || tagihan.nextReminderAt.getTime() > now.getTime()) {
    return { type: 'noop' }
  }

  // Jika now >= tenggat_at -> penagihan harian berhenti
  if (now.getTime() >= tagihan.tenggatAt.getTime()) {
    return { type: 'stop_billing', nextReminderAt: null }
  }

  const berikutnya = jamPenagihanBerikut(now)
  const nextReminderAt =
    tanggalWib(berikutnya) <= tanggalWib(tagihan.tenggatAt) ? berikutnya : null

  return {
    type: 'send_billing',
    nextReminderAt,
    newReminderCount: tagihan.reminderCount + 1,
  }
}

export interface TagihanDeadlineState {
  status: 'menunggu' | 'diajukan' | 'terjadwal' | 'kedaluwarsa' | 'dibatalkan'
  tenggatAt: Date
  tenggatNotifAt: Date | null
}

export type TagihanDeadlineAction =
  | { type: 'noop' }
  | { type: 'notify_missed_deadline' }

/** Langkah 2: Tenggat terlewat (PRD A.1.10) */
export function evaluateTagihanDeadline(
  tagihan: TagihanDeadlineState,
  now: Date
): TagihanDeadlineAction {
  if (
    (tagihan.status === 'menunggu' || tagihan.status === 'diajukan') &&
    now.getTime() >= tagihan.tenggatAt.getTime() &&
    tagihan.tenggatNotifAt === null
  ) {
    return { type: 'notify_missed_deadline' }
  }
  return { type: 'noop' }
}

export interface TagihanExpiryState {
  status: 'menunggu' | 'diajukan' | 'terjadwal' | 'kedaluwarsa' | 'dibatalkan'
  semesterTanggalSelesai: string // 'YYYY-MM-DD'
}

export type TagihanExpiryAction =
  | { type: 'noop' }
  | { type: 'expire_tagihan' }

/** Langkah 3: Kedaluwarsa akhir semester (PRD A.1.10) */
export function evaluateTagihanExpiry(
  tagihan: TagihanExpiryState,
  now: Date
): TagihanExpiryAction {
  if (
    (tagihan.status === 'menunggu' || tagihan.status === 'diajukan') &&
    tagihan.semesterTanggalSelesai < tanggalWib(now)
  ) {
    return { type: 'expire_tagihan' }
  }
  return { type: 'noop' }
}