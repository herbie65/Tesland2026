import RolesClient from "./RolesClient"

export default function RolesPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Rollen</h1>
        <p className="text-slate-600">
          Beheer rollen en permissies voor toegang tot modules.
        </p>
      </header>
      <RolesClient />
    </div>
  )
}
