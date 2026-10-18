const WIB_OFFSET_MS = 7 * 60 * 60 * 1000
const QUIET_START_MIN = 21 * 60 // 21:00 WIB
const QUIET_END_MIN = 6 * 60 + 30 // 06:30 WIB
const DAY_MS = 24 * 60 * 60 * 1000

function menitWib(t: Date): number {
  const local = new Date(t.getTime() + WIB_OFFSET_MS)
  return local.getUTCHours() * 60 + local.getUTCMinutes()
}

export function isQuietHour(t: Date): boolean {
  const m = menitWib(t)
  return m >= QUIET_START_MIN || m < QUIET_END_MIN
}

/** Waktu paling awal setelah t yang boleh mengirim push (06.30 WIB). */
export function nextAllowedPushTime(t: Date): Date {
  if (!isQuietHour(t)) return t

  const local = new Date(t.getTime() + WIB_OFFSET_MS)
  let target = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate(),
    6,
    30,
    0,
    0
  )
  if (menitWib(t) >= QUIET_START_MIN) {
    target += DAY_MS
  }

  return new Date(target - WIB_OFFSET_MS)
}