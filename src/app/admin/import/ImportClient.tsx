"use client"

import { useState } from "react"

type ImportResult = {
  success: boolean
  dryRun?: boolean
  error?: string
  customersFile?: string
  vehiclesFile?: string
  customers?: { created: number; skipped: number }
  vehicles?: { created: number; skipped: number; unlinked: number }
  customersCount?: number
  vehiclesCount?: number
  vehiclesUnlinkedCount?: number
  customersPreview?: Array<{
    sourceId?: string
    customerNumber?: string
    displayName?: string
    contact?: string
    email?: string
    phone?: string
  }>
  vehiclesPreview?: Array<{
    sourceId?: string
    brand?: string
    model?: string
    license?: string
    customerSourceId?: string | null
    customerNameFromVehicle?: string | null
    linkedCustomerName?: string | null
    linked?: boolean
  }>
}

export default function ImportClient() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dryRun, setDryRun] = useState(true)

  const runImport = async () => {
    try {
      setLoading(true)
      setError(null)
      setResult(null)
      const response = await fetch(
        `/api/import/customers-vehicles${dryRun ? "?dryRun=true" : ""}`,
        { method: "POST" }
      )
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Import failed")
      }
      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">CSV import</h2>
        <p className="mt-2 text-slate-600">
          Deze import leest <code>klanten_*.csv</code> en <code>auto_*.csv</code> uit de
          map <code>/import</code>. Koppeling gebeurt via <code>customerId</code> uit
          de voertuigen-CSV naar <code>ID</code> van de klanten-CSV.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(event) => setDryRun(event.target.checked)}
            />
            Alleen preview (dry run)
          </label>
          <button
            className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
            type="button"
            onClick={runImport}
            disabled={loading}
          >
            {loading ? "Bezig..." : dryRun ? "Preview import" : "Importeren"}
          </button>
        </div>
      </section>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {result ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold">Resultaat</h3>
          <div className="mt-3 grid gap-2 text-sm text-slate-700">
            <div>
              Bestanden: {result.customersFile} / {result.vehiclesFile}
            </div>
            {result.dryRun ? (
              <div>
                Preview: {result.customersCount} klanten, {result.vehiclesCount} voertuigen.
                Niet gekoppeld: {result.vehiclesUnlinkedCount ?? 0}
              </div>
            ) : (
              <>
                <div>
                  Klanten: {result.customers?.created} aangemaakt, {result.customers?.skipped} overgeslagen
                </div>
                <div>
                  Voertuigen: {result.vehicles?.created} aangemaakt, {result.vehicles?.skipped} overgeslagen
                </div>
                <div>Niet gekoppelde voertuigen: {result.vehicles?.unlinked}</div>
              </>
            )}
          </div>
        </section>
      ) : null}

      {result?.dryRun ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold">Mapping preview</h3>
          <div className="mt-4 space-y-6 text-sm text-slate-700">
            <div>
              <p className="font-semibold text-slate-800">Klanten (eerste 5)</p>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                      <th className="py-2 pr-3">ID</th>
                      <th className="py-2 pr-3">Nr</th>
                      <th className="py-2 pr-3">Naam</th>
                      <th className="py-2 pr-3">Contact</th>
                      <th className="py-2 pr-3">Email</th>
                      <th className="py-2">Telefoon</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(result.customersPreview || []).map((row, index) => (
                      <tr key={row.sourceId || index} className="border-b border-slate-100">
                        <td className="py-2 pr-3">{row.sourceId}</td>
                        <td className="py-2 pr-3">{row.customerNumber}</td>
                        <td className="py-2 pr-3">{row.displayName}</td>
                        <td className="py-2 pr-3">{row.contact}</td>
                        <td className="py-2 pr-3">{row.email}</td>
                        <td className="py-2">{row.phone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <p className="font-semibold text-slate-800">Voertuigen (eerste 5)</p>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                      <th className="py-2 pr-3">ID</th>
                      <th className="py-2 pr-3">Merk</th>
                      <th className="py-2 pr-3">Model</th>
                      <th className="py-2 pr-3">Kenteken</th>
                      <th className="py-2 pr-3">Klant ID</th>
                      <th className="py-2 pr-3">CSV klant</th>
                      <th className="py-2">Gekoppeld</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(result.vehiclesPreview || []).map((row, index) => (
                      <tr
                        key={row.sourceId || index}
                        className={`border-b border-slate-100 ${
                          row.linked ? "" : "bg-amber-50"
                        }`}
                      >
                        <td className="py-2 pr-3">{row.sourceId}</td>
                        <td className="py-2 pr-3">{row.brand}</td>
                        <td className="py-2 pr-3">{row.model}</td>
                        <td className="py-2 pr-3">{row.license}</td>
                        <td className="py-2 pr-3">{row.customerSourceId || '-'}</td>
                        <td className="py-2 pr-3">{row.customerNameFromVehicle || '-'}</td>
                        <td className="py-2">{row.linkedCustomerName || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Niet gekoppelde voertuigen worden geel gemarkeerd.
              </p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}
