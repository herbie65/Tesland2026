import Link from "next/link"
import SettingsClient from "./SettingsClient"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Instellingen</h1>
        <p className="text-slate-600">
          Beheer algemene gegevens, planning, notificaties en integraties.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/settings/roles"
            className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
          >
            Rollen beheren
          </Link>
          <Link
            href="/admin/settings/users"
            className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
          >
            Gebruikers beheren
          </Link>
          <Link
            href="/admin/settings/email-templates"
            className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
          >
            E-mail templates
          </Link>
        </div>
      </header>
      <SettingsClient />
    </div>
  )
}
