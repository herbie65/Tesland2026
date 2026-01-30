"use client"

import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"

type Role = {
  id: string
  name: string
  description?: string | null
  permissions?: any
  includeInPlanning?: boolean
  isSystemAdmin?: boolean
}

const ALL_PAGES = [
  { path: '/admin', label: 'Dashboard', group: 'Basis' },
  { path: '/admin/my-dashboard', label: 'Mijn Dashboard (HR)', group: 'HR' },
  { path: '/admin/leave-management', label: 'Verlof Beheer', group: 'HR' },
  { path: '/admin/leave-reports', label: 'Verlof Rapportage', group: 'HR' },
  { path: '/admin/hr-settings', label: 'HR Instellingen', group: 'HR' },
  { path: '/admin/planning', label: 'Planning', group: 'Planning' },
  { path: '/admin/workoverzicht', label: 'Werkoverzicht', group: 'Planning' },
  { path: '/admin/workorders', label: 'Werkorders', group: 'Werkorders' },
  { path: '/admin/customers', label: 'Klanten', group: 'CRM' },
  { path: '/admin/vehicles', label: 'Voertuigen', group: 'CRM' },
  { path: '/admin/products', label: 'Producten', group: 'Voorraad' },
  { path: '/admin/categories', label: 'Categorieën', group: 'Voorraad' },
  { path: '/admin/magazijn', label: 'Magazijn', group: 'Voorraad' },
  { path: '/admin/orders', label: 'Orders', group: 'Verkoop' },
  { path: '/admin/invoices', label: 'Facturen', group: 'Verkoop' },
  { path: '/admin/credit-invoices', label: 'Creditfacturen', group: 'Verkoop' },
  { path: '/admin/rmas', label: 'RMA', group: 'Verkoop' },
  { path: '/admin/tools', label: 'Tools', group: 'Admin' },
  { path: '/admin/import', label: 'Import', group: 'Admin' },
  { path: '/admin/settings', label: 'Instellingen', group: 'Admin' },
]

