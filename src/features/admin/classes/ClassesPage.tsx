import { useState, type FormEvent } from 'react'
import {
  useClasses,
  useProfilesByRole,
  useCreateClass,
  useDeleteClass,
  useAddSchedule,
  useDeleteSchedule,
  useEnrollStudent,
  useUnenrollStudent,
} from './useClasses'
import { useCourses } from '../courses/useCourses'
import { useSemesters } from '../semesters/useSemesters'

const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

export function ClassesPage() {
  const { data: classes, isLoading } = useClasses()
  const { data: courses } = useCourses()
  const { data: semesters } = useSemesters()
  const { data: lecturers } = useProfilesByRole('dosen')
  const { data: students } = useProfilesByRole('mahasiswa')

  const createClassMutation = useCreateClass()
  const deleteClassMutation = useDeleteClass()
  const addScheduleMutation = useAddSchedule()
  const deleteScheduleMutation = useDeleteSchedule()
  const enrollMutation = useEnrollStudent()
  const unenrollMutation = useUnenrollStudent()

  const [semesterId, setSemesterId] = useState('')
  const [courseId, setCourseId] = useState('')
  const [dosenId, setDosenId] = useState('')
  const [namaKelas, setNamaKelas] = useState('A')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [hari, setHari] = useState('1')
  const [jamMulai, setJamMulai] = useState('08:00')
  const [jamSelesai, setJamSelesai] = useState('10:30')
  const [mahasiswaId, setMahasiswaId] = useState('')

  function handleCreateClass(e: FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    if (!semesterId || !courseId || !dosenId || !namaKelas.trim()) {
      setErrorMsg('Semua kolom kelas wajib diisi.')
      return
    }
    createClassMutation.mutate(
      {
        semester_id: semesterId,
        course_id: courseId,
        dosen_id: dosenId,
        nama_kelas: namaKelas.trim().toUpperCase(),
      },
      { onError: (err) => setErrorMsg(err.message) }
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

  function handleEnroll(e: FormEvent, classId: string) {
    e.preventDefault()
    if (!mahasiswaId) return
    enrollMutation.mutate(
      { class_id: classId, mahasiswa_id: mahasiswaId },
      { onError: (err) => setErrorMsg(err.message) }
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Manajemen Kelas, Jadwal Rutin, & Enrollment</h1>
        <p className="text-sm text-neutral-600 mt-1">
          Kelola pembukaan kelas, dosen pengampu, jadwal mingguan, dan daftar mahasiswa.
        </p>
      </div>

      <form onSubmit={handleCreateClass} className="border border-neutral-900 bg-white p-6 space-y-4 max-w-2xl">
        <h2 className="font-bold text-base">Buka Kelas Baru</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Semester</label>
            <select
              value={semesterId}
              onChange={(e) => setSemesterId(e.target.value)}
              className="mt-1 w-full min-h-11 px-3 border border-neutral-900 bg-white"
              required
            >
              <option value="">-- Pilih Semester --</option>
              {semesters?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama} {s.aktif ? '(Aktif)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Mata Kuliah</label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="mt-1 w-full min-h-11 px-3 border border-neutral-900 bg-white"
              required
            >
              <option value="">-- Pilih Mata Kuliah --</option>
              {courses?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.kode} - {c.nama}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Dosen Pengampu</label>
            <select
              value={dosenId}
              onChange={(e) => setDosenId(e.target.value)}
              className="mt-1 w-full min-h-11 px-3 border border-neutral-900 bg-white"
              required
            >
              <option value="">-- Pilih Dosen --</option>
              {lecturers?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nama}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Nama Kelas</label>
            <input
              type="text"
              placeholder="A"
              value={namaKelas}
              onChange={(e) => setNamaKelas(e.target.value)}
              className="mt-1 w-full min-h-11 px-3 border border-neutral-900"
              required
            />
          </div>
        </div>

        {errorMsg && <p className="text-sm text-red-700 font-medium">{errorMsg}</p>}

        <button
          type="submit"
          disabled={createClassMutation.isPending}
          className="min-h-11 px-6 bg-neutral-900 text-white text-sm font-medium disabled:opacity-50"
        >
          Simpan Kelas
        </button>
      </form>

      <div className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-neutral-600">Memuat daftar kelas...</p>
        ) : (
          classes?.map((cl) => {
            const isExpanded = selectedClassId === cl.id
            return (
              <div key={cl.id} className="border border-neutral-900 bg-white p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-base">
                      {cl.courses?.kode} - {cl.courses?.nama} (Kelas {cl.nama_kelas})
                    </h3>
                    <p className="text-xs text-neutral-600 mt-0.5">
                      Semester: {cl.semesters?.nama} · Dosen: {cl.profiles?.nama}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedClassId(isExpanded ? null : cl.id)}
                      className="min-h-11 px-4 border border-neutral-900 text-xs font-medium hover:bg-neutral-100"
                    >
                      {isExpanded ? 'Tutup Detail' : 'Kelola Jadwal & Mahasiswa'}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteClassMutation.mutate(cl.id)}
                      className="min-h-11 px-3 border border-neutral-300 text-xs text-red-700 font-medium hover:bg-neutral-100"
                    >
                      Hapus Kelas
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="pt-4 border-t border-neutral-200 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="font-bold text-sm">Jadwal Rutin Mingguan</h4>
                      <ul className="space-y-2 text-sm">
                        {cl.class_schedules?.map((sch) => (
                          <li key={sch.id} className="flex items-center justify-between border border-neutral-200 p-2">
                            <span>
                              {NAMA_HARI[sch.hari]}, {sch.jam_mulai.slice(0, 5)} – {sch.jam_selesai.slice(0, 5)} WIB
                            </span>
                            <button
                              type="button"
                              onClick={() => deleteScheduleMutation.mutate(sch.id)}
                              className="text-xs text-red-700 underline px-2 py-1"
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
                          className="min-h-11 px-2 border border-neutral-900 text-sm bg-white"
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
                          className="min-h-11 px-2 border border-neutral-900 text-sm"
                          required
                        />
                        <input
                          type="time"
                          value={jamSelesai}
                          onChange={(e) => setJamSelesai(e.target.value)}
                          className="min-h-11 px-2 border border-neutral-900 text-sm"
                          required
                        />
                        <button
                          type="submit"
                          className="min-h-11 px-4 bg-neutral-900 text-white text-xs font-medium"
                        >
                          + Jadwal
                        </button>
                      </form>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-bold text-sm">
                        Mahasiswa Terdaftar ({cl.enrollments?.length ?? 0})
                      </h4>
                      <ul className="space-y-1 max-h-40 overflow-y-auto text-sm border border-neutral-200 p-2">
                        {cl.enrollments?.map((en) => (
                          <li key={en.id} className="flex items-center justify-between py-1 border-b border-neutral-100">
                            <span>{en.profiles?.nama}</span>
                            <button
                              type="button"
                              onClick={() => unenrollMutation.mutate(en.id)}
                              className="text-xs text-red-700 underline px-2"
                            >
                              Keluarkan
                            </button>
                          </li>
                        ))}
                      </ul>

                      <form onSubmit={(e) => handleEnroll(e, cl.id)} className="flex gap-2 pt-2">
                        <select
                          value={mahasiswaId}
                          onChange={(e) => setMahasiswaId(e.target.value)}
                          className="flex-1 min-h-11 px-2 border border-neutral-900 text-sm bg-white"
                        >
                          <option value="">-- Pilih Mahasiswa --</option>
                          {students?.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.nama}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="min-h-11 px-4 bg-neutral-900 text-white text-xs font-medium"
                        >
                          + Mahasiswa
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}