import { copy } from './copy'

export function mapErrorMessage(err: unknown): string {
  if (!err) return copy.errors.generik
  const msg = typeof err === 'string' ? err : (err as { message?: string })?.message ?? ''

  if (msg.includes('Sesi sudah dikunci')) return copy.errors.sesiTerkunci
  if (msg.includes('Tidak diizinkan')) return copy.errors.tidakDiizinkan
  if (msg.includes('Jadwal bentrok dengan kelas lain dosen')) return copy.errors.bentrokDosen
  if (msg.includes('Jadwal bentrok dengan kelas lain mahasiswa')) return copy.errors.bentrokMahasiswa
  if (msg.includes('Kelas pengganti minimal dijadwalkan 2 jam dari sekarang'))
    return copy.errors.minimalDuaJam
  if (msg.includes('Kelas pengganti harus sebelum akhir semester'))
    return copy.errors.sebelumAkhirSemester
  if (msg.includes('Tanggal tersebut hari libur perkuliahan')) return copy.errors.tanggalLiburKuliah
  if (msg.includes('Isi ruangan atau link online')) return copy.errors.ruanganAtauLinkWajib
  if (msg.includes('Alasan penolakan wajib diisi')) return copy.errors.alasanTolakWajib
  if (msg.includes('Alasan pemindahan kelompok wajib diisi')) return copy.errors.alasanPindahWajib
  if (msg.includes('Kelas pengganti sudah dijadwalkan')) return copy.errors.penggantiSudahDijadwalkan
  if (msg.includes('Jadwal semester ini sudah dibuat')) return copy.errors.jadwalSudahDibuat
  if (msg.includes('Jadwal hanya bisa dibuat sebelum semester dimulai'))
    return copy.errors.jadwalHanyaSebelumMulai

  return msg || copy.errors.generik
}
