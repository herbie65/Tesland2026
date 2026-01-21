"use client"

import { useEffect, useState } from "react"

type PlanningType = {
  id: string
  name: string
  color: string
}

export default function PlanningTypes() {
  const [items, setItems] = useState<PlanningType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [color, setColor] = useState("#22c55e")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editColor, setEditColor] = useState("#22c55e")

  const loadItems = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/planning-types")
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to load planning types")
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
      const response = await fetch("/api/planning-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to create planning type")
      }
      setName("")
      setColor("#22c55e")
      await loadItems()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const startEdit = (item: PlanningType) => {
    setEditingId(item.id)
    setEditName(item.name)
    setEditColor(item.color)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName("")
    setEditColor("#22c55e")
  }

  const saveEdit = async () => {
    try {
      if (!editingId) return
      setError(null)
      const response = await fetch(`/api/planning-types/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, color: editColor })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to update planning type")
      }
      cancelEdit()
      await loadItems()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDelete = async (item: PlanningType) => {
    if (!confirm(`Verwijder type "${item.name}"?`)) return
    try {
      const response = await fetch(`/api/planning-types/${item.id}`, { method: "DELETE" })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to delete planning type")
      }
      await loadItems()
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Planningstypes</h2>
      </div>

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
          Kleur
          <input
            className="h-11 rounded-lg border border-slate-200 bg-white px-3"
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            required
          />
        </label>
        <div className="flex items-end">
          <button
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
            type="submit"
          >
            Toevoegen
          </button>
        </div>
      </form>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Laden...</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Nog geen planningstypes.</p>
      ) : (
        <div className="mt-4 grid gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-slate-100 bg-slate-50 p-3"
            >
              {editingId === item.id ? (
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
                    Kleur
                    <input
                      className="h-11 rounded-lg border border-slate-200 bg-white px-3"
                      type="color"
                      value={editColor}
                      onChange={(event) => setEditColor(event.target.value)}
                    />
                  </label>
                  <div className="flex flex-wrap gap-2 sm:col-span-2">
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
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex h-3 w-3 rounded-full"
                      style={{ background: item.color }}
                    />
                    <span className="text-sm font-semibold text-slate-900">{item.name}</span>
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
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
