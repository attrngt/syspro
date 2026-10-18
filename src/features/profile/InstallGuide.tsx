export function InstallGuide() {
  return (
    <div className="border border-neutral-900 p-4 space-y-3 bg-white">
      <h2 className="font-bold text-sm">Panduan Instal Aplikasi (PWA)</h2>
      <p className="text-xs text-neutral-700">
        Instal SysPro di perangkat Anda untuk akses jadwal offline dan notifikasi instan.
      </p>
      <div className="space-y-2 text-xs text-neutral-800">
        <div>
          <span className="font-bold">iOS (Safari - Wajib iOS 16.4+ untuk Web Push):</span>
          <ol className="list-decimal list-inside mt-1 space-y-0.5 text-neutral-700">
            <li>Ketuk tombol Bagikan (Share) di bagian bawah Safari.</li>
            <li>Pilih menu <strong>"Tambah ke Layar Utama" (Add to Home Screen)</strong>.</li>
            <li>Buka aplikasi SysPro dari Layar Utama, lalu aktifkan notifikasi di halaman ini.</li>
          </ol>
        </div>
        <div className="pt-1">
          <span className="font-bold">Android (Chrome) / Desktop:</span>
          <p className="text-neutral-700 mt-0.5">
            Ketuk menu titik tiga di pojok kanan atas browser, lalu pilih{' '}
            <strong>"Instal aplikasi"</strong> atau <strong>"Tambahkan ke Layar utama"</strong>.
          </p>
        </div>
      </div>
    </div>
  )
}