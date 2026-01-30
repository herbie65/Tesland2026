"use client"

import { useEffect, useState } from "react"
import PlanningTypes from "./PlanningTypes"
import { apiFetch } from "@/lib/api"
import MediaPickerModal from "../components/MediaPickerModal"

type SettingsGroup = {
  id: string
  group: string
  data: Record<string, any>
}

const SETTINGS_DEFAULTS: Record<string, any> = {
  general: {
    companyName: '',
    contactEmail: '',
    contactPhone: '',
    address: ''
  },
  planning: {
    defaultDurationMinutes: 60,
    defaultStatus: 'planned',
    dayStart: '08:30',
    dayEnd: '16:30',
    slotMinutes: 60,
    dayViewDays: 3,
    selectableSaturday: false,
    selectableSunday: false,
    breaks: []
  },
  workoverview: {
    columns: []
  },
  notifications: {
    senderEmail: '',
    notifyOnNewOrder: false,
    notifyOnPlanningChange: false,
    planningLeadHours: 24
  },
  email: {
    mode: 'OFF',
    testRecipients: [],
    fromName: '',
    fromEmail: '',
    provider: 'SMTP'
  },
  warehouseStatuses: {
    items: []
  },
  rdwSettings: {
    bedrijfsnummer: '',
    keuringsinstantienummer: '',
    kvkNaam: '',
    kvkNummer: '',
    kvkVestigingsnummer: '',
    aansluitnummer: '',
    certificaatReferentie: '',
    enabled: false
  },
  siteHeader: {
    logoUrl: '',
    logoAlt: '',
    menuItems: [],
    actions: {}
  },
  integrations: {
    webhookUrl: '',
    externalSystem: ''
  },
  absenceTypes: { 
    items: [] 
  }
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
  const [emailTesting, setEmailTesting] = useState(false)
  const [rdwSaving, setRdwSaving] = useState(false)

  const loadSettings = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiFetch("/api/settings")
      if (!data.success) {
        throw new Error(data.error || "Failed to load settings")
      }
      const merged: Record<string, any> = { ...SETTINGS_DEFAULTS }
      ;(data.items || []).forEach((item: SettingsGroup) => {
        merged[item.group] = { ...SETTINGS_DEFAULTS[item.group as keyof typeof SETTINGS_DEFAULTS] || {}, ...(item.data || {}) }
      })
      setSettings(merged)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    const loadRole = async () => {
      try {
        const data = await apiFetch("/api/admin/me")
        if (data.success) {
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
        const data = await apiFetch("/api/admin/profile")
        if (data.success) {
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
  const hasPlanningSettings = Boolean(settings.planning)

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
        const data = await apiFetch(`/api/settings/${group}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: settings[group] })
      })
        if (!data.success) {
        throw new Error(data.error || "Failed to save settings")
      }
      setSuccess(`Instellingen opgeslagen: ${group}`)
      setTimeout(() => setSuccess(null), 2000)
      await loadSettings() // Reload settings after save
    } catch (err: any) {
      setError(err.message)
    }
  }

  const saveEmailSettings = async () => {
    try {
      setError(null)
      setSuccess(null)
      setEmailSaving(true)
        const data = await apiFetch("/api/settings/email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: settings.email })
      })
        if (!data.success) {
        throw new Error(data.error || "Failed to save email settings")
      }
      setSuccess("E-mail instellingen opgeslagen.")
      setTimeout(() => setSuccess(null), 2000)
      await loadSettings() // Reload settings after save
    } catch (err: any) {
      setError(err.message)
    } finally {
      setEmailSaving(false)
    }
  }

  const testEmailSettings = async () => {
    try {
      setError(null)
      setSuccess(null)
      setEmailTesting(true)
      const data = await apiFetch("/api/settings/email/test", {
        method: "POST"
      })
      if (!data.success) {
        throw new Error(data.error || "Test email versturen mislukt")
      }
      setSuccess(`Test email verzonden naar ${data.recipient}. Check je inbox!`)
      setTimeout(() => setSuccess(null), 5000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setEmailTesting(false)
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
      const data = await apiFetch("/api/settings/rdwSettings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: settings.rdwSettings })
      })
      if (!data.success) {
        throw new Error(data.error || "Failed to save RDW settings")
      }
      setSuccess("RDW instellingen opgeslagen.")
      setTimeout(() => setSuccess(null), 2000)
      await loadSettings() // Reload settings after save
    } catch (err: any) {
      setError(err.message)
    } finally {
      setRdwSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-white/80 to-slate-50/80 p-5 shadow-lg backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Personalisatie</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Stel je profielafbeelding, achtergrond en transparantie in.
            </p>
          </div>
        </div>
        {profileLoading ? (
          <p className="mt-3 text-xs text-slate-400">Profiel laden...</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-medium text-slate-700">
              Profielfoto URL
              <input
                className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-1.5 text-sm backdrop-blur-sm transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200/50"
                value={profile.profilePhoto}
                onChange={(event) =>
                  setProfile((prev) => ({ ...prev, profilePhoto: event.target.value }))
                }
                placeholder="https://"
              />
              <button
                className="w-fit rounded-lg border border-slate-300/50 bg-white/60 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white/80 hover:shadow-md"
                type="button"
                onClick={() => setShowProfilePicker(true)}
              >
                Media kiezen
              </button>
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-slate-700">
              Achtergrond URL
              <input
                className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-1.5 text-sm backdrop-blur-sm transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200/50"
                value={profile.backgroundPhoto}
                onChange={(event) =>
                  setProfile((prev) => ({ ...prev, backgroundPhoto: event.target.value }))
                }
                placeholder="https://"
              />
              <button
                className="w-fit rounded-lg border border-slate-300/50 bg-white/60 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white/80 hover:shadow-md"
                type="button"
                onClick={() => setShowBackgroundPicker(true)}
              >
                Media kiezen
              </button>
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-slate-700 sm:col-span-2">
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
                className="h-2 w-full appearance-none rounded-lg bg-slate-200/50 backdrop-blur-sm accent-blue-600"
              />
            </label>
            <div className="flex items-center gap-3 sm:col-span-2">
              <button
                className="rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 px-4 py-2 text-sm font-medium text-white shadow-md transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50"
                type="button"
                disabled={profileSaving}
                onClick={async () => {
                  try {
                    setProfileSaving(true)
                    setError(null)
                    const data = await apiFetch("/api/admin/profile", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        profilePhotoUrl: profile.profilePhoto || null,
                        backgroundPhotoUrl: profile.backgroundPhoto || null,
                        transparency: profile.transparency
                      })
                    })
                    if (!data.success) {
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
                  className="h-10 w-10 rounded-full border-2 border-white/50 object-cover shadow-md"
                />
              ) : null}
              {profile.backgroundPhoto ? (
                <span className="text-xs text-slate-500">Achtergrond ingesteld</span>
              ) : null}
            </div>
          </div>
        )}
      </section>

      <section className="relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-white/80 to-slate-50/80 p-5 shadow-lg backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">E-mail instellingen</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              TEST-mode stuurt altijd naar test-ontvangers.
            </p>
          </div>
        </div>
        {String(settings.email?.mode || "OFF") === "TEST" ? (
          <div className="mt-2 rounded-lg border border-amber-200/50 bg-amber-50/80 px-3 py-2 text-xs text-amber-800 backdrop-blur-sm">
            E-mail staat in TEST-modus – alle mails gaan naar testadres.
          </div>
        ) : null}
        {!hasPlanningSettings ? (
          <p className="mt-3 text-xs text-amber-700">
            Planning instellingen ontbreken in de database. Voeg de groep "planning" toe via de database of API.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-medium text-slate-700">
            Mode
            <select
              className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-1.5 text-sm backdrop-blur-sm transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200/50"
              value={settings.email?.mode || "OFF"}
              onChange={(event) => updateGroup("email", "mode", event.target.value)}
            >
              <option value="OFF">OFF</option>
              <option value="TEST">TEST</option>
              <option value="LIVE">LIVE</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-slate-700">
            Provider
            <select
              className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-1.5 text-sm backdrop-blur-sm transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200/50"
              value={settings.email?.provider || "SMTP"}
              onChange={(event) => updateGroup("email", "provider", event.target.value)}
            >
              <option value="SMTP">SMTP</option>
              <option value="SENDGRID">SendGrid</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-slate-700">
            From naam
            <input
              className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-1.5 text-sm backdrop-blur-sm transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200/50"
              value={settings.email?.fromName || ""}
              onChange={(event) => updateGroup("email", "fromName", event.target.value)}
            />
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-slate-700">
            From e-mail
            <input
              className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-1.5 text-sm backdrop-blur-sm transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200/50"
              value={settings.email?.fromEmail || ""}
              onChange={(event) => updateGroup("email", "fromEmail", event.target.value)}
            />
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-slate-700 sm:col-span-2">
            Test ontvangers (komma-gescheiden)
            <input
              className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-1.5 text-sm backdrop-blur-sm transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200/50"
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

          {/* SMTP Credentials Section */}
          {settings.email?.provider === "SMTP" ? (
            <>
              <div className="sm:col-span-2 mt-2 pt-3 border-t border-slate-200">
                <p className="text-xs font-semibold text-slate-700 mb-2">SMTP Server Instellingen</p>
              </div>
              <label className="grid gap-1.5 text-xs font-medium text-slate-700">
                SMTP Host
                <input
                  className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-1.5 text-sm backdrop-blur-sm transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200/50"
                  value={settings.email?.smtpHost || ""}
                  onChange={(event) => updateGroup("email", "smtpHost", event.target.value)}
                  placeholder="smtp.gmail.com"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-slate-700">
                SMTP Port
                <input
                  type="number"
                  className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-1.5 text-sm backdrop-blur-sm transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200/50"
                  value={settings.email?.smtpPort || "587"}
                  onChange={(event) => updateGroup("email", "smtpPort", event.target.value)}
                  placeholder="587"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-slate-700">
                SMTP Gebruiker
                <input
                  className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-1.5 text-sm backdrop-blur-sm transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200/50"
                  value={settings.email?.smtpUser || ""}
                  onChange={(event) => updateGroup("email", "smtpUser", event.target.value)}
                  placeholder="jouw@email.nl"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-slate-700">
                SMTP Wachtwoord
                <input
                  type="password"
                  className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-1.5 text-sm backdrop-blur-sm transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200/50"
                  value={settings.email?.smtpPassword || ""}
                  onChange={(event) => updateGroup("email", "smtpPassword", event.target.value)}
                  placeholder="••••••••"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-slate-700">
                SMTP Secure (SSL/TLS)
                <select
                  className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-1.5 text-sm backdrop-blur-sm transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200/50"
                  value={settings.email?.smtpSecure || "false"}
                  onChange={(event) => updateGroup("email", "smtpSecure", event.target.value)}
                >
                  <option value="false">Nee (port 587)</option>
                  <option value="true">Ja (port 465)</option>
                </select>
              </label>
            </>
          ) : settings.email?.provider === "SENDGRID" ? (
            <>
              <div className="sm:col-span-2 mt-2 pt-3 border-t border-slate-200">
                <p className="text-xs font-semibold text-slate-700 mb-2">SendGrid Instellingen</p>
              </div>
              <label className="grid gap-1.5 text-xs font-medium text-slate-700 sm:col-span-2">
                SendGrid API Key
                <input
                  type="password"
                  className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-1.5 text-sm backdrop-blur-sm transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200/50"
                  value={settings.email?.sendgridApiKey || ""}
                  onChange={(event) => updateGroup("email", "sendgridApiKey", event.target.value)}
                  placeholder="SG.••••••••"
                />
              </label>
            </>
          ) : null}

          <label className="sm:col-span-2 grid gap-2 text-sm font-medium text-slate-700">
            Handtekening (wordt automatisch aan elke email toegevoegd)
            <textarea
              className="min-h-[120px] rounded-lg border border-slate-200 px-3 py-2 text-base font-normal"
              value={settings.email?.signature || ""}
              onChange={(event) => updateGroup("email", "signature", event.target.value)}
              placeholder="Met vriendelijke groet,&#10;&#10;Tesland Klantenservice&#10;info@tesland.com&#10;+31 (0)12 345 6789"
            />
            <p className="text-xs text-slate-500">
              Tip: Gebruik HTML voor opmaak zoals &lt;b&gt;vet&lt;/b&gt;, &lt;i&gt;cursief&lt;/i&gt;, of &lt;img src="..."&gt; voor een logo
            </p>
          </label>

          <div className="sm:col-span-2 flex flex-wrap gap-2">
            <button
              className="rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 px-4 py-2 text-sm font-medium text-white shadow-md transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50"
              type="button"
              onClick={saveEmailSettings}
              disabled={emailSaving || emailTesting}
            >
              {emailSaving ? "Opslaan..." : "E-mail instellingen opslaan"}
            </button>
            <button
              className="rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 px-4 py-2 text-sm font-medium text-white shadow-md transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50"
              type="button"
              onClick={testEmailSettings}
              disabled={emailSaving || emailTesting || settings.email?.mode === 'OFF'}
              title={settings.email?.mode === 'OFF' ? 'Zet email mode op TEST of LIVE' : 'Verstuur een test email'}
            >
              {emailTesting ? "Versturen..." : "📧 Test email versturen"}
            </button>
          </div>
          </div>
        )}
      </section>

      {isSystemAdmin ? (
        <section className="relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-white/80 to-slate-50/80 p-5 shadow-lg backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">RDW / APK</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Verplicht voor RDW meldingen (km-standen, APK afmelden).
              </p>
            </div>
            <button
              className="rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 px-4 py-2 text-sm font-medium text-white shadow-md transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50"
              type="button"
              onClick={saveRdwSettings}
              disabled={rdwSaving}
            >
              {rdwSaving ? "Opslaan..." : "RDW instellingen opslaan"}
            </button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-medium text-slate-700">
              Bedrijfsnummer (RDW)
              <input
                className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-1.5 text-sm backdrop-blur-sm transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200/50"
                value={settings.rdwSettings?.bedrijfsnummer || ""}
                onChange={(event) =>
                  updateGroup("rdwSettings", "bedrijfsnummer", event.target.value)
                }
              />
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-slate-700">
              Keuringsinstantienummer
              <input
                className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-1.5 text-sm backdrop-blur-sm transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200/50"
                value={settings.rdwSettings?.keuringsinstantienummer || ""}
                onChange={(event) =>
                  updateGroup("rdwSettings", "keuringsinstantienummer", event.target.value)
                }
              />
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-slate-700">
              Naam KvK
              <input
                className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-1.5 text-sm backdrop-blur-sm transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200/50"
                value={settings.rdwSettings?.kvkNaam || ""}
                onChange={(event) => updateGroup("rdwSettings", "kvkNaam", event.target.value)}
              />
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-slate-700">
              KvK-nummer
              <input
                className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-1.5 text-sm backdrop-blur-sm transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200/50"
                value={settings.rdwSettings?.kvkNummer || ""}
                onChange={(event) => updateGroup("rdwSettings", "kvkNummer", event.target.value)}
              />
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-slate-700">
              KvK-vestigingsnummer
              <input
                className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-1.5 text-sm backdrop-blur-sm transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200/50"
                value={settings.rdwSettings?.kvkVestigingsnummer || ""}
                onChange={(event) =>
                  updateGroup("rdwSettings", "kvkVestigingsnummer", event.target.value)
                }
              />
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-slate-700">
              RDW aansluitnummer (optioneel)
              <input
                className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-1.5 text-sm backdrop-blur-sm transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200/50"
                value={settings.rdwSettings?.aansluitnummer || ""}
                onChange={(event) =>
                  updateGroup("rdwSettings", "aansluitnummer", event.target.value)
                }
              />
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-slate-700 sm:col-span-2">
              Certificaat-referentie (geen private key)
              <input
                className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-1.5 text-sm backdrop-blur-sm transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200/50"
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
        <div className="relative overflow-hidden rounded-xl border border-red-200/50 bg-gradient-to-br from-red-50/80 to-red-100/60 px-4 py-3 text-sm text-red-700 shadow-md backdrop-blur-sm">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="relative overflow-hidden rounded-xl border border-emerald-200/50 bg-gradient-to-br from-emerald-50/80 to-emerald-100/60 px-4 py-3 text-sm text-emerald-700 shadow-md backdrop-blur-sm">
          {success}
        </div>
      ) : null}

      <PlanningTypes />

      {/* Afwezigheidstypes sectie */}
      <section className="relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-white/80 to-slate-50/80 p-5 shadow-lg backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Afwezigheidstypes</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Types voor overige medewerkers (ziek, verlof, vakantie, etc.)
            </p>
          </div>
          <button
            className="rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 px-4 py-2 text-sm font-medium text-white shadow-md transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95"
            type="button"
            onClick={() => saveGroup("absenceTypes")}
          >
            Opslaan
          </button>
        </div>
        <div className="mt-4">
          <div className="grid gap-3">
            {(settings.absenceTypes?.items || []).map((item: any, index: number) => (
              <div
                key={`absence-${index}`}
                className="grid gap-3 sm:grid-cols-[1fr_1fr_120px_auto] items-end rounded-lg border border-slate-200/50 bg-white/50 p-3"
              >
                <label className="grid gap-1 text-xs font-medium text-slate-700">
                  Code
                  <input
                    className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-1.5 text-sm backdrop-blur-sm transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200/50"
                    value={item.code || ""}
                    onChange={(event) => {
                      const items = [...(settings.absenceTypes?.items || [])]
                      items[index] = { ...items[index], code: event.target.value }
                      updateGroup("absenceTypes", "items", items)
                    }}
                  />
                </label>
                <label className="grid gap-1 text-xs font-medium text-slate-700">
                  Label
                  <input
                    className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-1.5 text-sm backdrop-blur-sm transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200/50"
                    value={item.label || ""}
                    onChange={(event) => {
                      const items = [...(settings.absenceTypes?.items || [])]
                      items[index] = { ...items[index], label: event.target.value }
                      updateGroup("absenceTypes", "items", items)
                    }}
                  />
                </label>
                <label className="grid gap-1 text-xs font-medium text-slate-700">
                  Kleur
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      className="h-8 w-12 rounded border border-slate-200 cursor-pointer"
                      value={item.color || "#94a3b8"}
                      onChange={(event) => {
                        const items = [...(settings.absenceTypes?.items || [])]
                        items[index] = { ...items[index], color: event.target.value }
                        updateGroup("absenceTypes", "items", items)
                      }}
                    />
                    <span 
                      className="flex-1 rounded px-2 py-1 text-xs text-white font-medium"
                      style={{ backgroundColor: item.color || "#94a3b8" }}
                    >
                      {item.label || "Voorbeeld"}
                    </span>
                  </div>
                </label>
                <button
                  type="button"
                  className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
                  onClick={() => {
                    const items = (settings.absenceTypes?.items || []).filter(
                      (_: any, idx: number) => idx !== index
                    )
                    updateGroup("absenceTypes", "items", items)
                  }}
                >
                  Verwijder
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="mt-3 rounded-lg bg-slate-100 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors"
            onClick={() => {
              const items = [...(settings.absenceTypes?.items || []), { code: "", label: "", color: "#94a3b8" }]
              updateGroup("absenceTypes", "items", items)
            }}
          >
            + Nieuw afwezigheidstype
          </button>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-white/80 to-slate-50/80 p-5 shadow-lg backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Algemeen</h2>
            <p className="text-xs text-slate-500 mt-0.5">Bedrijfsinformatie</p>
          </div>
          <button
            className="rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 px-4 py-2 text-sm font-medium text-white shadow-md transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95"
            type="button"
            onClick={() => saveGroup("general")}
          >
            Opslaan
          </button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-medium text-slate-700">
            Bedrijfsnaam
            <input
              className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-1.5 text-sm backdrop-blur-sm transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200/50"
              value={settings.general?.companyName || ''}
              onChange={(event) => updateGroup("general", "companyName", event.target.value)}
            />
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-slate-700">
            Contact email
            <input
              className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-1.5 text-sm backdrop-blur-sm transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200/50"
              value={settings.general?.contactEmail || ''}
              onChange={(event) => updateGroup("general", "contactEmail", event.target.value)}
            />
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-slate-700">
            Contact telefoon
            <input
              className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-1.5 text-sm backdrop-blur-sm transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200/50"
              value={settings.general?.contactPhone || ''}
              onChange={(event) => updateGroup("general", "contactPhone", event.target.value)}
            />
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-slate-700 sm:col-span-2">
            Adres
            <input
              className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-1.5 text-sm backdrop-blur-sm transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200/50"
              value={settings.general?.address || ''}
              onChange={(event) => updateGroup("general", "address", event.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-white/80 to-slate-50/80 p-5 shadow-lg backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Planning</h2>
            <p className="text-xs text-slate-500 mt-0.5">Standaard planning instellingen</p>
          </div>
          <button
            className="rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 px-4 py-2 text-sm font-medium text-white shadow-md transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95"
            type="button"
            onClick={() => saveGroup("planning")}
          >
            Opslaan
          </button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-medium text-slate-700">
            Standaard duur (minuten)
            <input
              className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-1.5 text-sm backdrop-blur-sm transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200/50"
              type="number"
              min="0"
              value={settings.planning.defaultDurationMinutes}
              onChange={(event) =>
                updateGroup("planning", "defaultDurationMinutes", Number(event.target.value))
              }
            />
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-slate-700">
            Dag starttijd
            <input
              className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-1.5 text-sm backdrop-blur-sm transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200/50"
              type="time"
              value={settings.planning.dayStart}
              onChange={(event) => updateGroup("planning", "dayStart", event.target.value)}
            />
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-slate-700">
            Dag eindtijd
            <input
              className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-1.5 text-sm backdrop-blur-sm transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200/50"
              type="time"
              value={settings.planning.dayEnd}
              onChange={(event) => updateGroup("planning", "dayEnd", event.target.value)}
            />
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-slate-700">
            Standaard status
            <input
              className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-1.5 text-sm backdrop-blur-sm transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200/50"
              value={settings.planning.defaultStatus}
              onChange={(event) => updateGroup("planning", "defaultStatus", event.target.value)}
            />
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-slate-700">
            Tijdsblok (minuten)
            <input
              className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-1.5 text-sm backdrop-blur-sm transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200/50"
              type="number"
              min="15"
              step="5"
              value={settings.planning.slotMinutes}
              onChange={(event) => updateGroup("planning", "slotMinutes", Number(event.target.value))}
            />
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-slate-700">
            Dag‑view dagen (horizontaal)
            <input
              className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-1.5 text-sm backdrop-blur-sm transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200/50"
              type="number"
              min="1"
              value={settings.planning.dayViewDays}
              onChange={(event) => updateGroup("planning", "dayViewDays", Number(event.target.value))}
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(settings.planning.selectableSaturday)}
              onChange={(event) =>
                updateGroup("planning", "selectableSaturday", event.target.checked)
              }
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-200"
            />
            Zaterdag selecteerbaar in klantkalender
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(settings.planning.selectableSunday)}
              onChange={(event) =>
                updateGroup("planning", "selectableSunday", event.target.checked)
              }
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-200"
            />
            Zondag selecteerbaar in klantkalender
          </label>
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between text-xs font-medium text-slate-600 mb-2">
              <span>Pauzes</span>
              <button
                className="rounded-lg border border-slate-300/50 bg-white/60 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white/80 hover:shadow-md"
                type="button"
                onClick={addPlanningBreak}
              >
                + Pauze toevoegen
              </button>
            </div>
            <div className="grid gap-2">
              {planningBreaks.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">Geen pauzes ingesteld.</p>
              ) : (
                planningBreaks.map((entry: any, index: number) => (
                  <div
                    key={`break-${index}`}
                    className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
                  >
                    <label className="grid gap-1 text-xs font-medium text-slate-700">
                      Start
                      <input
                        className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-1.5 text-sm backdrop-blur-sm transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200/50"
                        type="time"
                        value={entry?.start || ""}
                        onChange={(event) =>
                          updatePlanningBreak(index, "start", event.target.value)
                        }
                      />
                    </label>
                    <label className="grid gap-1 text-xs font-medium text-slate-700">
                      Eind
                      <input
                        className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-1.5 text-sm backdrop-blur-sm transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200/50"
                        type="time"
                        value={entry?.end || ""}
                        onChange={(event) =>
                          updatePlanningBreak(index, "end", event.target.value)
                        }
                      />
                    </label>
                    <button
                      className="mt-5 h-8 rounded-lg border border-red-300/50 bg-white/80 px-3 text-xs font-medium text-red-600 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-red-50 hover:shadow-md active:scale-95"
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

      <section className="relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-white/80 to-slate-50/80 p-5 shadow-lg backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Werkoverzicht</h2>
            <p className="text-xs text-slate-500 mt-0.5">Beheer zichtbare kolommen</p>
          </div>
          <button
            className="rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 px-4 py-2 text-sm font-medium text-white shadow-md transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95"
            type="button"
            onClick={() => saveGroup("workoverview")}
          >
            Opslaan
          </button>
        </div>
        <div className="mt-3 grid gap-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-600">
            <span>Kolommen</span>
            <button
              className="rounded-lg border border-slate-300/50 bg-white/60 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white/80 hover:shadow-md"
              type="button"
              onClick={addWorkOverviewColumn}
            >
              + Kolom toevoegen
            </button>
          </div>
          {workOverviewColumns.length === 0 ? (
            <p className="text-xs text-slate-400 py-2">Geen kolommen ingesteld.</p>
          ) : (
            workOverviewColumns.map((entry: any, index: number) => (
              <div key={`workoverview-${index}`} className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                <input
                  className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-1.5 text-sm backdrop-blur-sm transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200/50"
                  value={entry}
                  onChange={(event) => updateWorkOverviewColumn(index, event.target.value)}
                  placeholder="Kolomnaam"
                />
                <button
                  className="rounded-lg border border-blue-300/50 bg-gradient-to-br from-blue-500 to-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-md transition-all duration-200 hover:from-blue-600 hover:to-blue-700 hover:shadow-lg active:scale-95"
                  type="button"
                  onClick={() => {
                    const newValue = prompt('Wijzig kolomnaam:', entry)
                    if (newValue !== null && newValue.trim()) {
                      updateWorkOverviewColumn(index, newValue.trim())
                    }
                  }}
                >
                  Wijzig
                </button>
                <button
                  className="rounded-lg border border-red-300/50 bg-white/80 px-3 py-1.5 text-xs font-medium text-red-600 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-red-50 hover:shadow-md active:scale-95"
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

      <section className="relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-white/80 to-slate-50/80 p-5 shadow-lg backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Notificaties</h2>
            <p className="text-xs text-slate-500 mt-0.5">Notificatie instellingen</p>
          </div>
          <button
            className="rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 px-4 py-2 text-sm font-medium text-white shadow-md transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95"
            type="button"
            onClick={() => saveGroup("notifications")}
          >
            Opslaan
          </button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-medium text-slate-700">
            Afzender email
            <input
              className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-1.5 text-sm backdrop-blur-sm transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200/50"
              value={settings.notifications.senderEmail}
              onChange={(event) => updateGroup("notifications", "senderEmail", event.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={settings.notifications.notifyOnNewOrder}
              onChange={(event) =>
                updateGroup("notifications", "notifyOnNewOrder", event.target.checked)
              }
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-200"
            />
            Mail bij nieuwe order
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={settings.notifications.notifyOnPlanningChange}
              onChange={(event) =>
                updateGroup("notifications", "notifyOnPlanningChange", event.target.checked)
              }
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-200"
            />
            Mail bij wijziging planning
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-slate-700">
            Meldingen X uur vooraf
            <input
              className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-1.5 text-sm backdrop-blur-sm transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200/50"
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

      <section className="relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-white/80 to-slate-50/80 p-5 shadow-lg backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Integraties</h2>
            <p className="text-xs text-slate-500 mt-0.5">Externe systemen en webhooks</p>
          </div>
          <button
            className="rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 px-4 py-2 text-sm font-medium text-white shadow-md transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95"
            type="button"
            onClick={() => saveGroup("integrations")}
          >
            Opslaan
          </button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-medium text-slate-700 sm:col-span-2">
            Webhook URL
            <input
              className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-1.5 text-sm backdrop-blur-sm transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200/50"
              value={settings.integrations.webhookUrl}
              onChange={(event) => updateGroup("integrations", "webhookUrl", event.target.value)}
            />
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-slate-700">
            Extern systeem
            <input
              className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-1.5 text-sm backdrop-blur-sm transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200/50"
              value={settings.integrations.externalSystem}
              onChange={(event) =>
                updateGroup("integrations", "externalSystem", event.target.value)
              }
            />
          </label>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-white/80 to-slate-50/80 p-5 shadow-lg backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">VoIP / Telefonie</h2>
            <p className="text-xs text-slate-500 mt-0.5">Klik-en-bel integratie (VoIPgrid/Verbonden.nl)</p>
          </div>
          <button
            className="rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 px-4 py-2 text-sm font-medium text-white shadow-md transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95"
            type="button"
            onClick={() => saveGroup("voip")}
          >
            Opslaan
          </button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-xs text-slate-700 sm:col-span-2">
            <input
              type="checkbox"
              checked={Boolean(settings.voip?.enabled)}
              onChange={(event) => updateGroup("voip", "enabled", event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-200"
            />
            Klik-en-bel functionaliteit inschakelen
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-slate-700 sm:col-span-2">
            API Email
            <input
              className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-1.5 text-sm backdrop-blur-sm transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200/50"
              type="email"
              value={settings.voip?.apiEmail || ""}
              onChange={(event) => updateGroup("voip", "apiEmail", event.target.value)}
              placeholder="gebruiker@bedrijf.nl"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">Je VoIPgrid gebruikersnaam / email adres</p>
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-slate-700 sm:col-span-2">
            API Token
            <input
              className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-1.5 text-sm backdrop-blur-sm transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200/50 font-mono text-xs"
              type="password"
              value={settings.voip?.apiToken || ""}
              onChange={(event) => updateGroup("voip", "apiToken", event.target.value)}
              placeholder="17591f6e4d89764e31b6b1d25cea8f179c54b518"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">Te vinden in VoIPgrid portal onder Persoonlijke instellingen</p>
          </label>
          <div className="sm:col-span-2 rounded-lg bg-blue-50/50 border border-blue-200/30 p-3">
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong>💡 Eindbestemming per gebruiker:</strong><br/>
              Elke gebruiker kan in hun eigen profiel een VoIP extensie instellen (bijv. "206"). 
              Deze eindbestemming wordt gebruikt wanneer zij op een telefoonnummer klikken.
            </p>
          </div>
        </div>
      </section>

      {loading ? (
        <p className="text-sm text-slate-500">Instellingen laden...</p>
      ) : null}
    </div>
  )
}
