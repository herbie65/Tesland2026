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
  icalUrl?: string | null
  voipExtension?: string | null
}

type PlanningRole = {
  id: string
  name: string
  isSystemAdmin?: boolean
  permissions?: any
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

export default function UsersClient() {
  const [items, setItems] = useState<User[]>([])
  const [roles, setRoles] = useState<PlanningRole[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'users' | 'permissions'>('users')
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
  const [editIcalUrl, setEditIcalUrl] = useState("")
  const [editVoipExtension, setEditVoipExtension] = useState("")
  const [showPhotoPicker, setShowPhotoPicker] = useState(false)
  const [showEditPhotoPicker, setShowEditPhotoPicker] = useState(false)
  
  // Role permissions state
  const [selectedRoleForPermissions, setSelectedRoleForPermissions] = useState<string | null>(null)
  const [rolePermissions, setRolePermissions] = useState<{ [key: string]: boolean }>({})
  const [savingPermissions, setSavingPermissions] = useState(false)

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
      const usersData = await apiFetch("/api/users")
      if (!usersData.success) {
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
      const data = await apiFetch("/api/roles")
      if (data.success) {
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
      const data = await apiFetch("/api/users", {
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
      if (!data.success) {
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
      const data = await apiFetch(`/api/users/${item.id}`, { method: "DELETE" })
      if (!data.success) {
        throw new Error(data.error || "Failed to delete user")
      }
      await loadItems()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleColorUpdate = async (item: User, nextColor: string) => {
    try {
      const data = await apiFetch(`/api/users/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ color: nextColor })
      })
      if (!data.success) {
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
    setEditIcalUrl(item.icalUrl || "")
    setEditVoipExtension(item.voipExtension || "")
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
    setEditIcalUrl("")
    setEditVoipExtension("")
  }

  const saveEdit = async () => {
    try {
      if (!editingId) return
      setError(null)
      if (editRoleId === "none") {
        setError("Selecteer een rol.")
        return
      }
      
      const icalUrlValue = editIcalUrl?.trim() || null
      const voipExtensionValue = editVoipExtension?.trim() || null
      console.log('Saving user with icalUrl:', icalUrlValue)
      
      const data = await apiFetch(`/api/users/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify({
          displayName: editName,
          email: editEmail,
          photoURL: editPhotoUrl || null,
          roleId: editRoleId === "none" ? null : editRoleId,
          active: editActive,
          color: editColor,
          planningHoursPerDay: editPlanningHoursPerDay,
          workingDays: editWorkingDays,
          icalUrl: icalUrlValue,
          voipExtension: voipExtensionValue
        })
      })
      
      console.log('Save response:', data)
      
      if (!data.success) {
        throw new Error(data.error || "Failed to update user")
      }
      
      alert(icalUrlValue ? 'Gebruiker opgeslagen! iCal kalender gekoppeld.' : 'Gebruiker opgeslagen!')
      
      cancelEdit()
      await loadItems()
    } catch (err: any) {
      console.error('Save error:', err)
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

  const handleRoleSelect = (role: PlanningRole) => {
    setSelectedRoleForPermissions(role.id)
    const perms = role.permissions?.pages || {}
    setRolePermissions(perms)
  }

  const togglePageAccess = (path: string) => {
    setRolePermissions({
      ...rolePermissions,
      [path]: !rolePermissions[path],
    })
  }

  const handleSavePermissions = async () => {
    if (!selectedRoleForPermissions) return

    try {
      setSavingPermissions(true)
      const data = await apiFetch(`/api/roles/${selectedRoleForPermissions}`, {
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
      await loadRoles()
    } catch (error: any) {
      console.error('Failed to save permissions:', error)
      alert('Er is een fout opgetreden: ' + error.message)
    } finally {
      setSavingPermissions(false)
    }
  }

  const selectedRoleData = roles.find((r) => r.id === selectedRoleForPermissions)
  const groupedPages = ALL_PAGES.reduce((acc, page) => {
    if (!acc[page.group]) acc[page.group] = []
    acc[page.group].push(page)
    return acc
  }, {} as Record<string, typeof ALL_PAGES>)

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
      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Gebruikers ({items.length})
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'permissions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Rol Permissies
          </button>
        </nav>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <>
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
          {/* Kleur, Uren per dag en Werkdagen worden beheerd in HR Instellingen */}
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
                        {/* Kleur, Uren per dag en Werkdagen worden beheerd in HR Instellingen */}
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
                      <div className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                        <label className="grid gap-2">
                          iCal kalender URL
                          <input
                            className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                            value={editIcalUrl}
                            onChange={(event) => setEditIcalUrl(event.target.value)}
                            placeholder="https://calendar.google.com/calendar/ical/..."
                          />
                          <p className="text-xs text-slate-500">
                            Plak hier de URL van een externe iCal kalender (Google Calendar, Outlook, etc.) om deze in de planning te tonen.
                          </p>
                        </label>
                      </div>
                      <div className="grid gap-2 text-sm font-medium text-slate-700">
                        <label className="grid gap-2">
                          VoIP Extensie / Eindbestemming
                          <input
                            className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                            value={editVoipExtension}
                            onChange={(event) => setEditVoipExtension(event.target.value)}
                            placeholder="206"
                          />
                          <p className="text-xs text-slate-500">
                            Het toestel/extensie nummer dat gebeld wordt bij klik-en-bel (bijv. 206, 101, etc.)
                          </p>
                        </label>
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
                        {item.icalUrl ? (
                          <p className="mt-1 text-xs flex items-center gap-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700 font-medium">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              iCal kalender gekoppeld
                            </span>
                          </p>
                        ) : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
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
        </>
      )}

      {/* Permissions Tab */}
      {activeTab === 'permissions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Roles List */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow-sm rounded-lg p-4">
              <h3 className="font-semibold mb-4">Rollen</h3>
              <div className="space-y-2">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => handleRoleSelect(role)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition ${
                      selectedRoleForPermissions === role.id
                        ? 'bg-blue-50 border-blue-500'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-medium">{role.name}</div>
                    {role.isSystemAdmin && (
                      <div className="text-xs text-slate-500 mt-1">System Admin</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Permissions Grid */}
          <div className="lg:col-span-2">
            {selectedRoleData ? (
              <div className="bg-white shadow-sm rounded-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold">{selectedRoleData.name}</h3>
                  <button
                    onClick={handleSavePermissions}
                    disabled={savingPermissions}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingPermissions ? 'Opslaan...' : 'Opslaan'}
                  </button>
                </div>

                <div className="space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
                  {Object.entries(groupedPages).map(([group, pages]) => (
                    <div key={group} className="border-t pt-4 first:border-t-0 first:pt-0">
                      <h4 className="font-medium text-slate-900 mb-3">{group}</h4>
                      <div className="space-y-2">
                        {pages.map((page) => (
                          <label
                            key={page.path}
                            className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
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
            ) : (
              <div className="bg-white shadow-sm rounded-lg p-12 text-center text-slate-500">
                Selecteer een rol om permissies in te stellen
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
