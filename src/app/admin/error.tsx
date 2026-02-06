'use client'

import { useEffect } from 'react'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Admin error:', error.message, error.digest, error.stack)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="max-w-md w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900 mb-2">
          Fout bij laden admin
        </h1>
        <p className="text-sm text-slate-600 mb-4">
          Er is een serverfout opgetreden. Controleer de serverlogs op de host (bijv. Docker: <code className="bg-slate-100 px-1 rounded">docker compose logs</code>) voor meer informatie.
        </p>
        {error.digest && (
          <p className="text-xs text-slate-500 mb-4 font-mono">
            Digest: {error.digest}
          </p>
        )}
        {process.env.NODE_ENV === 'development' && (
          <pre className="text-xs bg-slate-100 p-3 rounded overflow-auto mb-4 max-h-32">
            {error.message}
          </pre>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            Opnieuw proberen
          </button>
          <a
            href="/login"
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
          >
            Naar login
          </a>
        </div>
      </div>
    </div>
  )
}
