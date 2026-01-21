import type { Metadata } from 'next'
import MaintenancePage, { getMaintenanceMeta } from '../../components/MaintenancePage'

export const metadata: Metadata = getMaintenanceMeta('de')

export default function WartungDePage() {
  return <MaintenancePage locale="de" />
}
