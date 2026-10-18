import { useEffect, useState, type ReactNode } from 'react'
import { QueryClientProvider, dehydrate, hydrate, type DehydratedState } from '@tanstack/react-query'
import { idbGet, idbSet } from '../../lib/idb'
import { queryClient } from '../queryClient'

const CACHE_KEY = 'syspro_tanstack_cache'
const LAST_UPDATED_KEY = 'syspro_last_updated'

export function QueryProvider({ children }: { children: ReactNode }) {
  const [restored, setRestored] = useState(false)

  useEffect(() => {
    async function restoreCache() {
      try {
        const cached = await idbGet<DehydratedState>(CACHE_KEY)
        if (cached) {
          hydrate(queryClient, cached)
        }
      } catch {
        // Abaikan kegagalan cache offline
      } finally {
        setRestored(true)
      }
    }

    void restoreCache()

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.type === 'updated' || event?.type === 'added') {
        const dehydrated = dehydrate(queryClient)
        idbSet(CACHE_KEY, dehydrated)
        idbSet(LAST_UPDATED_KEY, new Date().toISOString())
      }
    })

    return () => unsubscribe()
  }, [])

  if (!restored) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-neutral-500">
        Memuat data...
      </div>
    )
  }

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}