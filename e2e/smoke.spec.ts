import { test, expect } from '@playwright/test'

test.describe('SysPro E2E Smoke Test (PRD 15.4)', () => {
  test('Login Dosen dan navigasi Beranda Dosen', async ({ page }) => {
    await page.goto('/login')

    // Form login kode anggota & password
    await page.fill('input#kode', '9000000001')
    await page.fill('input#password', 'password123')
    await page.click('button[type="submit"]')

    // Harus diarahkan ke beranda dosen
    await expect(page).toHaveURL(/\/dosen/)
    await expect(page.locator('header')).toContainText('dosen')

    // Cek navigasi ke jadwal dosen
    await page.click('a[href="/dosen/jadwal"]')
    await expect(page).toHaveURL(/\/dosen\/jadwal/)
  })

  test('Login Mahasiswa dan navigasi Jadwal Kuliah', async ({ page }) => {
    await page.goto('/login')

    // Form login kode anggota mahasiswa
    await page.fill('input#kode', '9000000101')
    await page.fill('input#password', 'password123')
    await page.click('button[type="submit"]')

    // Harus diarahkan ke beranda mahasiswa
    await expect(page).toHaveURL(/\/mahasiswa/)
    await expect(page.locator('header')).toContainText('mahasiswa')

    // Cek navigasi ke jadwal mahasiswa
    await page.click('a[href="/mahasiswa/jadwal"]')
    await expect(page).toHaveURL(/\/mahasiswa\/jadwal/)
  })

  test('Login Admin dan jelajahi panel manajemen', async ({ page }) => {
    await page.goto('/admin/login')

    // Form login email & password admin
    await page.fill('input#email', 'admin@prodi.internal')
    await page.fill('input#password', 'password123')
    await page.click('button[type="submit"]')

    // Harus diarahkan ke dashboard admin
    await expect(page).toHaveURL(/\/admin/)
    await expect(page.locator('aside')).toContainText('SysPro Admin')

    // Buka halaman Semester
    await page.click('a[href="/admin/semester"]')
    await expect(page).toHaveURL(/\/admin\/semester/)

    // Buka halaman Angkatan & Kelompok
    await page.click('a[href="/admin/angkatan"]')
    await expect(page).toHaveURL(/\/admin\/angkatan/)

    // Buka halaman Kelas
    await page.click('a[href="/admin/kelas"]')
    await expect(page).toHaveURL(/\/admin\/kelas/)

    // Buka halaman Anggota
    await page.click('a[href="/admin/anggota"]')
    await expect(page).toHaveURL(/\/admin\/anggota/)

    // Buka halaman Libur
    await page.click('a[href="/admin/libur"]')
    await expect(page).toHaveURL(/\/admin\/libur/)

    // Buka halaman Sesi
    await page.click('a[href="/admin/sesi"]')
    await expect(page).toHaveURL(/\/admin\/sesi/)

    // Buka halaman Tagihan Pengganti
    await page.click('a[href="/admin/tagihan"]')
    await expect(page).toHaveURL(/\/admin\/tagihan/)
  })

  test('Proteksi Rute (Role Guards) mencegah akses silang peran', async ({ page }) => {
    // Login sebagai Mahasiswa
    await page.goto('/login')
    await page.fill('input#kode', '9000000101')
    await page.fill('input#password', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/mahasiswa/)

    // Coba akses URL Admin
    await page.goto('/admin')
    // Harus dialihkan kembali ke /mahasiswa
    await expect(page).toHaveURL(/\/mahasiswa/)

    // Coba akses URL Dosen
    await page.goto('/dosen')
    // Harus dialihkan kembali ke /mahasiswa
    await expect(page).toHaveURL(/\/mahasiswa/)
  })
})
