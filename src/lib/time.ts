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

/** Format lengkap tanggal dan jam ke Bahasa Indonesia */
export function formatDateTimeId(isoOrDate: string | Date): string {
  const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate
  const tgl = new Intl.DateTimeFormat('id-ID', {
    timeZone: WIB_TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
  const jam = formatTimeWib(date)
  return `${tgl}, ${jam} WIB`
}

/** Format tanggal ke YYYY-MM-DD dalam zona Asia/Jakarta */
export function toDateStringWib(isoOrDate: string | Date): string {
  const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate
  return date.toLocaleDateString('en-CA', { timeZone: WIB_TIMEZONE })
}