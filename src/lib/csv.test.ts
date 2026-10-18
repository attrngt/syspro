import { describe, it, expect } from 'vitest'
import { parseMembersCsv } from './csv'

describe('parseMembersCsv', () => {
  it('melewati baris header dan mem-parsing baris anggota dengan benar', () => {
    const raw = `kode,nama,peran,nim_nidn\n9000000001,Budi,mahasiswa,2401001\n9000000002,Siti,Dosen,001122`
    const result = parseMembersCsv(raw)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      kode: '9000000001',
      nama: 'Budi',
      peran: 'mahasiswa',
      nim_nidn: '2401001',
    })
    expect(result[1]?.peran).toBe('dosen')
  })
})