export default function RolesClient() {
  const [items, setItems] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [includeInPlanning, setIncludeInPlanning] = useState(true)
  const [isSystemAdmin, setIsSystemAdmin] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editIncludeInPlanning, setEditIncludeInPlanning] = useState(true)
  const [editIsSystemAdmin, setEditIsSystemAdmin] = useState(false)
  const [showPermissions, setShowPermissions] = useState<string | null>(null)
  const [rolePermissions, setRolePermissions] = useState<{ [key: string]: boolean }>({})
  const [savingPermissions, setSavingPermissions] = useState(false)

  const loadItems = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiFetch("/api/roles")
      if (!data.success) {
        throw new Error(data.error || "Failed to load roles")
      }
      setItems(data.items || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadItems()
  }, [])

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      setError(null)
      const data = await apiFetch("/api/roles", {
        method: "POST",
        body: JSON.stringify({ name, description, includeInPlanning, isSystemAdmin })
      })
      if (!data.success) {
        throw new Error(data.error || "Failed to create role")
      }
      setName("")
      setDescription("")
      setIncludeInPlanning(true)
      setIsSystemAdmin(false)
      await loadItems()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDelete = async (item: Role) => {
    if (!item.id) {
      setError("Rol heeft geen geldig id.")
      return
    }
    if (!confirm(`Verwijder rol "${item.name}"?`)) return
    try {
      const data = await apiFetch(`/api/roles/${item.id}`, { method: "DELETE" })
      if (!data.success) {
        throw new Error(data.error || "Failed to delete role")
      }
      await loadItems()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const startEdit = (item: Role) => {
    setEditingId(item.id)
    setEditName(item.name)
    setEditDescription(item.description || "")
    setEditIncludeInPlanning(Boolean(item.includeInPlanning))
    setEditIsSystemAdmin(Boolean(item.isSystemAdmin))
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName("")
    setEditDescription("")
    setEditIncludeInPlanning(true)
    setEditIsSystemAdmin(false)
  }

  const saveEdit = async () => {
    try {
      if (!editingId) return
      setError(null)
      const data = await apiFetch(`/api/roles/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editName,
          description: editDescription,
          includeInPlanning: editIncludeInPlanning,
          isSystemAdmin: editIsSystemAdmin
        })
      })
      if (!data.success) {
        throw new Error(data.error || "Failed to update role")
      }
      cancelEdit()
      await loadItems()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleShowPermissions = (role: Role) => {
    setShowPermissions(role.id)
    const perms = role.permissions?.pages || {}
    setRolePermissions(perms)
  }

  const togglePageAccess = (path: string) => {
    setRolePermissions({
      ...rolePermissions,
      [path]: !rolePermissions[path],
    })
  }

  const handleSavePermissions = async (roleId: string) => {
    try {
      setSavingPermissions(true)
      const data = await apiFetch(`/api/roles/${roleId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          permissions: {
            pages: rolePermissions,
          },
        }),
      })

      if (!data.success) {
        throw new Error(data.error || 'Failed to save permissions')
      }

      alert('Permissies opgeslagen!')
      setShowPermissions(null)
      await loadItems()
    } catch (error: any) {
      console.error('Failed to save permissions:', error)
      alert('Er is een fout opgetreden: ' + error.message)
    } finally {
      setSavingPermissions(false)
    }
  }

  const groupedPages = ALL_PAGES.reduce((acc, page) => {
    if (!acc[page.group]) acc[page.group] = []
    acc[page.group].push(page)
    return acc
  }, {} as Record<string, typeof ALL_PAGES>)

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Nieuwe rol</h2>
        <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={handleCreate}>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Naam
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Omschrijving
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optioneel"
            />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm text-slate-700">
            <span>Opnemen in planning</span>
            <label className="relative inline-block h-6 w-11 cursor-pointer">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={includeInPlanning}
                onChange={(event) => setIncludeInPlanning(event.target.checked)}
              />
              <span className="absolute inset-0 rounded-full bg-slate-200 transition-all duration-300 ease-in-out peer-checked:bg-emerald-500 peer-focus:ring-2 peer-focus:ring-emerald-300 peer-focus:ring-offset-2" />
              <span className="absolute left-1 top-1 h-4 w-4 transform rounded-full bg-white shadow-md transition-all duration-300 ease-in-out peer-checked:translate-x-5" />
            </label>
          </label>
          <label className="flex items-center justify-between gap-3 text-sm text-slate-700">
            <span>Is admin</span>
            <label className="relative inline-block h-6 w-11 cursor-pointer">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={isSystemAdmin}
                onChange={(event) => setIsSystemAdmin(event.target.checked)}
              />
              <span className="absolute inset-0 rounded-full bg-slate-200 transition-all duration-300 ease-in-out peer-checked:bg-emerald-500 peer-focus:ring-2 peer-focus:ring-emerald-300 peer-focus:ring-offset-2" />
              <span className="absolute left-1 top-1 h-4 w-4 transform rounded-full bg-white shadow-md transition-all duration-300 ease-in-out peer-checked:translate-x-5" />
            </label>
          </label>
          <div className="flex items-end">
            <button
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
              type="submit"
            >
              Opslaan
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Rollen</h2>
          <button
            className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
            type="button"
            onClick={loadItems}
          >
            Verversen
          </button>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Laden...</p>
        ) : items.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Nog geen rollen.</p>
        ) : (
          <div className="mt-4 grid gap-4">
            {items.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-slate-100 bg-slate-50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  {editingId === item.id ? (
                    <div className="w-full space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="grid gap-2 text-sm font-medium text-slate-700">
                          Naam
                          <input
                            className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                            value={editName}
                            onChange={(event) => setEditName(event.target.value)}
                          />
                        </label>
                        <label className="grid gap-2 text-sm font-medium text-slate-700">
                          Omschrijving
                          <input
                            className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                            value={editDescription}
                            onChange={(event) => setEditDescription(event.target.value)}
                          />
                        </label>
                      </div>
                      <label className="flex items-center justify-between gap-3 text-sm text-slate-700">
                        <span>Opnemen in planning</span>
                        <label className="relative inline-block h-6 w-11 cursor-pointer">
                          <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={editIncludeInPlanning}
                            onChange={(event) => setEditIncludeInPlanning(event.target.checked)}
                          />
                          <span className="absolute inset-0 rounded-full bg-slate-200 transition-all duration-300 ease-in-out peer-checked:bg-emerald-500 peer-focus:ring-2 peer-focus:ring-emerald-300 peer-focus:ring-offset-2" />
                          <span className="absolute left-1 top-1 h-4 w-4 transform rounded-full bg-white shadow-md transition-all duration-300 ease-in-out peer-checked:translate-x-5" />
                        </label>
                      </label>
                      <label className="flex items-center justify-between gap-3 text-sm text-slate-700">
                        <span>Is admin</span>
                        <label className="relative inline-block h-6 w-11 cursor-pointer">
                          <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={editIsSystemAdmin}
                            onChange={(event) => setEditIsSystemAdmin(event.target.checked)}
                          />
                          <span className="absolute inset-0 rounded-full bg-slate-200 transition-all duration-300 ease-in-out peer-checked:bg-emerald-500 peer-focus:ring-2 peer-focus:ring-emerald-300 peer-focus:ring-offset-2" />
                          <span className="absolute left-1 top-1 h-4 w-4 transform rounded-full bg-white shadow-md transition-all duration-300 ease-in-out peer-checked:translate-x-5" />
                        </label>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
                          type="button"
                          onClick={saveEdit}
                        >
                          Opslaan
                        </button>
                        <button
                          className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          type="button"
                          onClick={cancelEdit}
                        >
                          Annuleren
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{item.name}</h3>
                        <p className="text-sm text-slate-600">
                          {item.description || "Geen omschrijving"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Is admin: {item.isSystemAdmin ? "Ja" : "Nee"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Opnemen in planning: {item.includeInPlanning ? "Ja" : "Nee"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
                          type="button"
                          onClick={() => startEdit(item)}
                        >
                          Bewerken
                        </button>
                        <button
                          className="rounded-lg border border-blue-200 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50"
                          type="button"
                          onClick={() => handleShowPermissions(item)}
                        >
                          Permissies
                        </button>
                        <button
                          className="rounded-lg border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                          type="button"
                          onClick={() => handleDelete(item)}
                        >
                          Verwijderen
                        </button>
                      </div>
                    </>
                  )}
                </div>
                
                {/* Permissions Panel */}
                {showPermissions === item.id && (
                  <div className="mt-4 border-t pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-semibold text-slate-900">Toegangsrechten voor {item.name}</h4>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSavePermissions(item.id)}
                          disabled={savingPermissions}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                        >
                          {savingPermissions ? 'Opslaan...' : 'Opslaan'}
                        </button>
                        <button
                          onClick={() => setShowPermissions(null)}
                          className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 text-sm"
                        >
                          Sluiten
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {Object.entries(groupedPages).map(([group, pages]) => (
                        <div key={group} className="border-t pt-3 first:border-t-0 first:pt-0">
                          <h5 className="font-medium text-slate-900 mb-2">{group}</h5>
                          <div className="space-y-2">
                            {pages.map((page) => (
                              <label
                                key={page.path}
                                className="flex items-center justify-between p-2 rounded border border-slate-200 hover:bg-slate-50 cursor-pointer"
                              >
                                <div>
                                  <div className="font-medium text-sm">{page.label}</div>
                                  <div className="text-xs text-slate-500">{page.path}</div>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={rolePermissions[page.path] || false}
                                  onChange={() => togglePageAccess(page.path)}
                                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
