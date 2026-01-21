'use client'

import { useEffect, useState } from 'react'
import { getFirebaseAuth, loginWithGoogle } from '@/lib/firebase-auth'
import type { User } from 'firebase/auth'
import { onAuthStateChanged } from 'firebase/auth'

type AdminAuthGateProps = {
  children: React.ReactNode
}

export default function AdminAuthGate({ children }: AdminAuthGateProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [configError, setConfigError] = useState<string | null>(null)
  const [bootstrapRequired, setBootstrapRequired] = useState(false)
  const [bootstrapError, setBootstrapError] = useState<string | null>(null)
  const [bootstrapBusy, setBootstrapBusy] = useState(false)

  useEffect(() => {
    try {
      const auth = getFirebaseAuth()
      const unsub = onAuthStateChanged(auth, (nextUser) => {
        setUser(nextUser)
        setLoading(false)
        if (nextUser) {
          nextUser
            .getIdToken()
            .then((token) =>
              fetch('/api/admin/bootstrap', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
              })
            )
            .catch(() => null)
        }
      })
      return () => unsub()
    } catch (err: any) {
      setConfigError(err.message || 'Firebase auth not configured')
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const checkProfile = async () => {
      if (!user) return
      try {
        const token = await user.getIdToken()
        const response = await fetch('/api/admin/me', {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await response.json()
        if (response.ok && data.success) {
          setBootstrapRequired(false)
          setBootstrapError(null)
          return
        }
        if (
          response.status === 403 &&
          (data.error === 'User record not found' || data.error === 'User role missing')
        ) {
          setBootstrapRequired(true)
          setBootstrapError(null)
          return
        }
        setBootstrapRequired(false)
        setBootstrapError(data.error || 'Toegang geweigerd')
      } catch (err: any) {
        setBootstrapError(err.message)
      }
    }
    checkProfile()
  }, [user])

  const handleLogin = async () => {
    try {
      setError(null)
      await loginWithGoogle()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleBootstrap = async () => {
    if (!user) return
    try {
      setBootstrapBusy(true)
      setBootstrapError(null)
      const token = await user.getIdToken()
      const response = await fetch('/api/admin/bootstrap-first-user', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Bootstrappen mislukt')
      }
      setBootstrapRequired(false)
      setBootstrapError(null)
    } catch (err: any) {
      setBootstrapError(err.message)
    } finally {
      setBootstrapBusy(false)
    }
  }

  if (loading) {
    return <div className="text-sm text-slate-500">Authenticatie laden...</div>
  }

  if (configError) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-700">
        <h2 className="text-lg font-semibold">Firebase Auth niet geconfigureerd</h2>
        <p className="mt-2 text-sm">{configError}</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="planning-modal-overlay">
        <div className="planning-modal">
          <h2 className="text-xl font-semibold">Inloggen</h2>
          <p className="mt-2 text-sm text-slate-600">
            Meld je aan met je Firebase account om door te gaan.
          </p>
          {error ? (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <div className="mt-4">
            <button
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
              type="button"
              onClick={handleLogin}
            >
              Inloggen met Google
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (bootstrapRequired) {
    return (
      <div className="planning-modal-overlay">
        <div className="planning-modal">
          <h2 className="text-xl font-semibold">Eerste admin instellen</h2>
          <p className="mt-2 text-sm text-slate-600">
            Er zijn nog geen accounts. Maak jouw account nu aan als SYSTEM_ADMIN.
          </p>
          {bootstrapError ? (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {bootstrapError}
            </p>
          ) : null}
          <div className="mt-4">
            <button
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-60"
              type="button"
              onClick={handleBootstrap}
              disabled={bootstrapBusy}
            >
              {bootstrapBusy ? 'Bezig...' : 'Maak eerste admin'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
