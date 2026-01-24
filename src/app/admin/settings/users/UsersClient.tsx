"use client"

import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"
import MediaPickerModal from "../../components/MediaPickerModal"

type User = {
  id: string
  name: string
  email: string
  role?: string | null
  roleId?: string | null
  photoUrl?: string | null
  active?: boolean
  color?: string | null
  planningHoursPerDay?: number | null
  workingDays?: string[]
  lastLoginAt?: string | null
}

type PlanningRole = {
  id: string
  name: string
  isSystemAdmin?: boolean
}

export default function UsersClient() {
  const [items, setItems] = useState<User[]>([])
  const [roles, setRoles] = useState<PlanningRole[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [photoUrl, setPhotoUrl] = useState("")
  const [roleId, setRoleId] = useState("none")
  const [active, setActive] = useState(true)
  const [color, setColor] = useState("#4f46e5")
  const [planningHoursPerDay, setPlanningHoursPerDay] = useState(8)
  const [workingDays, setWorkingDays] = useState<string[]>(["mon", "tue", "wed", "thu", "fri"])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editPhotoUrl, setEditPhotoUrl] = useState("")
  const [editRoleId, setEditRoleId] = useState("none")
  const [editActive, setEditActive] = useState(true)
  const [editColor, setEditColor] = useState("#4f46e5")
  const [editPlanningHoursPerDay, setEditPlanningHoursPerDay] = useState(8)
  const [editWorkingDays, setEditWorkingDays] = useState<string[]>(["mon", "tue", "wed", "thu", "fri"])
  const [showPhotoPicker, setShowPhotoPicker] = useState(false)
  const [showEditPhotoPicker, setShowEditPhotoPicker] = useState(false)

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

  const loadRoles = async () => {
    try {
      const response = await apiFetch("/api/roles")
      const data = await response.json()
      if (response.ok && data.success) {
        setRoles(data.items || [])
      } else {
        setRoles([])
      }
    } catch {
      setRoles([])
    }
  }

  useEffect(() => {
    loadItems()
    loadRoles()
  }, [])

  useEffect(() => {
    if (roleId !== "none") return
    if (roles.length === 0) return
    setRoleId(roles[0].id)
  }, [roles, roleId])

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      setError(null)
      if (roleId === "none") {
        setError("Selecteer een rol.")
        return
      }
      const response = await apiFetch("/api/users", {
        method: "POST",
        body: JSON.stringify({
          displayName: name,
          email,
          password,
          photoUrl: photoUrl || null,
          roleId: roleId === "none" ? null : roleId,
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
      setPassword("")
      setPhotoUrl("")
      setRoleId("none")
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
    setEditPhotoUrl(item.photoUrl || "")
    const mappedRoleId =
      item.roleId ||
      (item.role ? roles.find((entry) => entry.name === item.role || entry.id === item.role)?.id : undefined) ||
      "none"
    setEditRoleId(mappedRoleId)
    setEditActive(item.active !== false)
    setEditColor(item.color || "#4f46e5")
    setEditPlanningHoursPerDay(item.planningHoursPerDay || 8)
    setEditWorkingDays(item.workingDays?.length ? item.workingDays : ["mon", "tue", "wed", "thu", "fri"])
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName("")
    setEditEmail("")
    setEditPhotoUrl("")
    setEditRoleId("none")
    setEditActive(true)
    setEditColor("#4f46e5")
    setEditPlanningHoursPerDay(8)
    setEditWorkingDays(["mon", "tue", "wed", "thu", "fri"])
  }

  const saveEdit = async () => {
    try {
      if (!editingId) return
      setError(null)
      if (editRoleId === "none") {
        setError("Selecteer een rol.")
        return
      }
      const response = await apiFetch(`/api/users/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify({
          displayName: editName,
          email: editEmail,
          photoURL: editPhotoUrl || null,
          roleId: editRoleId === "none" ? null : editRoleId,
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

  const planningRoleLabel = (item: User) => {
    if (!item.roleId) return "Geen rol"
    return roles.find((entry) => entry.id === item.roleId)?.name || item.roleId
  }

  const getInitials = (value?: string | null) => {
    if (!value) return "?"
    return value
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "?"
  }

  const formatAddress = (address: any): string => {
    if (!address) return '-'
    if (typeof address === 'string') return address
    if (typeof address === 'object') {
      const parts = [
        address.street,
        address.postalCode,
        address.city,
        address.country
      ].filter(Boolean)
      return parts.join(', ') || '-'
    }
    return '-'
  }

  const renderUserAvatar = (item: User) => {
    if (item.photoUrl) {
      return (
        <img
          src={item.photoUrl}
          alt={item.name}
          className="h-10 w-10 rounded-full border border-slate-200 object-cover"
        />
      )
    }
    return (
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white"
        style={{ backgroundColor: item.color || "#94a3b8" }}
        aria-label={item.name}
      >
        {getInitials(item.name)}
      </div>
    )
  }

  const adminRole = roles.find((entry) => entry.isSystemAdmin)
  const defaultRole = roles.find((entry) => !entry.isSystemAdmin) || roles[0]
  const isAdminSelected =
    roleId !== "none" && roles.find((entry) => entry.id === roleId)?.isSystemAdmin === true
  const isEditAdminSelected =
    editRoleId !== "none" && roles.find((entry) => entry.id === editRoleId)?.isSystemAdmin === true

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Nieuwe gebruiker</h2>
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
            Wachtwoord
            <input
              type="password"
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              placeholder="Minimaal 6 tekens"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
            Profielfoto URL
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              value={photoUrl}
              onChange={(event) => setPhotoUrl(event.target.value)}
              placeholder="https://"
            />
            <button
              className="glass-button w-fit rounded-lg px-3 py-1 text-xs"
              type="button"
              onClick={() => setShowPhotoPicker(true)}
            >
              Media kiezen
            </button>
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Rol
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-base"
              value={roleId}
              onChange={(event) => setRoleId(event.target.value)}
            >
              <option value="none">Geen rol</option>
              {roles.map((roleEntry) => (
                <option key={roleEntry.id} value={roleEntry.id}>
                  {roleEntry.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center justify-between gap-3 text-sm text-slate-700">
            <span>Is admin</span>
            <span className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={isAdminSelected}
                disabled={!adminRole}
                onChange={(event) => {
                  if (event.target.checked) {
                    setRoleId(adminRole?.id || "none")
                  } else if (roleId === adminRole?.id) {
                    setRoleId(defaultRole?.id || "none")
                  }
                }}
              />
              <span className="relative h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-emerald-500 peer-disabled:bg-slate-100">
                <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5" />
              </span>
            </span>
          </label>
          {!adminRole ? (
            <p className="text-xs text-slate-500 sm:col-span-2">
              Maak in Rollen eerst een rol met “Is admin” aan.
            </p>
          ) : null}
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
                        <label className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                          Profielfoto URL
                          <input
                            className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                            value={editPhotoUrl}
                            onChange={(event) => setEditPhotoUrl(event.target.value)}
                            placeholder="https://"
                          />
                          <button
                            className="glass-button w-fit rounded-lg px-3 py-1 text-xs"
                            type="button"
                            onClick={() => setShowEditPhotoPicker(true)}
                          >
                            Media kiezen
                          </button>
                        </label>
                        <label className="grid gap-2 text-sm font-medium text-slate-700">
                          Rol
                          <select
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-base"
                            value={editRoleId}
                            onChange={(event) => setEditRoleId(event.target.value)}
                          >
                            <option value="none">Geen rol</option>
                            {roles.map((roleEntry) => (
                              <option key={roleEntry.id} value={roleEntry.id}>
                                {roleEntry.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex items-center justify-between gap-3 text-sm text-slate-700">
                          <span>Is admin</span>
                          <span className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              className="peer sr-only"
                              checked={isEditAdminSelected}
                              disabled={!adminRole}
                              onChange={(event) => {
                                if (event.target.checked) {
                                  setEditRoleId(adminRole?.id || "none")
                                } else if (editRoleId === adminRole?.id) {
                                  setEditRoleId(defaultRole?.id || "none")
                                }
                              }}
                            />
                            <span className="relative h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-emerald-500 peer-disabled:bg-slate-100">
                              <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5" />
                            </span>
                          </span>
                        </label>
                        {!adminRole ? (
                          <p className="text-xs text-slate-500 sm:col-span-2">
                            Maak in Rollen eerst een rol met “Is admin” aan.
                          </p>
                        ) : null}
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
                        <label className="flex items-center justify-between gap-3 text-sm text-slate-700">
                          <span>Actief</span>
                          <label className="relative inline-block h-6 w-11 cursor-pointer">
                            <input
                              type="checkbox"
                              className="peer sr-only"
                              checked={editActive}
                              onChange={(event) => setEditActive(event.target.checked)}
                            />
                            <span className="absolute inset-0 rounded-full bg-slate-200 transition-all duration-300 ease-in-out peer-checked:bg-emerald-500 peer-focus:ring-2 peer-focus:ring-emerald-300 peer-focus:ring-offset-2" />
                            <span className="absolute left-1 top-1 h-4 w-4 transform rounded-full bg-white shadow-md transition-all duration-300 ease-in-out peer-checked:translate-x-5" />
                          </label>
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
                      <div className="flex items-start gap-3">
                        {renderUserAvatar(item)}
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">{item.name}</h3>
                        <p className="text-sm text-slate-600">{item.email}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Planning rol: {planningRoleLabel(item)}
                        </p>
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

      <MediaPickerModal
        isOpen={showPhotoPicker}
        onClose={() => setShowPhotoPicker(false)}
        onSelect={(url) => setPhotoUrl(url)}
        title="Kies profielfoto"
        category="profile"
      />

      <MediaPickerModal
        isOpen={showEditPhotoPicker}
        onClose={() => setShowEditPhotoPicker(false)}
        onSelect={(url) => setEditPhotoUrl(url)}
        title="Kies profielfoto"
        category="profile"
      />
    </div>
  )
}
