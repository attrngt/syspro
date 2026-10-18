import { useState, type FormEvent } from 'react'
import {
  useClasses,
  useProfilesByRole,
  useCreateClasses,
  useDeleteClass,
  useAddSchedule,
  useDeleteSchedule,
  useEnrollStudent,
  useUnenrollStudent,
} from './useClasses'
import { useCourses } from '../courses/useCourses'
import { useSemesters } from '../semesters/useSemesters'
import { useStudentGroups } from '../cohorts/useCohorts'
import { copy } from '../../../lib/copy'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import { Card } from '../../../components/ui/Card'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'

const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

export function ClassesPage() {
  const { data: classes, isLoading } = useClasses()
  const { data: courses } = useCourses()
  const { data: semesters } = useSemesters()
  const { data: studentGroups } = useStudentGroups()
  const { data: lecturers } = useProfilesByRole('dosen')
  const { data: students } = useProfilesByRole('mahasiswa')

  const createClassesMutation = useCreateClasses()
  const deleteClassMutation = useDeleteClass()
  const addScheduleMutation = useAddSchedule()
  const deleteScheduleMutation = useDeleteSchedule()
  const enrollMutation = useEnrollStudent()
  const unenrollMutation = useUnenrollStudent()

  const [semesterId, setSemesterId] = useState('')
  const [courseId, setCourseId] = useState('')
  const [dosenId, setDosenId] = useState('')
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])
  const [jumlahPertemuan, setJumlahPertemuan] = useState(16)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [hari, setHari] = useState('1')
  const [jamMulai, setJamMulai] = useState('08:00')
  const [jamSelesai, setJamSelesai] = useState('10:30')
  const [mahasiswaId, setMahasiswaId] = useState('')

  function handleGroupToggle(groupId: string) {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    )
  }

  function handleCreateClasses(e: FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)
    if (!semesterId || !courseId || !dosenId) {
      setErrorMsg('Semester, mata kuliah, dan dosen pengampu wajib dipilih.')
      return
    }
    if (selectedGroupIds.length === 0) {
      setErrorMsg('Pilih minimal satu kelompok mahasiswa.')
      return
    }

    createClassesMutation.mutate(
      {
        semester_id: semesterId,
        course_id: courseId,
        dosen_id: dosenId,
        group_ids: selectedGroupIds,
        jumlah_pertemuan: jumlahPertemuan,
      },
      {
        onSuccess: () => {
          setSuccessMsg(`Berhasil membuka ${selectedGroupIds.length} kelas. Mahasiswa kelompok ter-enroll otomatis.`)
          setSelectedGroupIds([])
        },
        onError: (err) => setErrorMsg(err.message),
      }
    )
  }

  function handleAddSchedule(e: FormEvent, classId: string) {
    e.preventDefault()
    if (jamSelesai <= jamMulai) {
      setErrorMsg('Jam selesai harus setelah jam mulai.')
      return
    }
    addScheduleMutation.mutate(
      {
        class_id: classId,
        hari: Number(hari),
        jam_mulai: jamMulai,
        jam_selesai: jamSelesai,
      },
      { onError: (err) => setErrorMsg(err.message) }
    )
  }

  function handleEnrollManual(e: FormEvent, classId: string) {
    e.preventDefault()
    if (!mahasiswaId) return
    enrollMutation.mutate(
      { class_id: classId, mahasiswa_id: mahasiswaId, sumber: 'manual' },
      {
        onSuccess: () => {
          setMahasiswaId('')
        },
        onError: (err) => setErrorMsg(err.message),
      }
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{copy.admin.classes.title}</h1>
        <p className="text-sm text-neutral-600 mt-1">{copy.admin.classes.subtitle}</p>
      </div>

      <Card className="max-w-3xl space-y-5">
        <div>
          <h2 className="font-bold text-base text-neutral-900">{copy.admin.classes.newClass}</h2>
          <p className="text-xs text-neutral-600 mt-0.5">
            Anda dapat memilih beberapa kelompok sekaligus untuk membuat kelas paralel secara serentak.
          </p>
        </div>

        <form onSubmit={handleCreateClasses} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Semester"
              value={semesterId}
              onChange={(e) => setSemesterId(e.target.value)}
              required
            >
              <option value="">-- Pilih Semester --</option>
              {semesters?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama} {s.aktif ? '(Aktif)' : ''}
                </option>
              ))}
            </Select>

            <Select
              label="Mata Kuliah"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              required
            >
              <option value="">-- Pilih Mata Kuliah --</option>
              {courses?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.kode} - {c.nama} ({c.sks} SKS)
                </option>
              ))}
            </Select>

            <Select
              label="Dosen Pengampu"
              value={dosenId}
              onChange={(e) => setDosenId(e.target.value)}
              required
            >
              <option value="">-- Pilih Dosen --</option>
              {lecturers?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nama}
                </option>
              ))}
            </Select>

            <Input
              type="number"
              label="Jumlah Pertemuan (N)"
              min={1}
              max={32}
              value={jumlahPertemuan}
              onChange={(e) => setJumlahPertemuan(Number(e.target.value))}
              helperText="Standar 16 pertemuan (termasuk UTS dan UAS)"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-800 mb-2">
              Pilih Kelompok Mahasiswa (Bisa Banyak Sekaligus)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 bg-neutral-50 border border-neutral-300">
              {studentGroups && studentGroups.length > 0 ? (
                studentGroups.map((grp) => {
                  const isChecked = selectedGroupIds.includes(grp.id)
                  const label = grp.cohorts ? `${grp.cohorts.tahun} ${grp.nama}` : grp.nama
                  return (
                    <label
                      key={grp.id}
                      className={`flex items-center gap-2 p-2 text-sm border cursor-pointer select-none transition-colors ${
                        isChecked
                          ? 'border-neutral-900 bg-neutral-900 text-white font-medium'
                          : 'border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleGroupToggle(grp.id)}
                        className="rounded border-neutral-300"
                      />
                      <span>Kelas {label}</span>
                    </label>
                  )
                })
              ) : (
                <p className="text-xs text-neutral-500 col-span-3">
                  Belum ada kelompok mahasiswa. Tambahkan di menu Angkatan & Kelompok terlebih dahulu.
                </p>
              )}
            </div>
          </div>

          {errorMsg && <p className="text-sm text-red-600 font-medium">{errorMsg}</p>}
          {successMsg && <p className="text-sm text-emerald-700 font-medium">{successMsg}</p>}

          <Button
            type="submit"
            loading={createClassesMutation.isPending}
            disabled={selectedGroupIds.length === 0}
          >
            Buka Kelas Terpilih ({selectedGroupIds.length})
          </Button>
        </form>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-neutral-900">Daftar Kelas Terbuka</h2>
        {isLoading ? (
          <p className="text-sm text-neutral-600">Memuat daftar kelas...</p>
        ) : !classes || classes.length === 0 ? (
          <p className="text-sm text-neutral-500">Belum ada kelas yang dibuka.</p>
        ) : (
          classes.map((cl) => {
            const isExpanded = selectedClassId === cl.id
            const groupName = cl.student_groups
              ? `${cl.student_groups.cohorts?.tahun ?? ''} ${cl.student_groups.nama}`
              : 'Tanpa Kelompok'
            return (
              <Card key={cl.id} className="p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-neutral-900">
                        {cl.courses?.kode} - {cl.courses?.nama}
                      </h3>
                      <Badge variant="outline" className="font-semibold">
                        Kelas {groupName}
                      </Badge>
                      <span className="text-xs text-neutral-500">
                        {cl.jumlah_pertemuan} pertemuan
                      </span>
                    </div>
                    <p className="text-xs text-neutral-600 mt-1">
                      Semester: <span className="font-medium text-neutral-800">{cl.semesters?.nama}</span> · Dosen: <span className="font-medium text-neutral-800">{cl.profiles?.nama}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedClassId(isExpanded ? null : cl.id)}
                    >
                      {isExpanded ? 'Tutup Detail' : 'Kelola Jadwal & Mahasiswa'}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Hapus kelas ${cl.courses?.nama} (${groupName})? Sesi yang sudah terbentuk dapat terhapus.`)) {
                          deleteClassMutation.mutate(cl.id)
                        }
                      }}
                    >
                      Hapus
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="pt-4 border-t border-neutral-200 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-neutral-900">Jadwal Rutin Mingguan</h4>
                        <span className="text-xs text-neutral-500">
                          {cl.class_schedules?.length ?? 0} jadwal
                        </span>
                      </div>
                      <ul className="space-y-2 text-sm">
                        {cl.class_schedules?.map((sch) => (
                          <li
                            key={sch.id}
                            className="flex items-center justify-between border border-neutral-200 p-2.5 bg-neutral-50"
                          >
                            <span className="font-medium text-neutral-800">
                              {NAMA_HARI[sch.hari]}, {sch.jam_mulai.slice(0, 5)} – {sch.jam_selesai.slice(0, 5)} WIB
                            </span>
                            <button
                              type="button"
                              onClick={() => deleteScheduleMutation.mutate(sch.id)}
                              className="text-xs text-red-600 hover:text-red-800 underline px-2 py-1 font-medium"
                            >
                              Hapus
                            </button>
                          </li>
                        ))}
                      </ul>

                      <form onSubmit={(e) => handleAddSchedule(e, cl.id)} className="flex flex-wrap gap-2 pt-2">
                        <select
                          value={hari}
                          onChange={(e) => setHari(e.target.value)}
                          className="min-h-11 px-3 border border-neutral-300 text-sm bg-white"
                        >
                          {NAMA_HARI.map((namaHari, idx) => (
                            <option key={namaHari} value={idx}>
                              {namaHari}
                            </option>
                          ))}
                        </select>
                        <input
                          type="time"
                          value={jamMulai}
                          onChange={(e) => setJamMulai(e.target.value)}
                          className="min-h-11 px-2 border border-neutral-300 text-sm"
                          required
                        />
                        <input
                          type="time"
                          value={jamSelesai}
                          onChange={(e) => setJamSelesai(e.target.value)}
                          className="min-h-11 px-2 border border-neutral-300 text-sm"
                          required
                        />
                        <Button type="submit" size="sm" loading={addScheduleMutation.isPending}>
                          + Jadwal
                        </Button>
                      </form>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-neutral-900">
                          Mahasiswa Terdaftar ({cl.enrollments?.length ?? 0})
                        </h4>
                        <span className="text-xs text-neutral-500">
                          Otomatis dari kelompok & enrollment manual
                        </span>
                      </div>
                      <ul className="space-y-1.5 max-h-56 overflow-y-auto text-sm border border-neutral-200 p-2 bg-neutral-50">
                        {cl.enrollments?.map((en) => (
                          <li
                            key={en.id}
                            className="flex items-center justify-between py-1 px-2 bg-white border border-neutral-200"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-neutral-800">{en.profiles?.nama}</span>
                              <Badge variant={en.sumber === 'manual' ? 'warning' : 'outline'} size="sm">
                                {en.sumber === 'manual' ? 'Lintas Kelompok' : 'Kelompok'}
                              </Badge>
                            </div>
                            {en.sumber === 'manual' ? (
                              <button
                                type="button"
                                onClick={() => unenrollMutation.mutate(en.id)}
                                className="text-xs text-red-600 hover:text-red-800 underline px-1 font-medium"
                              >
                                Keluarkan
                              </button>
                            ) : (
                              <span className="text-[11px] text-neutral-400">Terkunci</span>
                            )}
                          </li>
                        ))}
                      </ul>

                      <form onSubmit={(e) => handleEnrollManual(e, cl.id)} className="space-y-2 pt-1">
                        <label className="block text-xs font-semibold text-neutral-700">
                          Tambah Enrollment Lintas Kelompok (Manual)
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={mahasiswaId}
                            onChange={(e) => setMahasiswaId(e.target.value)}
                            className="flex-1 min-h-11 px-2 border border-neutral-300 text-sm bg-white"
                          >
                            <option value="">-- Pilih Mahasiswa Lintas Kelompok --</option>
                            {students?.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.nama}
                              </option>
                            ))}
                          </select>
                          <Button type="submit" size="sm" loading={enrollMutation.isPending}>
                            + Tambah
                          </Button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}