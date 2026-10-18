import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { z } from 'zod'
import { copy } from '../../lib/copy'
import { useSession, useMemberLogin, getHomeRouteByRole } from './useSession'

const LoginSchema = z.object({
  kode: z.string().regex(/^[0-9]{10}$/),
  password: z.string().min(8),
})

export function LoginPage() {
  const { profile, loading } = useSession()
  const loginMutation = useMemberLogin()
  const [kode, setKode] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  if (!loading && profile) {
    return <Navigate to={getHomeRouteByRole(profile.role)} replace />
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)

    const parsed = LoginSchema.safeParse({ kode, password })
    if (!parsed.success) {
      setFormError(copy.auth.gagalGenerik)
      return
    }

    loginMutation.mutate(parsed.data, {
      onError: () => setFormError(copy.auth.gagalGenerik),
    })
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-white">
      <div className="w-full max-w-sm border border-neutral-900 p-6">
        <h1 className="text-xl font-bold text-neutral-900">{copy.auth.loginJudul}</h1>
        <p className="text-sm text-neutral-600 mt-1">{copy.app.subjudul}</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="kode" className="block text-sm font-medium text-neutral-900">
              {copy.auth.kodeLabel}
            </label>
            <input
              id="kode"
              type="text"
              inputMode="numeric"
              maxLength={10}
              value={kode}
              onChange={(e) => setKode(e.target.value)}
              className="mt-1 w-full min-h-11 px-3 border border-neutral-900 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-neutral-900">
              {copy.auth.passwordLabel}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full min-h-11 px-3 border border-neutral-900 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              required
            />
          </div>

          {formError && (
            <p role="alert" className="text-sm text-red-700 font-medium">
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full min-h-11 bg-neutral-900 text-white text-sm font-medium disabled:opacity-50"
          >
            {copy.auth.masukBtn}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-neutral-200 text-sm">
          <Link to="/aktivasi" className="underline text-neutral-900 inline-block py-2">
            {copy.aktivasi.judul}
          </Link>
        </div>
      </div>
    </main>
  )
}