import Link from 'next/link'
import SettingsClient from './SettingsClient'

// settings-menu module removed – local SETTINGS_MENU_ITEMS
const SETTINGS_MENU_ITEMS = [
  { id: 'workoverview', label: 'Werkoverzicht', href: '/admin/settings' },
  { id: 'planning', label: 'Planning', href: '/admin/settings' },
  { id: 'email', label: 'E-mail', href: '/admin/settings' },
  { id: 'notifications', label: 'Notificaties', href: '/admin/settings' },
  { id: 'mollie', label: 'Mollie', href: '/admin/settings/mollie' },
  { id: 'vat', label: 'BTW', href: '/admin/settings/vat' },
  { id: 'webshop', label: 'Webshop', href: '/admin/settings/webshop' },
  { id: 'dhl', label: 'DHL', href: '/admin/settings/dhl' },
  { id: 'postcodelookup', label: 'Postcode', href: '/admin/settings/postcodelookup' },
]

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Instellingen</h1>
        <p className="text-slate-600">
          Beheer algemene gegevens, planning, notificaties en integraties.
        </p>
        <div className="flex flex-wrap gap-2">
          {SETTINGS_MENU_ITEMS.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </header>
      <SettingsClient />
    </div>
  )
}
