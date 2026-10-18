const WIB_TIMEZONE = 'Asia/Jakarta'

/** Format jam ke HH.mm WIB (contoh: "08.00") sesuai PRD */
export function formatTimeWib(isoOrDate: string | Date): string {
  const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: WIB_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace(':', '.')
}

/** Format tanggal ke Bahasa Indonesia (contoh: "Rabu, 14 Okt") */
export function formatDateWib(isoOrDate: string | Date): string {
  const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: WIB_TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }).format(date)
}