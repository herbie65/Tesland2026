"use client"

import { useEffect, useState } from "react"

type Role = {
  id: string
  name: string
  description?: string | null
  permissions?: string[]
  includeInPlanning?: boolean
  isSystemAdmin?: boolean
}

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

  const loadItems = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/roles")
      const data = await response.json()
      if (!response.ok || !data.success) {
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
      const response = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, includeInPlanning, isSystemAdmin })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
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
      const response = await fetch(`/api/roles/${item.id}`, { method: "DELETE" })
      const data = await response.json()
      if (!response.ok || !data.success) {
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
      const response = await fetch(`/api/roles/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          description: editDescription,
          includeInPlanning: editIncludeInPlanning,
          isSystemAdmin: editIsSystemAdmin
        })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to update role")
      }
      cancelEdit()
      await loadItems()
    } catch (err: any) {
      setError(err.message)
    }
  }

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
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
