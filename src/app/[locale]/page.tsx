import type { Metadata } from 'next'
import HomepageSections, { getHomepageMeta, type SupportedLocale } from '../components/HomepageSections'
import SiteFooter from '../components/SiteFooter'
import SiteHeader from '../components/SiteHeader'

export async function generateMetadata({
  params
}: {
  params: { locale: SupportedLocale } | Promise<{ locale: SupportedLocale }>
}): Promise<Metadata> {
  const resolved = await params
  const locale = resolved?.locale || 'nl'
  const defaults = getHomepageMeta(locale)

  return {
    title: defaults.title,
    description: defaults.description,
    keywords: defaults.keywords,
    alternates: {
      canonical: `/${locale}`
    }
  }
}

export default async function LocalizedHomePage({
  params
}: {
  params: { locale: SupportedLocale } | Promise<{ locale: SupportedLocale }>
}) {
  const resolved = await params
  const locale = resolved?.locale || 'nl'

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
