"use client"

import { useEffect, useMemo, useState } from "react"
import { apiFetch } from "@/lib/api"

type Template = {
  id: string
  enabled?: boolean
  subject?: string
  bodyText?: string
  availableVariables?: string[]
  lastEditedAt?: string
  lastEditedBy?: string
}

const previewData: Record<string, Record<string, string>> = {
  workorder_created: {
    klantNaam: "Jan de Vries",
    kenteken: "SG716B",
    workorderId: "WO-260001"
  },
  appointment_confirmed: {
    klantNaam: "Sanne Jansen",
    kenteken: "T492HH",
    datum: "12-02-2026",
    tijd: "09:30"
  },
  extra_work_approval_required: {
    klantNaam: "Pieter Bakker",
    kenteken: "KX193L"
  },
  work_completed: {
    klantNaam: "Lotte Visser",
    kenteken: "NB740P",
    workorderId: "WO-260014"
  },
  invoice_available: {
    klantNaam: "Mohamed El Amrani",
    kenteken: "RF620D",
    factuurNummer: "TLI-2600123"
  }
}

const renderTemplate = (value: string, variables: Record<string, string>) =>
  value.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? "")

export default function EmailTemplatesClient() {
  const [items, setItems] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Template | null>(null)
  const [subject, setSubject] = useState("")
  const [bodyText, setBodyText] = useState("")
  const [enabled, setEnabled] = useState(true)
  const [preview, setPreview] = useState("")
  const [seedMissing, setSeedMissing] = useState(false)

  const loadTemplates = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiFetch("/api/admin/email-templates")
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Templates laden mislukt")
      }
      const list = data.items || []
      setItems(list)
      setSeedMissing(list.length === 0)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => String(a.id).localeCompare(String(b.id))),
    [items]
  )

  const openTemplate = (template: Template) => {
    setSelected(template)
    setSubject(template.subject || "")
    setBodyText(template.bodyText || "")
    setEnabled(template.enabled !== false)
    setPreview("")
  }

  const handleSave = async () => {
    if (!selected) return
    try {
      setError(null)
      const response = await apiFetch(`/api/admin/email-templates/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          bodyText,
          enabled
        })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Opslaan mislukt")
      }
      await loadTemplates()
      setPreview("")
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handlePreview = () => {
    if (!selected) return
    const vars = previewData[selected.id] || {}
    const previewSubject = renderTemplate(subject, vars)
    const previewBody = renderTemplate(bodyText, vars)
    setPreview(`${previewSubject}\n\n${previewBody}`)
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">E-mail templates</h2>
            <p className="text-sm text-slate-600">Beheer onderwerp en tekst van e-mails.</p>
          </div>
          <button
            className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
            type="button"
            onClick={loadTemplates}
          >
            Verversen
          </button>
        </div>
        {error ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Laden...</p>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr]">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-500">Templates</p>
              <div className="mt-3 space-y-2">
                {sortedItems.map((item) => (
                  <button
                    key={item.id}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                      selected?.id === item.id
                        ? "border-slate-900 bg-white text-slate-900"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                    type="button"
                    onClick={() => openTemplate(item)}
                    disabled={seedMissing}
                  >
                    {item.id}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {seedMissing ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  Geen templates gevonden. Ga naar /admin/tools en klik “Seed email”.
                </div>
              ) : selected ? (
                <>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-semibold">{selected.id}</h3>
                      <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={(event) => setEnabled(event.target.checked)}
                        />
                        Ingeschakeld
                      </label>
                    </div>
                    <label className="mt-4 grid gap-2 text-sm font-medium text-slate-700">
                      Onderwerp
                      <input
                        className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                        value={subject}
                        onChange={(event) => setSubject(event.target.value)}
                      />
                    </label>
                    <label className="mt-4 grid gap-2 text-sm font-medium text-slate-700">
                      Tekst
                      <textarea
                        className="min-h-[180px] rounded-lg border border-slate-200 px-3 py-2 text-base"
                        value={bodyText}
                        onChange={(event) => setBodyText(event.target.value)}
                      />
                    </label>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
                        type="button"
                        onClick={handleSave}
                      >
                        Opslaan
                      </button>
                      <button
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        type="button"
                        onClick={handlePreview}
                      >
                        Preview met testdata
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                    <p className="text-xs font-semibold text-slate-500">Beschikbare variabelen</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(selected.availableVariables || []).length ? (
                        selected.availableVariables?.map((variable) => (
                          <span key={variable} className="rounded-full bg-slate-100 px-2 py-1 text-xs">
                            {variable}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400">Geen variabelen</span>
                      )}
                    </div>
                  </div>

                  {preview ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 whitespace-pre-wrap">
                      {preview}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                  Kies een template om te bewerken.
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
