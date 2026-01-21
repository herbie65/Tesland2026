import UsersClient from "./UsersClient"

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Gebruikers</h1>
        <p className="text-slate-600">
          Beheer gebruikers en koppel ze aan rollen.
        </p>
      </header>
      <UsersClient />
    </div>
  )
}
