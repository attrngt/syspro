export const copy = {
  app: {
    nama: 'SysPro',
    subjudul: 'Program Studi Produksi Media',
  },
  auth: {
    loginJudul: 'Masuk ke SysPro',
    adminLoginJudul: 'Masuk Admin Prodi',
    kodeLabel: 'Kode Anggota (10 digit)',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    masukBtn: 'Masuk',
    gagalGenerik: 'Kode atau status tidak valid.',
    gagalLoginAdmin: 'Email atau password tidak valid.',
  },
  aktivasi: {
    judul: 'Aktivasi akun',
    gagal: 'Kode atau status tidak valid.',
    berhasil: 'Akun berhasil diaktifkan. Silakan masuk.',
  },
  mode: {
    online: 'Online',
    offline: 'Offline',
    tidak_ada: 'Tidak Ada',
    menunggu: 'Menunggu',
    default_offline: 'Default Offline',
  },
  konfirmasi: {
    judul: 'Konfirmasi Mode Kuliah',
    simpan: 'Simpan',
    berhasil: 'Mode kuliah disimpan.',
    terkunci: 'Sesi sudah dikunci',
  },
  offline: {
    banner: (waktu: string) => `Data terakhir diperbarui ${waktu}`,
    aksiNonaktif: 'Tidak dapat menyimpan perubahan saat offline.',
  },
} as const