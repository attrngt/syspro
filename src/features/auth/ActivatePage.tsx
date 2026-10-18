import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { z } from 'zod'
import { copy } from '../../lib/copy'
import { useSession, useActivateMember, getHomeRouteByRole } from './useSession'

const KodeSchema = z.string().regex(/^[0-9]{10}$/)
const PasswordSchema = z.string().min(8)

export function ActivatePage() {
  const { profile, loading } = useSession()
  const activateMutation = useActivateMember()
  const [step, setStep] = useState<1 | 2>(1)
  const [kode, setKode] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  if (!loading && profile) {
    return <Navigate to={getHomeRouteByRole(profile.role)} replace />
  }

  function handleNextStep(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!KodeSchema.safeParse(kode).success) {
      setFormError(copy.aktivasi.gagal)
      return
    }
    setStep(2)
  }

  function handleActivate(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!PasswordSchema.safeParse(password).success) {
      setFormError(copy.aktivasi.gagal)
      return
    }

    activateMutation.mutate(
      { kode, password },
      {
        onError: () => setFormError(copy.aktivasi.gagal),
      }
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-white">
      <div className="w-full max-w-sm border border-neutral-900 p-6">
        <h1 className="text-xl font-bold text-neutral-900">{copy.aktivasi.judul}</h1>
        <p className="text-sm text-neutral-600 mt-1">{copy.app.subjudul}</p>

        {step === 1 ? (
          <form onSubmit={handleNextStep} className="mt-6 space-y-4" noValidate>
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

            {formError && (
              <p role="alert" className="text-sm text-red-700 font-medium">
                {formError}
              </p>
            )}

            <button
              type="submit"
              className="w-full min-h-11 bg-neutral-900 text-white text-sm font-medium"
            >
              Lanjut
            </button>
          </form>
        ) : (
          <form onSubmit={handleActivate} className="mt-6 space-y-4" noValidate>
            <div className="text-sm text-neutral-600">
              Kode: <span className="font-mono font-medium text-neutral-900">{kode}</span>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-900">
                Buat Password (minimal 8 karakter)
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
              disabled={activateMutation.isPending}
              className="w-full min-h-11 bg-neutral-900 text-white text-sm font-medium disabled:opacity-50"
            >
              {copy.aktivasi.judul}
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-neutral-200 text-sm">
          <Link to="/login" className="underline text-neutral-900 inline-block py-2">
            Kembali ke halaman masuk
          </Link>
        </div>
      </div>
    </main>
  )
}