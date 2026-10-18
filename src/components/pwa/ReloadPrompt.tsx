import { useRegisterSW } from 'virtual:pwa-register/react'
import { copy } from '../../lib/copy'

export function ReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r?: ServiceWorkerRegistration) {
      console.log('SW Registered: ' + r)
    },
    onRegisterError(error: unknown) {
      console.error('SW registration error', error)
    },
  })

  if (!needRefresh) return null

  return (
    <div
      role="alert"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50 p-4 bg-neutral-900 text-white rounded-xl shadow-2xl border border-neutral-700 flex items-center justify-between gap-4 max-w-md animate-in slide-in-from-bottom-2"
    >
      <div className="text-sm font-medium">{copy.pwa.updateTersedia}</div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void updateServiceWorker(true)}
          className="min-h-[44px] px-3.5 py-2 bg-white text-neutral-900 text-xs font-bold rounded-lg hover:bg-neutral-100 transition-colors"
        >
          {copy.pwa.muatUlang}
        </button>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-neutral-400 hover:text-white"
          aria-label="Tutup"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
