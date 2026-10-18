import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 menit
      gcTime: 1000 * 60 * 60 * 24, // 24 jam untuk cache offline di memori
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
