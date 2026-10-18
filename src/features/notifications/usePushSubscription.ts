import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useSession } from '../auth/useSession'
import { urlBase64ToUint8Array } from '../../lib/push'

export function useNotifications() {
  const { profile } = useSession()
  return useQuery({
    queryKey: ['notifications', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw new Error(error.message)
      return data
    },
    enabled: !!profile?.id,
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

export function useSubscribePush() {
  const { profile } = useSession()
  return useMutation({
    mutationFn: async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Browser perangkat ini belum mendukung Web Push.')
      }

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        throw new Error('Izin notifikasi ditolak oleh browser.')
      }

      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      const json = sub.toJSON()
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth || !profile?.id) {
        throw new Error('Data langganan push tidak lengkap.')
      }

      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          profile_id: profile.id,
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
          user_agent: navigator.userAgent,
        },
        { onConflict: 'endpoint' }
      )

      if (error) throw new Error(error.message)
    },
  })
}