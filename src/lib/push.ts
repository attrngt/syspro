import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { useSession } from '../features/auth/useSession'

export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const buffer = new ArrayBuffer(rawData.length)
  const outputArray = new Uint8Array(buffer)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function usePushSubscription() {
  const { profile } = useSession()
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return
    }

    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub)
      })
    })
  }, [])

  async function subscribe(): Promise<boolean> {
    if (!profile) return false
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
    if (!vapidKey) {
      setError('Kunci VAPID publik belum dikonfigurasi.')
      return false
    }

    setLoading(true)
    setError(null)

    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setError('Izin notifikasi ditolak oleh peramban.')
        setLoading(false)
        return false
      }

      const reg = await navigator.serviceWorker.ready
      let sub = await reg.pushManager.getSubscription()

      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        })
      }

      const p256dhRaw = sub.getKey('p256dh')
      const authRaw = sub.getKey('auth')

      if (!p256dhRaw || !authRaw) {
        throw new Error('Kunci subscription tidak valid')
      }

      const p256dh = btoa(String.fromCharCode(...new Uint8Array(p256dhRaw)))
      const auth = btoa(String.fromCharCode(...new Uint8Array(authRaw)))

      const { error: dbError } = await supabase.from('push_subscriptions').upsert(
        {
          profile_id: profile.id,
          endpoint: sub.endpoint,
          p256dh,
          auth,
        },
        { onConflict: 'endpoint' }
      )

      if (dbError) throw dbError

      setIsSubscribed(true)
      setLoading(false)
      return true
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? 'Gagal mengaktifkan notifikasi')
      setLoading(false)
      return false
    }
  }

  return { isSubscribed, loading, error, subscribe }
}