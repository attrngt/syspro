import { z } from 'zod'

// ==========================================
// 1. AUTH SCHEMAS
// ==========================================

export const MemberLoginSchema = z.object({
  kode: z.string().regex(/^[0-9]{10}$/, 'Kode harus 10 digit angka'),
  password: z.string().min(1, 'Password wajib diisi'),
})
export type MemberLoginForm = z.infer<typeof MemberLoginSchema>

export const AdminLoginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
})
export type AdminLoginForm = z.infer<typeof AdminLoginSchema>

export const ActivationCodeSchema = z.object({
  kode: z.string().regex(/^[0-9]{10}$/, 'Kode harus 10 digit angka'),
})
export type ActivationCodeForm = z.infer<typeof ActivationCodeSchema>

export const ActivationPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password minimal 8 karakter'),
    confirmPassword: z.string().min(8, 'Konfirmasi password minimal 8 karakter'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Konfirmasi password tidak cocok',
    path: ['confirmPassword'],
  })
export type ActivationPasswordForm = z.infer<typeof ActivationPasswordSchema>

export const ChangePasswordSchema = z
  .object({
    newPassword: z.string().min(8, 'Password baru minimal 8 karakter'),
    confirmPassword: z.string().min(8, 'Konfirmasi password baru minimal 8 karakter'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Konfirmasi password baru tidak cocok',
    path: ['confirmPassword'],
  })
export type ChangePasswordForm = z.infer<typeof ChangePasswordSchema>

// ==========================================
// 2. ANGKATAN & KELOMPOK SCHEMAS
// ==========================================

export const CohortSchema = z.object({
  tahun: z.coerce
    .number()
    .int()
    .min(2000, 'Tahun minimal 2000')
    .max(2100, 'Tahun maksimal 2100'),
  nama: z.string().min(1, 'Nama angkatan wajib diisi'),
  aktif: z.boolean().default(true),
})
export type CohortForm = z.infer<typeof CohortSchema>

export const StudentGroupSchema = z.object({
  cohort_id: z.string().uuid('Pilih angkatan yang valid'),
  nama: z.string().min(1, 'Nama kelompok wajib diisi (misal: A, B, C)'),
})
export type StudentGroupForm = z.infer<typeof StudentGroupSchema>

// ==========================================
// 3. MATA KULIAH & KELAS SCHEMAS
// ==========================================

export const CourseSchema = z.object({
  kode: z.string().min(1, 'Kode mata kuliah wajib diisi'),
  nama: z.string().min(1, 'Nama mata kuliah wajib diisi'),
  sks: z.coerce.number().int().min(1).max(12),
})
export type CourseForm = z.infer<typeof CourseSchema>

export const SemesterSchema = z.object({
  nama: z.string().min(1, 'Nama semester wajib diisi'),
  tanggal_mulai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal YYYY-MM-DD'),
  tanggal_selesai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal YYYY-MM-DD'),
  aktif: z.boolean().default(false),
})
export type SemesterForm = z.infer<typeof SemesterSchema>

export const ClassSchema = z.object({
  course_id: z.string().uuid('Mata kuliah wajib dipilih'),
  semester_id: z.string().uuid('Semester wajib dipilih'),
  group_ids: z.array(z.string().uuid()).min(1, 'Pilih minimal satu kelompok'),
  dosen_id: z.string().uuid('Dosen pengampu wajib dipilih'),
  jumlah_pertemuan: z.coerce.number().int().min(1).max(30).default(16),
  hari: z.coerce.number().int().min(0).max(6),
  jam_mulai: z.string().regex(/^\d{2}:\d{2}$/, 'Format jam HH:MM'),
  jam_selesai: z.string().regex(/^\d{2}:\d{2}$/, 'Format jam HH:MM'),
})
export type ClassForm = z.infer<typeof ClassSchema>

// ==========================================
// 4. ANGGOTA & PINDAH KELOMPOK
// ==========================================

export const TransferGroupSchema = z.object({
  mahasiswa_id: z.string().uuid(),
  group_id_baru: z.string().uuid('Pilih kelompok tujuan'),
  alasan: z.string().min(1, 'Alasan pemindahan wajib diisi'),
})
export type TransferGroupForm = z.infer<typeof TransferGroupSchema>

export const ResetAccessSchema = z.object({
  member_id: z.string().uuid(),
  alasan: z.string().min(1, 'Alasan reset akses wajib diisi'),
})
export type ResetAccessForm = z.infer<typeof ResetAccessSchema>

// ==========================================
// 5. LIBUR SCHEMAS
// ==========================================

export const HolidaySchema = z.object({
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal YYYY-MM-DD'),
  keterangan: z.string().min(1, 'Keterangan libur wajib diisi'),
  is_libur_kuliah: z.boolean().default(false),
})
export type HolidayForm = z.infer<typeof HolidaySchema>

// ==========================================
// 6. SESI & MODE SCHEMAS
// ==========================================

export const SessionModeSchema = z.object({
  mode: z.enum(['online', 'offline', 'tidak_ada']),
})
export type SessionModeForm = z.infer<typeof SessionModeSchema>

export const SessionCancelSchema = z.object({
  keterangan: z.string().optional(),
})
export type SessionCancelForm = z.infer<typeof SessionCancelSchema>

export const SessionLocationSchema = z
  .object({
    ruangan: z.string().optional().nullable(),
    link_online: z.string().optional().nullable(),
  })
  .refine(
    (data) => (data.ruangan && data.ruangan.trim() !== '') || (data.link_online && data.link_online.trim() !== ''),
    {
      message: 'Isi minimal salah satu: ruangan atau tautan online',
      path: ['ruangan'],
    }
  )
export type SessionLocationForm = z.infer<typeof SessionLocationSchema>

// ==========================================
// 7. TAGIHAN PENGGANTI SCHEMAS
// ==========================================

export const ProposeReplacementSchema = z.object({
  mulai_at: z.string().min(1, 'Pilih waktu mulai yang valid'),
  selesai_at: z.string().min(1, 'Pilih waktu selesai yang valid'),
})
export type ProposeReplacementForm = z.infer<typeof ProposeReplacementSchema>

export const ApproveReplacementSchema = z
  .object({
    ruangan: z.string().optional().nullable(),
    link_online: z.string().optional().nullable(),
  })
  .refine(
    (data) => (data.ruangan && data.ruangan.trim() !== '') || (data.link_online && data.link_online.trim() !== ''),
    {
      message: 'Isi minimal salah satu: ruangan atau link online',
      path: ['ruangan'],
    }
  )
export type ApproveReplacementForm = z.infer<typeof ApproveReplacementSchema>

export const RejectReplacementSchema = z.object({
  alasan: z.string().min(1, 'Alasan penolakan wajib diisi'),
})
export type RejectReplacementForm = z.infer<typeof RejectReplacementSchema>

export const DirectScheduleReplacementSchema = z
  .object({
    mulai_at: z.string().min(1, 'Pilih waktu mulai'),
    selesai_at: z.string().min(1, 'Pilih waktu selesai'),
    ruangan: z.string().optional().nullable(),
    link_online: z.string().optional().nullable(),
  })
  .refine(
    (data) => (data.ruangan && data.ruangan.trim() !== '') || (data.link_online && data.link_online.trim() !== ''),
    {
      message: 'Isi minimal salah satu: ruangan atau link online',
      path: ['ruangan'],
    }
  )
export type DirectScheduleReplacementForm = z.infer<typeof DirectScheduleReplacementSchema>
