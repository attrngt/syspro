import { useState, useMemo, type ChangeEvent } from 'react'
import { parseMembersCsv } from '../../../lib/csv'
import {
  useMembers,
  useImportMembers,
  useToggleMemberActive,
  useResetMemberAccess,
  useMoveStudentGroup,
  type MemberItem,
} from './useMembers'
import { useCohorts, useStudentGroups } from '../cohorts/useCohorts'
import { copy } from '../../../lib/copy'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import { Card } from '../../../components/ui/Card'
import { Modal } from '../../../components/ui/Modal'
import { Select } from '../../../components/ui/Select'

export function MembersPage() {
  const { data: members, isLoading } = useMembers()
  const { data: cohorts } = useCohorts()
  const { data: studentGroups } = useStudentGroups()

  const importMutation = useImportMembers()
  const toggleActiveMutation = useToggleMemberActive()
  const resetMutation = useResetMemberAccess()
  const moveGroupMutation = useMoveStudentGroup()

  const [csvText, setCsvText] = useState('')
  const [statusMsg, setStatusMsg] = useState<{ text: string; isError?: boolean } | null>(null)

  // Filter
  const [filterRole, setFilterRole] = useState<'semua' | 'dosen' | 'mahasiswa'>('semua')
  const [filterCohortId, setFilterCohortId] = useState<string>('')
  const [filterGroupId, setFilterGroupId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  // Modal Pindah Kelompok
  const [movingMember, setMovingMember] = useState<{
    member: MemberItem
    profileId: string
    currentGroupId: string | null
  } | null>(null)
  const [newGroupId, setNewGroupId] = useState('')
  const [pindahAlasan, setPindahAlasan] = useState('')
  const [pindahError, setPindahError] = useState<string | null>(null)

  // Modal Reset Akses
  const [resettingMember, setResettingMember] = useState<MemberItem | null>(null)
  const [resetAlasan, setResetAlasan] = useState('')
  const [resetError, setResetError] = useState<string | null>(null)

  function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setCsvText(String(ev.target?.result ?? ''))
    }
    reader.readAsText(file)
  }

  function handleImport() {
    setStatusMsg(null)
    const rows = parseMembersCsv(csvText)
    if (rows.length === 0) {
      setStatusMsg({ text: 'CSV kosong atau format tidak valid.', isError: true })
      return
    }
    importMutation.mutate(rows, {
      onSuccess: (res) => {
        let msg = `Berhasil mengimpor ${res.berhasil} anggota.`
        if (res.gagal.length > 0) {
          msg += ` Gagal ${res.gagal.length} baris: ${res.gagal.map((g) => `Baris ${g.baris} (${g.alasan})`).slice(0, 3).join(', ')}`
        }
        setStatusMsg({ text: msg, isError: res.gagal.length > 0 && res.berhasil === 0 })
        setCsvText('')
      },
      onError: (err) => setStatusMsg({ text: err.message, isError: true }),
    })
  }

  function handleMoveGroupSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPindahError(null)
    if (!movingMember) return
    if (!newGroupId) {
      setPindahError('Pilih kelompok tujuan.')
      return
    }
    if (!pindahAlasan.trim()) {
      setPindahError('Alasan perpindahan kelompok wajib diisi.')
      return
    }

    moveGroupMutation.mutate(
      {
        profileId: movingMember.profileId,
        groupId: newGroupId,
        alasan: pindahAlasan.trim(),
      },
      {
        onSuccess: () => {
          setMovingMember(null)
          setNewGroupId('')
          setPindahAlasan('')
        },
        onError: (err) => setPindahError(err.message),
      }
    )
  }

  function handleResetAccessSubmit(e: React.FormEvent) {
    e.preventDefault()
    setResetError(null)
    if (!resettingMember) return
    if (!resetAlasan.trim()) {
      setResetError('Alasan reset akses wajib diisi.')
      return
    }

    resetMutation.mutate(
      {
        memberId: resettingMember.id,
        alasan: resetAlasan.trim(),
      },
      {
        onSuccess: () => {
          setResettingMember(null)
          setResetAlasan('')
        },
        onError: (err) => setResetError(err.message),
      }
    )
  }

  // Statistik per kelompok
  const groupStats = useMemo(() => {
    if (!members) return {}
    const counts: Record<string, number> = {}
    for (const m of members) {
      if (m.peran === 'mahasiswa') {
        const group = m.profiles?.[0]?.student_groups
        const label = group
          ? `${group.cohorts?.tahun ?? ''} ${group.nama}`.trim()
          : 'Belum Ada Kelompok'
        counts[label] = (counts[label] ?? 0) + 1
      }
    }
    return counts
  }, [members])

  // Filtered members
  const filteredMembers = useMemo(() => {
    if (!members) return []
    return members.filter((m) => {
      if (filterRole !== 'semua' && m.peran !== filterRole) return false

      const prof = m.profiles?.[0]
      if (filterCohortId) {
        if (prof?.student_groups?.cohorts?.id !== filterCohortId) return false
      }
      if (filterGroupId) {
        if (prof?.group_id !== filterGroupId) return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = m.nama.toLowerCase().includes(q)
        const matchKode = m.kode.includes(q)
        const matchNim = (m.nim_nidn ?? '').toLowerCase().includes(q)
        if (!matchName && !matchKode && !matchNim) return false
      }
      return true
    })
  }, [members, filterRole, filterCohortId, filterGroupId, searchQuery])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{copy.admin.members.title}</h1>
        <p className="text-sm text-neutral-600 mt-1">{copy.admin.members.subtitle}</p>
      </div>

      {/* CSV Import */}
      <Card className="max-w-3xl space-y-4">
        <div>
          <h2 className="font-bold text-base text-neutral-900">{copy.admin.members.importCsv}</h2>
          <p className="text-xs text-neutral-600 mt-0.5">
            Format 6 kolom: <code className="font-mono bg-neutral-100 px-1 py-0.5 rounded">kode,nama,peran,nim_nidn,angkatan,kelas</code>
          </p>
          <p className="text-xs text-neutral-500 mt-0.5">
            Contoh Mahasiswa: <code className="font-mono bg-neutral-100 px-1 py-0.5 rounded">9000000013,Rina Wati,mahasiswa,2401011,2025,A</code>
            <br />
            Contoh Dosen: <code className="font-mono bg-neutral-100 px-1 py-0.5 rounded">1000000001,Dr. Budi Santoso,dosen,00123456,,</code>
          </p>
        </div>

        <div className="space-y-3">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileUpload}
            className="block text-sm text-neutral-700 file:mr-4 file:py-2 file:px-4 file:border file:border-neutral-900 file:text-xs file:font-semibold file:bg-white hover:file:bg-neutral-100 file:cursor-pointer"
          />

          <textarea
            rows={3}
            placeholder="kode,nama,peran,nim_nidn,angkatan,kelas&#10;9000000013,Rina Wati,mahasiswa,2401011,2025,A"
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            className="w-full p-3 border border-neutral-300 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900"
          />

          {statusMsg && (
            <p
              className={`text-sm font-medium ${
                statusMsg.isError ? 'text-red-600' : 'text-emerald-700'
              }`}
            >
              {statusMsg.text}
            </p>
          )}

          <Button
            onClick={handleImport}
            loading={importMutation.isPending}
            disabled={!csvText.trim()}
          >
            {copy.admin.members.importButton}
          </Button>
        </div>
      </Card>

      {/* Statistik Kelompok */}
      <Card className="p-4 space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
          Statistik Mahasiswa per Kelompok
        </h3>
        <div className="flex flex-wrap gap-2 pt-1">
          {Object.entries(groupStats).length === 0 ? (
            <span className="text-xs text-neutral-400">Belum ada data mahasiswa.</span>
          ) : (
            Object.entries(groupStats).map(([groupName, count]) => (
              <span
                key={groupName}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-100 border border-neutral-200 text-xs font-medium text-neutral-800"
              >
                <span>{groupName}:</span>
                <span className="font-bold text-neutral-900">{count} orang</span>
              </span>
            ))
          )}
        </div>
      </Card>

      {/* Filter & Pencarian */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-48">
          <Select
            label=""
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as 'semua' | 'dosen' | 'mahasiswa')}
          >
            <option value="semua">Semua Peran</option>
            <option value="dosen">Dosen</option>
            <option value="mahasiswa">Mahasiswa</option>
          </Select>
        </div>

        {filterRole !== 'dosen' && (
          <>
            <div className="w-48">
              <Select
                label=""
                value={filterCohortId}
                onChange={(e) => {
                  setFilterCohortId(e.target.value)
                  setFilterGroupId('')
                }}
              >
                <option value="">Semua Angkatan</option>
                {cohorts?.map((c) => (
                  <option key={c.id} value={c.id}>
                    Angkatan {c.tahun}
                  </option>
                ))}
              </Select>
            </div>

            <div className="w-48">
              <Select
                label=""
                value={filterGroupId}
                onChange={(e) => setFilterGroupId(e.target.value)}
              >
                <option value="">Semua Kelompok</option>
                {studentGroups
                  ?.filter((g) => !filterCohortId || g.cohort_id === filterCohortId)
                  .map((g) => (
                    <option key={g.id} value={g.id}>
                      Kelas {g.cohorts?.tahun} {g.nama}
                    </option>
                  ))}
              </Select>
            </div>
          </>
        )}

        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Cari kode, nama, atau NIM/NIDN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-11 px-3 border border-neutral-300 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
          />
        </div>
      </div>

      {/* Tabel Anggota */}
      <div className="border border-neutral-200 bg-white overflow-x-auto shadow-sm">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-700 text-xs uppercase tracking-wider">
              <th className="p-3.5 font-bold">Kode</th>
              <th className="p-3.5 font-bold">Nama</th>
              <th className="p-3.5 font-bold">Peran</th>
              <th className="p-3.5 font-bold">NIM/NIDN</th>
              <th className="p-3.5 font-bold">Kelompok</th>
              <th className="p-3.5 font-bold">Status Akun</th>
              <th className="p-3.5 font-bold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-150">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-neutral-500">
                  Memuat data anggota...
                </td>
              </tr>
            ) : filteredMembers.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-neutral-500">
                  Tidak ada anggota yang sesuai dengan filter.
                </td>
              </tr>
            ) : (
              filteredMembers.map((m) => {
                const profile = m.profiles?.[0]
                const group = profile?.student_groups
                const groupLabel = group ? `${group.cohorts?.tahun ?? ''} ${group.nama}` : '-'

                return (
                  <tr key={m.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="p-3.5 font-mono text-xs font-semibold text-neutral-900">{m.kode}</td>
                    <td className="p-3.5 font-medium text-neutral-900">{m.nama}</td>
                    <td className="p-3.5">
                      <Badge variant={m.peran === 'dosen' ? 'default' : 'outline'} size="sm">
                        {m.peran === 'dosen' ? 'Dosen' : 'Mahasiswa'}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-neutral-600 text-xs font-mono">{m.nim_nidn ?? '-'}</td>
                    <td className="p-3.5">
                      {m.peran === 'mahasiswa' ? (
                        <span className="font-medium text-neutral-800 text-xs">
                          {group ? `Kelas ${groupLabel}` : <span className="text-neutral-400">Belum ada</span>}
                        </span>
                      ) : (
                        <span className="text-neutral-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      {!m.aktif ? (
                        <Badge variant="secondary" size="sm">Nonaktif</Badge>
                      ) : m.activated_at ? (
                        <Badge variant="success" size="sm">Aktif</Badge>
                      ) : (
                        <Badge variant="warning" size="sm">Belum Aktivasi</Badge>
                      )}
                    </td>
                    <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                      {m.peran === 'mahasiswa' && profile && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setMovingMember({
                              member: m,
                              profileId: profile.id,
                              currentGroupId: profile.group_id,
                            })
                            setNewGroupId(profile.group_id ?? '')
                            setPindahAlasan('')
                            setPindahError(null)
                          }}
                        >
                          Pindah Kelompok
                        </Button>
                      )}
                      <Button
                        variant={m.aktif ? 'secondary' : 'default'}
                        size="sm"
                        onClick={() => toggleActiveMutation.mutate({ id: m.id, aktif: !m.aktif })}
                      >
                        {m.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                      </Button>
                      {m.activated_at && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            setResettingMember(m)
                            setResetAlasan('')
                            setResetError(null)
                          }}
                        >
                          Reset Akses
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Pindah Kelompok */}
      {movingMember && (
        <Modal
          isOpen={true}
          onClose={() => setMovingMember(null)}
          title={`Pindah Kelompok: ${movingMember.member.nama}`}
        >
          <form onSubmit={handleMoveGroupSubmit} className="space-y-4">
            <p className="text-xs text-neutral-600">
              Perpindahan kelompok akan menghapus enrollment kelas kelompok lama yang belum mulai,
              dan meng-enroll mahasiswa ke seluruh kelas kelompok baru secara otomatis.
            </p>

            <Select
              label="Pilih Kelompok Baru"
              value={newGroupId}
              onChange={(e) => setNewGroupId(e.target.value)}
              required
            >
              <option value="">-- Pilih Kelompok Tujuan --</option>
              {studentGroups?.map((g) => (
                <option key={g.id} value={g.id}>
                  Kelas {g.cohorts?.tahun} {g.nama}
                </option>
              ))}
            </Select>

            <div>
              <label className="block text-sm font-semibold text-neutral-800 mb-1">
                Alasan Perpindahan (Wajib)
              </label>
              <textarea
                rows={3}
                placeholder="Contoh: Permintaan mahasiswa karena penyesuaian jadwal magang."
                value={pindahAlasan}
                onChange={(e) => setPindahAlasan(e.target.value)}
                className="w-full p-2.5 border border-neutral-300 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                required
              />
            </div>

            {pindahError && <p className="text-sm text-red-600 font-medium">{pindahError}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setMovingMember(null)}>
                Batal
              </Button>
              <Button type="submit" loading={moveGroupMutation.isPending}>
                Simpan Perpindahan
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Reset Akses */}
      {resettingMember && (
        <Modal
          isOpen={true}
          onClose={() => setResettingMember(null)}
          title={`Reset Akses: ${resettingMember.nama}`}
        >
          <form onSubmit={handleResetAccessSubmit} className="space-y-4">
            <p className="text-xs text-neutral-600">
              Akun login anggota ini akan dihapus dari Supabase Auth dan status aktivasi dikosongkan.
              Anggota dapat mengulang proses aktivasi dengan kode 10 digit mereka.
            </p>

            <div>
              <label className="block text-sm font-semibold text-neutral-800 mb-1">
                Alasan Reset Akses (Wajib)
              </label>
              <textarea
                rows={3}
                placeholder="Contoh: Lupa password dan verifikasi identitas telah dikonfirmasi."
                value={resetAlasan}
                onChange={(e) => setResetAlasan(e.target.value)}
                className="w-full p-2.5 border border-neutral-300 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                required
              />
            </div>

            {resetError && <p className="text-sm text-red-600 font-medium">{resetError}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setResettingMember(null)}>
                Batal
              </Button>
              <Button type="submit" variant="danger" loading={resetMutation.isPending}>
                Konfirmasi Reset Akses
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}