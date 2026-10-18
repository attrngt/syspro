import { QueryProvider } from './app/providers/QueryProvider'
import { AuthProvider } from './app/providers/AuthProvider'
import { AppRouter } from './app/router'

export function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </QueryProvider>
  )
}

export default App