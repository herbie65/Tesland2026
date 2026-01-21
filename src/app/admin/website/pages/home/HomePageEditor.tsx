'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'
import MediaPickerModal from '../../../components/MediaPickerModal'

type HeroBlock = {
  type: 'hero'
  headline: string
  subheadline: string
  ctaText: string
  ctaLink: string
  backgroundImage: string
}

type IntroBlock = {
  type: 'introText'
  heading: string
  body: string
}

type CtaBlock = {
  type: 'ctaBanner'
  text: string
  buttonText: string
  buttonLink: string
}

type PageDoc = {
  id: string
  slug: string
  title: string
  status: string
  seo: {
    metaTitle: string
    metaDescription: string
  }
  blocks: Array<HeroBlock | IntroBlock | CtaBlock>
  draftTitle?: string
  draftSeo?: {
    metaTitle: string
    metaDescription: string
  }
  draftBlocks?: Array<HeroBlock | IntroBlock | CtaBlock>
}

const defaultHero: HeroBlock = {
  type: 'hero',
  headline: 'Tesland werkplaatssoftware',
  subheadline: 'Eén centrale plek voor planning, onderdelen en werkorders.',
  ctaText: 'Open de planning',
  ctaLink: '/admin/planning',
  backgroundImage: ''
}

const defaultIntro: IntroBlock = {
  type: 'introText',
  heading: 'Alles voor de werkplaats',
  body:
    'Plan werkorders, beheer onderdelen en houd klanten overzichtelijk bij.\n\n' +
    'Tesland maakt samenwerken in de werkplaats duidelijk en snel.'
}

const defaultCta: CtaBlock = {
  type: 'ctaBanner',
  text: 'Klaar om vandaag te starten met Tesland?',
  buttonText: 'Ga naar de admin',
  buttonLink: '/admin'
}

