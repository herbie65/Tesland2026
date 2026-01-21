import SiteFooter from './SiteFooter'
import SiteHeader from './SiteHeader'
import MaintenanceContent from './MaintenanceContent'
import { type Locale, getMaintenanceMeta } from './maintenanceCopy'

export { getMaintenanceMeta }

export default function MaintenancePage({ locale }: { locale: Locale }) {
  return (
    <div className="public-site min-h-screen bg-[#111] text-white">
      <SiteHeader />
      <MaintenanceContent locale={locale} />
      <SiteFooter />
    </div>
  )
}
