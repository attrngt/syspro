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