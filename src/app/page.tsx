import type { Metadata } from 'next'
import { cookies, headers } from 'next/headers'
import SiteHeader from './components/SiteHeader'
import SiteFooter from './components/SiteFooter'
import HomepageSections, { getHomepageMeta } from './components/HomepageSections'

type PageDoc = {
  id: string
  title?: string | null
  status?: string | null
  seo?: {
    metaTitle?: string
    metaDescription?: string
    metaKeywords?: string
  }
}

const parseKeywords = (value?: string | null, fallback?: string[]) => {
  if (!value) return fallback || []
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers()
  const host = headerList.get('host') || 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const response = await fetch(`${protocol}://${host}/api/public/pages/_home`, { cache: 'no-store' })
  const data = await response.json().catch(() => null)
  const page = data?.success ? (data.item as PageDoc) : null
  const defaults = getHomepageMeta('nl')

  const title = page?.seo?.metaTitle || defaults.title
  const description = page?.seo?.metaDescription || defaults.description
  const keywords = parseKeywords(page?.seo?.metaKeywords, defaults.keywords)

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: '/'
    }
  }
}

const SUPPORTED_LOCALES = ['nl', 'en', 'de', 'fr'] as const

export default async function Home() {
  const cookieLocale = (await cookies()).get('tesland_locale')?.value
  const locale = SUPPORTED_LOCALES.includes(cookieLocale as any) ? (cookieLocale as any) : 'nl'
  return (
    <div className="public-site min-h-screen bg-[#111] text-slate-900">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-16">
        <HomepageSections locale={locale} />
      </main>
      <SiteFooter />
    </div>
  )
}
