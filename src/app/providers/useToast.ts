import { createContext, useContext } from 'react'

export interface ToastItem {
  id: string
  title?: string
  message: string
  type: 'success' | 'error' | 'info'
}

export interface ToastContextType {
  toast: (message: string, type?: 'success' | 'error' | 'info', title?: string) => void
  success: (message: string, title?: string) => void
  error: (message: string, title?: string) => void
  info: (message: string, title?: string) => void
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
