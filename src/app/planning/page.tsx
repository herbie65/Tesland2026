import AppointmentClient from '../afspraak/AppointmentClient'
import SiteFooter from '../components/SiteFooter'
import SiteHeader from '../components/SiteHeader'

export default function PublicPlanningPage() {
  return (
    <div className="public-site min-h-screen bg-slate-50 text-slate-900">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-6 py-12">
        <AppointmentClient />
      </main>
      <SiteFooter />
    </div>
  )
}
