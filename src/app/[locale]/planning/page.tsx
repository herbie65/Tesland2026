import AppointmentClient from '../../afspraak/AppointmentClient'
import SiteFooter from '../../components/SiteFooter'
import SiteHeader from '../../components/SiteHeader'

type SupportedLocale = 'nl' | 'en' | 'de' | 'fr'

export default async function LocalizedPlanningPage({
  params
}: {
  params: { locale: SupportedLocale } | Promise<{ locale: SupportedLocale }>
}) {
  const resolved = await params
  const locale = resolved?.locale || 'nl'

  return (
    <div className="public-site min-h-screen bg-slate-50 text-slate-900">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-6 py-12">
        <AppointmentClient locale={locale} />
      </main>
      <SiteFooter />
    </div>
  )
}
