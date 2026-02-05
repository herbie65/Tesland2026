'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/app/components/SiteFooter'
import { customerFetch, setCustomerSession } from '@/lib/customer-session'

export default function CustomerLoginPage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'nl'
  const [email, setEmail] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [code, setCode] = useState('')
  const [devCode, setDevCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const localePrefix = `/${locale}`

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError(null)
      const { res, data } = await customerFetch('/api/shop/auth/request-login', {
        method: 'POST',
        body: JSON.stringify({ email })
      })
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Code versturen mislukt')
      }
      setDevCode(typeof data?.devCode === 'string' ? data.devCode : null)
      setStep('code')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError(null)
      const { res, data } = await customerFetch('/api/shop/auth/verify-login', {
        method: 'POST',
        body: JSON.stringify({ email, code })
      })
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Login mislukt')
      }
      setCustomerSession(data.token, data.user)
      window.location.href = `${localePrefix}/customer/account`
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="public-site min-h-screen bg-[#111] text-slate-900">
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl px-6 py-10">
        <div className="rounded-2xl bg-slate-50 p-8">
          <h1 className="text-3xl font-semibold text-slate-900">Inloggen</h1>
          {error ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}
          {step === 'email' ? (
            <form className="mt-6 space-y-4" onSubmit={handleRequestCode}>
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Email
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <button
                className="w-full rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Bezig…' : 'Stuur login code'}
              </button>
            </form>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={handleVerifyCode}>
              <p className="text-sm text-slate-700">
                We hebben een code gestuurd naar <strong>{email}</strong>.
              </p>
              {devCode ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Dev mode: code is <strong className="tracking-[0.25em]">{devCode}</strong>
                </p>
              ) : null}
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Login code
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 tracking-[0.25em]"
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </label>
              <button
                className="w-full rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Bezig…' : 'Inloggen'}
              </button>
              <button
                className="w-full rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 disabled:opacity-50"
                type="button"
                disabled={loading}
                onClick={() => {
                  setStep('email')
                  setCode('')
                }}
              >
                Code opnieuw sturen
              </button>
            </form>
          )}
          <p className="mt-4 text-sm text-slate-700">
            Geen account?{' '}
            <Link className="font-semibold underline" href={`${localePrefix}/customer/account/create`}>
              Registreren
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

