"use client"

import { useEffect, useState } from "react"
import { SETTINGS_DEFAULTS } from "@/lib/settings-defaults"
import PlanningTypes from "./PlanningTypes"
import { apiFetch } from "@/lib/api"
import MediaPickerModal from "../components/MediaPickerModal"

type SettingsGroup = {
  id: string
  group: string
  data: Record<string, any>
}

export default function SettingsClient() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [settings, setSettings] = useState<Record<string, any>>(SETTINGS_DEFAULTS)
  const [isSystemAdmin, setIsSystemAdmin] = useState(false)
  const [profile, setProfile] = useState({
    profilePhoto: '',
    backgroundPhoto: '',
    transparency: 30
  })
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileSaving, setProfileSaving] = useState(false)
  const [showProfilePicker, setShowProfilePicker] = useState(false)
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false)
  const [emailSaving, setEmailSaving] = useState(false)
  const [rdwSaving, setRdwSaving] = useState(false)

  const loadSettings = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiFetch("/api/settings")
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to load settings")
      }
      const merged: Record<string, any> = { ...SETTINGS_DEFAULTS }
      ;(data.items || []).forEach((item: SettingsGroup) => {
        merged[item.id] = { ...merged[item.id], ...(item.data || {}) }
      })
      setSettings(merged)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const bootstrapDefaults = async () => {
    try {
      setError(null)
      setSuccess(null)
      const response = await apiFetch("/api/settings/bootstrap", { method: "POST" })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to bootstrap settings")
      }
      setSuccess("Defaults zijn opgeslagen.")
      await loadSettings()
    } catch (err: any) {
      setError(err.message)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    const loadRole = async () => {
      try {
        const response = await apiFetch("/api/admin/me")
        const data = await response.json()
        if (response.ok && data.success) {
          setIsSystemAdmin(data.user?.role === "SYSTEM_ADMIN")
        }
      } catch {
        setIsSystemAdmin(false)
      }
    }
    loadRole()
  }, [])

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setProfileLoading(true)
        const response = await apiFetch("/api/admin/profile")
        const data = await response.json()
        if (response.ok && data.success) {
          setProfile({
            profilePhoto: data.profile?.profilePhoto || "",
            backgroundPhoto: data.profile?.backgroundPhoto || "",
            transparency:
              typeof data.profile?.transparency === "number"
                ? data.profile.transparency
                : 30
          })
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setProfileLoading(false)
      }
    }
    loadProfile()
  }, [])

  const updateGroup = (group: string, field: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [group]: {
        ...prev[group],
        [field]: value
      }
    }))
  }

  const planningBreaks = Array.isArray(settings.planning?.breaks) ? settings.planning.breaks : []
  const workOverviewColumns = Array.isArray(settings.workoverview?.columns)
    ? settings.workoverview.columns
    : []

  const updatePlanningBreak = (index: number, field: "start" | "end", value: string) => {
    const next = planningBreaks.map((entry: any, idx: number) =>
      idx === index ? { ...entry, [field]: value } : entry
    )
    updateGroup("planning", "breaks", next)
  }

  const addPlanningBreak = () => {
    updateGroup("planning", "breaks", [...planningBreaks, { start: "12:00", end: "12:30" }])
  }

  const removePlanningBreak = (index: number) => {
    updateGroup(
      "planning",
      "breaks",
      planningBreaks.filter((_: any, idx: number) => idx !== index)
    )
  }

  const updateWorkOverviewColumn = (index: number, value: string) => {
    const next = workOverviewColumns.map((entry: any, idx: number) =>
      idx === index ? value : entry
    )
    updateGroup("workoverview", "columns", next)
  }

  const addWorkOverviewColumn = () => {
    updateGroup("workoverview", "columns", [...workOverviewColumns, "Nieuwe kolom"])
  }

  const removeWorkOverviewColumn = (index: number) => {
    updateGroup(
      "workoverview",
      "columns",
      workOverviewColumns.filter((_: any, idx: number) => idx !== index)
    )
  }

  const saveGroup = async (group: string) => {
    try {
      setError(null)
      setSuccess(null)
      const response = await apiFetch(`/api/settings/${group}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: settings[group] })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to save settings")
      }
      setSuccess(`Instellingen opgeslagen: ${group}`)
      setTimeout(() => setSuccess(null), 2000)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const saveEmailSettings = async () => {
    try {
      setError(null)
      setSuccess(null)
      setEmailSaving(true)
      const response = await apiFetch("/api/settings/email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: settings.email })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to save email settings")
      }
      setSuccess("E-mail instellingen opgeslagen.")
      setTimeout(() => setSuccess(null), 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setEmailSaving(false)
    }
  }

  const saveRdwSettings = async () => {
    try {
      setError(null)
      setSuccess(null)
      setRdwSaving(true)
      const requiredFields = [
        "bedrijfsnummer",
        "keuringsinstantienummer",
        "kvkNaam",
        "kvkNummer",
        "kvkVestigingsnummer"
      ]
      const missing = requiredFields.filter(
        (field) => !String(settings.rdwSettings?.[field] || "").trim()
      )
      if (missing.length) {
        setError("Alle RDW-velden zijn verplicht.")
        return
      }
      const response = await apiFetch("/api/settings/rdwSettings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: settings.rdwSettings })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to save RDW settings")
      }
      setSuccess("RDW instellingen opgeslagen.")
      setTimeout(() => setSuccess(null), 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setRdwSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Personalisatie</h2>
            <p className="text-sm text-slate-600">
              Stel je profielafbeelding, achtergrond en transparantie in.
            </p>
          </div>
        </div>
        {profileLoading ? (
          <p className="mt-4 text-sm text-slate-500">Profiel laden...</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Profielfoto URL
              <input
                className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                value={profile.profilePhoto}
                onChange={(event) =>
                  setProfile((prev) => ({ ...prev, profilePhoto: event.target.value }))
                }
                placeholder="https://"
              />
              <button
                className="w-fit rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
                type="button"
                onClick={() => setShowProfilePicker(true)}
              >
                Media kiezen
              </button>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Achtergrond URL
              <input
                className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                value={profile.backgroundPhoto}
                onChange={(event) =>
                  setProfile((prev) => ({ ...prev, backgroundPhoto: event.target.value }))
                }
                placeholder="https://"
              />
              <button
                className="w-fit rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
                type="button"
                onClick={() => setShowBackgroundPicker(true)}
              >
                Media kiezen
              </button>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
              Transparantie ({profile.transparency}%)
              <input
                type="range"
                min="5"
                max="90"
                value={profile.transparency}
                onChange={(event) =>
                  setProfile((prev) => ({
                    ...prev,
                    transparency: Number(event.target.value)
                  }))
                }
              />
            </label>
            <div className="flex items-center gap-3 sm:col-span-2">
              <button
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
                type="button"
                disabled={profileSaving}
                onClick={async () => {
                  try {
                    setProfileSaving(true)
                    setError(null)
                    const response = await apiFetch("/api/admin/profile", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        profilePhotoUrl: profile.profilePhoto || null,
                        backgroundPhotoUrl: profile.backgroundPhoto || null,
                        transparency: profile.transparency
                      })
                    })
                    const data = await response.json()
                    if (!response.ok || !data.success) {
                      throw new Error(data.error || "Failed to save profile")
                    }
                    setSuccess("Personalisatie opgeslagen.")
                    setTimeout(() => setSuccess(null), 2000)
                  } catch (err: any) {
                    setError(err.message)
                  } finally {
                    setProfileSaving(false)
                  }
                }}
              >
                Opslaan
              </button>
              {profile.profilePhoto ? (
                <img
                  src={profile.profilePhoto}
                  alt="Profielfoto"
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : null}
              {profile.backgroundPhoto ? (
                <span className="text-xs text-slate-500">Achtergrond ingesteld</span>
              ) : null}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">E-mail instellingen</h2>
            <p className="text-sm text-slate-600">
              TEST-mode stuurt altijd naar test-ontvangers.
            </p>
          </div>
        </div>
        {String(settings.email?.mode || "OFF") === "TEST" ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            E-mail staat in TEST-modus – alle mails gaan naar testadres.
          </div>
        ) : null}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Mode
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-base"
              value={settings.email?.mode || "OFF"}
              onChange={(event) => updateGroup("email", "mode", event.target.value)}
            >
              <option value="OFF">OFF</option>
              <option value="TEST">TEST</option>
              <option value="LIVE">LIVE</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Provider
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-base"
              value={settings.email?.provider || "SMTP"}
              onChange={(event) => updateGroup("email", "provider", event.target.value)}
            >
              <option value="SMTP">SMTP</option>
              <option value="SENDGRID">SendGrid</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            From naam
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              value={settings.email?.fromName || ""}
              onChange={(event) => updateGroup("email", "fromName", event.target.value)}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            From e-mail
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              value={settings.email?.fromEmail || ""}
              onChange={(event) => updateGroup("email", "fromEmail", event.target.value)}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
            Test ontvangers (komma-gescheiden)
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              value={(settings.email?.testRecipients || []).join(", ")}
              onChange={(event) =>
                updateGroup(
                  "email",
                  "testRecipients",
                  event.target.value
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean)
                )
              }
            />
          </label>
          <div className="sm:col-span-2">
            <button
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-60"
              type="button"
              onClick={saveEmailSettings}
              disabled={emailSaving}
            >
              {emailSaving ? "Opslaan..." : "E-mail instellingen opslaan"}
            </button>
          </div>
        </div>
      </section>

      {isSystemAdmin ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">RDW / APK</h2>
              <p className="text-sm text-slate-600">
                Verplicht voor RDW meldingen (km-standen, APK afmelden).
              </p>
            </div>
            <button
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-60"
              type="button"
              onClick={saveRdwSettings}
              disabled={rdwSaving}
            >
              {rdwSaving ? "Opslaan..." : "RDW instellingen opslaan"}
            </button>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Bedrijfsnummer (RDW)
              <input
                className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                value={settings.rdwSettings?.bedrijfsnummer || ""}
                onChange={(event) =>
                  updateGroup("rdwSettings", "bedrijfsnummer", event.target.value)
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Keuringsinstantienummer
              <input
                className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                value={settings.rdwSettings?.keuringsinstantienummer || ""}
                onChange={(event) =>
                  updateGroup("rdwSettings", "keuringsinstantienummer", event.target.value)
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Naam KvK
              <input
                className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                value={settings.rdwSettings?.kvkNaam || ""}
                onChange={(event) => updateGroup("rdwSettings", "kvkNaam", event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              KvK-nummer
              <input
                className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                value={settings.rdwSettings?.kvkNummer || ""}
                onChange={(event) => updateGroup("rdwSettings", "kvkNummer", event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              KvK-vestigingsnummer
              <input
                className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                value={settings.rdwSettings?.kvkVestigingsnummer || ""}
                onChange={(event) =>
                  updateGroup("rdwSettings", "kvkVestigingsnummer", event.target.value)
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              RDW aansluitnummer (optioneel)
              <input
                className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                value={settings.rdwSettings?.aansluitnummer || ""}
                onChange={(event) =>
                  updateGroup("rdwSettings", "aansluitnummer", event.target.value)
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
              Certificaat-referentie (geen private key)
              <input
                className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                value={settings.rdwSettings?.certificaatReferentie || ""}
                onChange={(event) =>
                  updateGroup("rdwSettings", "certificaatReferentie", event.target.value)
                }
              />
            </label>
          </div>
        </section>
      ) : null}

      <MediaPickerModal
        isOpen={showProfilePicker}
        onClose={() => setShowProfilePicker(false)}
        onSelect={(url) =>
          setProfile((prev) => ({ ...prev, profilePhoto: url }))
        }
        category="profile"
        title="Kies profielfoto"
      />
      <MediaPickerModal
        isOpen={showBackgroundPicker}
        onClose={() => setShowBackgroundPicker(false)}
        onSelect={(url) =>
          setProfile((prev) => ({ ...prev, backgroundPhoto: url }))
        }
        category="wallpapers"
        title="Kies achtergrond"
      />
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </p>
      ) : null}

      {isSystemAdmin ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Startinstellingen</h2>
              <p className="text-sm text-slate-600">
                Maak standaard instellingen aan als de collectie nog leeg is.
              </p>
            </div>
            <button
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              type="button"
              onClick={bootstrapDefaults}
            >
              Initialiseer defaults
            </button>
          </div>
        </section>
      ) : null}

      <PlanningTypes />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Algemeen</h2>
          <button
            className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
            type="button"
            onClick={() => saveGroup("general")}
          >
            Opslaan
          </button>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Bedrijfsnaam
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              value={settings.general.companyName}
              onChange={(event) => updateGroup("general", "companyName", event.target.value)}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Contact email
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              value={settings.general.contactEmail}
              onChange={(event) => updateGroup("general", "contactEmail", event.target.value)}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Contact telefoon
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              value={settings.general.contactPhone}
              onChange={(event) => updateGroup("general", "contactPhone", event.target.value)}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
            Adres
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              value={settings.general.address}
              onChange={(event) => updateGroup("general", "address", event.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Planning</h2>
          <button
            className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
            type="button"
            onClick={() => saveGroup("planning")}
          >
            Opslaan
          </button>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Standaard duur (minuten)
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              type="number"
              min="0"
              value={settings.planning.defaultDurationMinutes}
              onChange={(event) =>
                updateGroup("planning", "defaultDurationMinutes", Number(event.target.value))
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Dag starttijd
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              type="time"
              value={settings.planning.dayStart}
              onChange={(event) => updateGroup("planning", "dayStart", event.target.value)}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Dag eindtijd
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              type="time"
              value={settings.planning.dayEnd}
              onChange={(event) => updateGroup("planning", "dayEnd", event.target.value)}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Standaard status
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              value={settings.planning.defaultStatus}
              onChange={(event) => updateGroup("planning", "defaultStatus", event.target.value)}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Tijdsblok (minuten)
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              type="number"
              min="15"
              step="5"
              value={settings.planning.slotMinutes}
              onChange={(event) => updateGroup("planning", "slotMinutes", Number(event.target.value))}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Dag‑view dagen (horizontaal)
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              type="number"
              min="1"
              value={settings.planning.dayViewDays}
              onChange={(event) => updateGroup("planning", "dayViewDays", Number(event.target.value))}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(settings.planning.selectableSaturday)}
              onChange={(event) =>
                updateGroup("planning", "selectableSaturday", event.target.checked)
              }
            />
            Zaterdag selecteerbaar in klantkalender
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(settings.planning.selectableSunday)}
              onChange={(event) =>
                updateGroup("planning", "selectableSunday", event.target.checked)
              }
            />
            Zondag selecteerbaar in klantkalender
          </label>
          <div className="sm:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-slate-800">
              <span>Pauzes</span>
              <button
                className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                type="button"
                onClick={addPlanningBreak}
              >
                Pauze toevoegen
              </button>
            </div>
            <div className="mt-3 grid gap-3">
              {planningBreaks.length === 0 ? (
                <p className="text-sm text-slate-500">Geen pauzes ingesteld.</p>
              ) : (
                planningBreaks.map((entry: any, index: number) => (
                  <div
                    key={`break-${index}`}
                    className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
                  >
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Start
                      <input
                        className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                        type="time"
                        value={entry?.start || ""}
                        onChange={(event) =>
                          updatePlanningBreak(index, "start", event.target.value)
                        }
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Eind
                      <input
                        className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                        type="time"
                        value={entry?.end || ""}
                        onChange={(event) =>
                          updatePlanningBreak(index, "end", event.target.value)
                        }
                      />
                    </label>
                    <button
                      className="mt-6 h-10 rounded-lg border border-slate-200 px-3 text-xs text-slate-600 hover:bg-slate-50"
                      type="button"
                      onClick={() => removePlanningBreak(index)}
                    >
                      Verwijder
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Werkoverzicht</h2>
          <button
            className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
            type="button"
            onClick={() => saveGroup("workoverview")}
          >
            Opslaan
          </button>
        </div>
        <div className="mt-4 grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-slate-700">
            <span>Kolommen</span>
            <button
              className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
              type="button"
              onClick={addWorkOverviewColumn}
            >
              Kolom toevoegen
            </button>
          </div>
          {workOverviewColumns.length === 0 ? (
            <p className="text-sm text-slate-500">Geen kolommen ingesteld.</p>
          ) : (
            workOverviewColumns.map((entry: any, index: number) => (
              <div key={`workoverview-${index}`} className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                  value={entry}
                  onChange={(event) => updateWorkOverviewColumn(index, event.target.value)}
                  placeholder="Kolomnaam"
                />
                <button
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
                  type="button"
                  onClick={() => removeWorkOverviewColumn(index)}
                >
                  Verwijder
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Notificaties</h2>
          <button
            className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
            type="button"
            onClick={() => saveGroup("notifications")}
          >
            Opslaan
          </button>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Afzender email
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              value={settings.notifications.senderEmail}
              onChange={(event) => updateGroup("notifications", "senderEmail", event.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={settings.notifications.notifyOnNewOrder}
              onChange={(event) =>
                updateGroup("notifications", "notifyOnNewOrder", event.target.checked)
              }
            />
            Mail bij nieuwe order
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={settings.notifications.notifyOnPlanningChange}
              onChange={(event) =>
                updateGroup("notifications", "notifyOnPlanningChange", event.target.checked)
              }
            />
            Mail bij wijziging planning
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Meldingen X uur vooraf
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              type="number"
              min="1"
              value={settings.notifications.planningLeadHours}
              onChange={(event) =>
                updateGroup("notifications", "planningLeadHours", Number(event.target.value))
              }
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Integraties</h2>
          <button
            className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
            type="button"
            onClick={() => saveGroup("integrations")}
          >
            Opslaan
          </button>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
            Webhook URL
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              value={settings.integrations.webhookUrl}
              onChange={(event) => updateGroup("integrations", "webhookUrl", event.target.value)}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Extern systeem
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              value={settings.integrations.externalSystem}
              onChange={(event) =>
                updateGroup("integrations", "externalSystem", event.target.value)
              }
            />
          </label>
        </div>
      </section>

      {loading ? (
        <p className="text-sm text-slate-500">Instellingen laden...</p>
      ) : null}
    </div>
  )
}
