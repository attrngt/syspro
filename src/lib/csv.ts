export interface MemberCsvRow {
  kode: string
  nama: string
  peran: string
  nim_nidn?: string
}

export function parseMembersCsv(csvText: string): MemberCsvRow[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length === 0) return []

  const firstLineLower = lines[0].toLowerCase()
  const startIndex = firstLineLower.includes('kode') && firstLineLower.includes('nama') ? 1 : 0

  const rows: MemberCsvRow[] = []
  for (let i = startIndex; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim())
    rows.push({
      kode: cols[0] ?? '',
      nama: cols[1] ?? '',
      peran: (cols[2] ?? '').toLowerCase(),
      nim_nidn: cols[3] ? cols[3] : undefined,
    })
  }

  return rows
}