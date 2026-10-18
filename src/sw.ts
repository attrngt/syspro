/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
}

precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener('push', (event) => {
  const data = (event.data?.json() ?? {}) as {
    id?: string
    judul?: string
    isi?: string
    aksi_url?: string
  }
  event.waitUntil(
    self.registration.showNotification(data.judul ?? 'SysPro', {
      body: data.isi ?? '',
      tag: data.id,
      data: { url: data.aksi_url ?? '/' },
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data as { url?: string } | undefined)?.url ?? '/'
  event.waitUntil(self.clients.openWindow(url))
})