export default function HomePageEditor() {
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showMedia, setShowMedia] = useState(false)
  const [seedMissing, setSeedMissing] = useState(false)

  const [title, setTitle] = useState('Tesland')
  const [status, setStatus] = useState<'PUBLISHED' | 'DRAFT'>('PUBLISHED')
  const [metaTitle, setMetaTitle] = useState('Tesland')
  const [metaDescription, setMetaDescription] = useState('')

  const [hero, setHero] = useState<HeroBlock>(defaultHero)
  const [intro, setIntro] = useState<IntroBlock>(defaultIntro)
  const [cta, setCta] = useState<CtaBlock>(defaultCta)

  const blocks = useMemo(() => [hero, intro, cta], [hero, intro, cta])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const meResponse = await apiFetch('/api/admin/me')
      const meData = await meResponse.json()
      if (!meResponse.ok || !meData.success) {
        setAllowed(false)
        return
      }
      const role = meData.user?.role
      const canEdit = role === 'SYSTEM_ADMIN' || role === 'MANAGEMENT'
      setAllowed(canEdit)
      if (!canEdit) return

      const response = await apiFetch('/api/admin/pages/_home')
      const data = await response.json()
      if (!response.ok || !data.success) {
        if (response.status === 404) {
          setSeedMissing(true)
          return
        }
        throw new Error(data.error || 'Pagina laden mislukt')
      }
      setSeedMissing(false)
      const page = data.item as PageDoc
      setTitle(page.draftTitle || page.title || 'Tesland')
      setStatus((page.status as 'PUBLISHED' | 'DRAFT') || 'DRAFT')
      setMetaTitle(page.draftSeo?.metaTitle || page.seo?.metaTitle || '')
      setMetaDescription(page.draftSeo?.metaDescription || page.seo?.metaDescription || '')

      const blocksFromDoc = Array.isArray(page.draftBlocks) ? page.draftBlocks : page.blocks || []
      const heroBlock = blocksFromDoc.find((b) => b.type === 'hero') as HeroBlock | undefined
      const introBlock = blocksFromDoc.find((b) => b.type === 'introText') as IntroBlock | undefined
      const ctaBlock = blocksFromDoc.find((b) => b.type === 'ctaBanner') as CtaBlock | undefined

      setHero({ ...defaultHero, ...heroBlock })
      setIntro({ ...defaultIntro, ...introBlock })
      setCta({ ...defaultCta, ...ctaBlock })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSave = async (nextStatus?: 'PUBLISHED' | 'DRAFT') => {
    try {
      setSaving(true)
      setError(null)
      const statusValue = nextStatus ?? status
      const response = await apiFetch('/api/admin/pages/_home', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: '/',
          status: statusValue,
          draftTitle: title,
          draftSeo: {
            metaTitle,
            metaDescription
          },
          draftBlocks: blocks
        })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Opslaan mislukt')
      }
      setStatus(statusValue)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSeed = async () => {
    try {
      setSaving(true)
      setError(null)
      const response = await apiFetch('/api/admin/seed-pages', { method: 'POST' })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Seed mislukt')
      }
      await loadData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (allowed === false) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        Geen toegang. Deze pagina is alleen beschikbaar voor management of system admins.
      </section>
    )
  }

  if (allowed === null || loading) {
    return <p className="text-sm text-slate-500">Laden...</p>
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Homepage</h2>
            <p className="text-sm text-slate-600">Beheer de publieke frontpage.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {seedMissing ? (
              <button
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-60"
                type="button"
                onClick={handleSeed}
                disabled={saving}
              >
                Seed homepage
              </button>
            ) : null}
            <button
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              type="button"
              onClick={() => handleSave('DRAFT')}
              disabled={saving}
            >
              Unpublish
            </button>
            <button
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-60"
              type="button"
              onClick={() => handleSave('PUBLISHED')}
              disabled={saving}
            >
              Publish
            </button>
            <button
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              type="button"
              onClick={() => handleSave()}
              disabled={saving}
            >
              Opslaan
            </button>
          </div>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Status: <span className="font-semibold">{status}</span>
        </p>
        {error ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold">Titel & SEO</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Titel
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Meta title
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              value={metaTitle}
              onChange={(event) => setMetaTitle(event.target.value)}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
            Meta description
            <textarea
              className="min-h-[80px] rounded-lg border border-slate-200 px-3 py-2 text-base"
              value={metaDescription}
              onChange={(event) => setMetaDescription(event.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold">Hero</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
            Headline
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              value={hero.headline}
              onChange={(event) => setHero({ ...hero, headline: event.target.value })}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
            Subheadline
            <textarea
              className="min-h-[80px] rounded-lg border border-slate-200 px-3 py-2 text-base"
              value={hero.subheadline}
              onChange={(event) => setHero({ ...hero, subheadline: event.target.value })}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            CTA tekst
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              value={hero.ctaText}
              onChange={(event) => setHero({ ...hero, ctaText: event.target.value })}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            CTA link
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              value={hero.ctaLink}
              onChange={(event) => setHero({ ...hero, ctaLink: event.target.value })}
            />
          </label>
          <div className="flex flex-wrap items-center gap-2 text-sm sm:col-span-2">
            <button
              className="rounded-lg border border-slate-200 px-4 py-2 text-slate-700 hover:bg-slate-50"
              type="button"
              onClick={() => setShowMedia(true)}
            >
              Kies achtergrondbeeld
            </button>
            <span className="text-slate-600">{hero.backgroundImage || 'Geen afbeelding geselecteerd'}</span>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold">Intro tekst</h3>
        <div className="mt-4 grid gap-4">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Kop
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              value={intro.heading}
              onChange={(event) => setIntro({ ...intro, heading: event.target.value })}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Tekst (markdown/tekst)
            <textarea
              className="min-h-[140px] rounded-lg border border-slate-200 px-3 py-2 text-base"
              value={intro.body}
              onChange={(event) => setIntro({ ...intro, body: event.target.value })}
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold">CTA banner</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
            Tekst
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              value={cta.text}
              onChange={(event) => setCta({ ...cta, text: event.target.value })}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Knop tekst
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              value={cta.buttonText}
              onChange={(event) => setCta({ ...cta, buttonText: event.target.value })}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Knop link
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              value={cta.buttonLink}
              onChange={(event) => setCta({ ...cta, buttonLink: event.target.value })}
            />
          </label>
        </div>
      </section>

      <MediaPickerModal
        isOpen={showMedia}
        onClose={() => setShowMedia(false)}
        onSelect={(url) => {
          setHero((prev) => ({ ...prev, backgroundImage: url }))
          setShowMedia(false)
        }}
        category="wallpapers"
        title="Kies achtergrondbeeld"
      />
    </div>
  )
}
