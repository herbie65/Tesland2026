import type { Metadata } from 'next'
import MaintenancePage, { getMaintenanceMeta } from '../components/MaintenancePage'

export const metadata: Metadata = getMaintenanceMeta('nl')

export default function OnderhoudPage() {
  return <MaintenancePage locale="nl" />
}
