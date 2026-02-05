import { notFound } from 'next/navigation'
import SettingsClient from '../SettingsClient'

const ALLOWED_SETTINGS_SLUGS = [
  'workoverview', 'planning', 'email', 'notifications', 'rdwSettings',
  'mollie', 'webshop', 'dhl', 'postcodelookup', 'vat', 'roles', 'users',
  'email-templates'
]

type Props = { params: Promise<{ slug: string }> }

export default async function SettingsSectionPage({ params }: Props) {
  const { slug } = await params
  if (!ALLOWED_SETTINGS_SLUGS.includes(slug)) {
    notFound()
  }
  return (
    <div className="space-y-6">
      <SettingsClient activeSection={slug} />
    </div>
  )
}
