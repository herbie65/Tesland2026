"use client"

import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"

type User = {
  id: string
  name: string
  email: string
  role?: string | null
  roleId?: string | null
  active?: boolean
  color?: string | null
  planningHoursPerDay?: number | null
  workingDays?: string[]
  lastLoginAt?: string | null
}

const SYSTEM_ROLES = [
  { value: "SYSTEM_ADMIN", label: "System admin" },
  { value: "MANAGEMENT", label: "Management" },
  { value: "MAGAZIJN", label: "Magazijn" },
  { value: "MONTEUR", label: "Monteur" },
  { value: "CONTENT_EDITOR", label: "Content editor" }
]

export default function UsersClient() {
  const [items, setItems] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("MANAGEMENT")
  const [active, setActive] = useState(true)
  const [color, setColor] = useState("#4f46e5")
  const [planningHoursPerDay, setPlanningHoursPerDay] = useState(8)
  const [workingDays, setWorkingDays] = useState<string[]>(["mon", "tue", "wed", "thu", "fri"])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editRole, setEditRole] = useState("MANAGEMENT")
  const [editActive, setEditActive] = useState(true)
  const [editColor, setEditColor] = useState("#4f46e5")
  const [editPlanningHoursPerDay, setEditPlanningHoursPerDay] = useState(8)
  const [editWorkingDays, setEditWorkingDays] = useState<string[]>(["mon", "tue", "wed", "thu", "fri"])
  const [canEditRoles, setCanEditRoles] = useState(false)

  const dayLabels: Record<string, string> = {
    mon: "Ma",
    tue: "Di",
    wed: "Wo",
    thu: "Do",
    fri: "Vr",
    sat: "Za",
    sun: "Zo"
  }

  const loadItems = async () => {
    try {
      setLoading(true)
      setError(null)
      const usersResponse = await apiFetch("/api/users")
      const usersData = await usersResponse.json()
      if (!usersResponse.ok || !usersData.success) {
        throw new Error(usersData.error || "Failed to load users")
      }
      setItems(usersData.items || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadCurrentRole = async () => {
    try {
      const response = await apiFetch("/api/admin/me")
      const data = await response.json()
      if (response.ok && data.success) {
        setCanEditRoles(data.user?.role === "SYSTEM_ADMIN")
      }
    } catch (err) {
      setCanEditRoles(false)
    }
  }

  useEffect(() => {
    loadItems()
    loadCurrentRole()
  }, [])

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      setError(null)
      const response = await apiFetch("/api/users", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          role,
          active,
          color,
          planningHoursPerDay,
          workingDays
        })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to create user")
      }
      setName("")
      setEmail("")
      setRole("MANAGEMENT")
      setActive(true)
      setColor("#4f46e5")
      setPlanningHoursPerDay(8)
      setWorkingDays(["mon", "tue", "wed", "thu", "fri"])
      await loadItems()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDelete = async (item: User) => {
    if (!confirm(`Verwijder gebruiker "${item.name}"?`)) return
    try {
      const response = await apiFetch(`/api/users/${item.id}`, { method: "DELETE" })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to delete user")
      }
      await loadItems()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleColorUpdate = async (item: User, nextColor: string) => {
    try {
      const response = await apiFetch(`/api/users/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ color: nextColor })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to update user")
      }
      await loadItems()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const toggleWorkingDay = (day: string) => {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((value) => value !== day) : [...prev, day]
    )
  }

  const toggleEditWorkingDay = (day: string) => {
    setEditWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((value) => value !== day) : [...prev, day]
    )
  }

  const startEdit = (item: User) => {
    setEditingId(item.id)
    setEditName(item.name)
    setEditEmail(item.email)
    setEditRole(item.role || "MANAGEMENT")
    setEditActive(item.active !== false)
    setEditColor(item.color || "#4f46e5")
    setEditPlanningHoursPerDay(item.planningHoursPerDay || 8)
    setEditWorkingDays(item.workingDays?.length ? item.workingDays : ["mon", "tue", "wed", "thu", "fri"])
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName("")
    setEditEmail("")
    setEditRole("MANAGEMENT")
    setEditActive(true)
    setEditColor("#4f46e5")
    setEditPlanningHoursPerDay(8)
    setEditWorkingDays(["mon", "tue", "wed", "thu", "fri"])
  }

  const saveEdit = async () => {
    try {
      if (!editingId) return
      setError(null)
      const response = await apiFetch(`/api/users/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          role: editRole,
          active: editActive,
          color: editColor,
          planningHoursPerDay: editPlanningHoursPerDay,
          workingDays: editWorkingDays
        })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to update user")
      }
      cancelEdit()
      await loadItems()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const roleLabel = (item: User) => {
    if (!item.role) return "Geen rol"
    return SYSTEM_ROLES.find((entry) => entry.value === item.role)?.label || item.role
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Nieuwe gebruiker</h2>
        {!canEditRoles ? (
          <p className="mt-2 text-sm text-amber-700">
            Alleen system admins kunnen gebruikers en rollen aanpassen.
          </p>
        ) : null}
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
            Email
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Rol
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-base"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              disabled={!canEditRoles}
            >
              {SYSTEM_ROLES.map((roleEntry) => (
                <option key={roleEntry.value} value={roleEntry.value}>
                  {roleEntry.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Kleur
            <input
              className="h-11 rounded-lg border border-slate-200 bg-white px-3"
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Uren per dag
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              type="number"
              min="1"
              max="12"
              step="0.5"
              value={planningHoursPerDay}
              onChange={(event) => setPlanningHoursPerDay(Number(event.target.value))}
            />
          </label>
          <div className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
            Werkdagen
            <div className="flex flex-wrap gap-2">
              {Object.entries(dayLabels).map(([dayKey, label]) => (
                <button
                  key={dayKey}
                  type="button"
                  className={`rounded-lg border px-3 py-1 text-sm ${
                    workingDays.includes(dayKey)
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                  onClick={() => toggleWorkingDay(dayKey)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
            />
            Actief
          </label>
          <div className="flex items-end">
            <button
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={!canEditRoles}
            >
              Opslaan
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Gebruikers</h2>
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
          <p className="mt-4 text-sm text-slate-500">Nog geen gebruikers.</p>
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
                          Email
                          <input
                            className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                            value={editEmail}
                            onChange={(event) => setEditEmail(event.target.value)}
                          />
                        </label>
                        <label className="grid gap-2 text-sm font-medium text-slate-700">
                          Rol
                          <select
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-base"
                            value={editRole}
                            onChange={(event) => setEditRole(event.target.value)}
                            disabled={!canEditRoles}
                          >
                            {SYSTEM_ROLES.map((roleEntry) => (
                              <option key={roleEntry.value} value={roleEntry.value}>
                                {roleEntry.label}
                              </option>
                            ))}
                          </select>
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
                        <label className="grid gap-2 text-sm font-medium text-slate-700">
                          Uren per dag
                          <input
                            className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                            type="number"
                            min="1"
                            max="12"
                            step="0.5"
                            value={editPlanningHoursPerDay}
                            onChange={(event) =>
                              setEditPlanningHoursPerDay(Number(event.target.value))
                            }
                          />
                        </label>
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={editActive}
                            onChange={(event) => setEditActive(event.target.checked)}
                          />
                          Actief
                        </label>
                      </div>
                      <div className="grid gap-2 text-sm font-medium text-slate-700">
                        Werkdagen
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(dayLabels).map(([dayKey, label]) => (
                            <button
                              key={dayKey}
                              type="button"
                              className={`rounded-lg border px-3 py-1 text-sm ${
                                editWorkingDays.includes(dayKey)
                                  ? "border-slate-900 bg-slate-900 text-white"
                                  : "border-slate-200 text-slate-700 hover:bg-slate-50"
                              }`}
                              onClick={() => toggleEditWorkingDay(dayKey)}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                          type="button"
                          onClick={saveEdit}
                          disabled={!canEditRoles}
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
                        <p className="text-sm text-slate-600">{item.email}</p>
                        <p className="mt-1 text-xs text-slate-500">{roleLabel(item)}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Laatste login: {item.lastLoginAt || "Onbekend"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.active === false ? "Inactief" : "Actief"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.planningHoursPerDay ? `${item.planningHoursPerDay} uur/dag` : "Uren onbekend"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.workingDays?.length ? item.workingDays.map((day) => dayLabels[day]).join(", ") : "Geen werkdagen"}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <span className="text-xs text-slate-500">Kleur</span>
                          <input
                            className="h-9 w-12 rounded-lg border border-slate-200 bg-white"
                            type="color"
                            value={item.color || "#4f46e5"}
                            onChange={(event) => handleColorUpdate(item, event.target.value)}
                            title="Kleur van deze werknemer"
                          />
                        </label>
                        <button
                          className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          type="button"
                          onClick={() => startEdit(item)}
                          disabled={!canEditRoles}
                        >
                          Bewerken
                        </button>
                        <button
                          className="rounded-lg border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          type="button"
                          onClick={() => handleDelete(item)}
                          disabled={!canEditRoles}
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
