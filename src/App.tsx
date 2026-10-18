import { QueryProvider } from './app/providers/QueryProvider'
import { AuthProvider } from './app/providers/AuthProvider'
import { ToastProvider } from './app/providers/ToastProvider'
import { AppRouter } from './app/router'

export function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <ToastProvider>
          <AppRouter />
        </ToastProvider>
      </AuthProvider>
    </QueryProvider>
  )
}

export default App