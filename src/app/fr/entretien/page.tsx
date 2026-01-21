import type { Metadata } from 'next'
import MaintenancePage, { getMaintenanceMeta } from '../../components/MaintenancePage'

export const metadata: Metadata = getMaintenanceMeta('fr')

export default function EntretienFrPage() {
  return <MaintenancePage locale="fr" />
}
