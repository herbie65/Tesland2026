'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { isDutchLicensePlate, normalizeLicensePlate } from '@/lib/license-plate'

type PartsLine = {
  id: string
  productName: string
  articleNumber?: string | null
  quantity: number
  unitPrice?: number | null
  totalPrice?: number | null
  status: string
  notes?: string | null
  product?: any
  location?: any
}

type LaborLine = {
  id: string
  description: string
  userName?: string | null
  durationMinutes: number
  hourlyRate?: number | null
  totalAmount?: number | null
  notes?: string | null
  user?: any
}

type WorkOrderPhoto = {
  id: string
  url: string
  filename?: string | null
  description?: string | null
  type: string
  uploader?: any
  createdAt: string
}

type WorkOrder = {
  id: string
  workOrderNumber?: string | null
  title: string
  workOrderStatus?: string | null
  scheduledAt?: string | null
  completedAt?: string | null
  notes?: string | null
  internalNotes?: string | null
  customerNotes?: string | null
  customer?: any
  vehicle?: any
  assignee?: any
  partsLines?: PartsLine[]
  laborLines?: LaborLine[]
  photos?: WorkOrderPhoto[]
  priceAmount?: number | null
  estimatedAmount?: number | null
  customerApproved?: boolean | null
}

export default function WorkOrderDetailClient() {
  const params = useParams()
  const router = useRouter()
  const workOrderId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string)
  
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'parts' | 'labor' | 'photos' | 'notes'>('parts')
  
  // Parts state
  const [showPartForm, setShowPartForm] = useState(false)
  const [partForm, setPartForm] = useState({
    productName: '',
    articleNumber: '',
    quantity: 1,
    unitPrice: '',
    status: 'PENDING',
    notes: ''
  })
  const [editingPartId, setEditingPartId] = useState<string | null>(null)

  // Labor state
  const [showLaborForm, setShowLaborForm] = useState(false)
  const [laborForm, setLaborForm] = useState({
    description: '',
    durationMinutes: 0,
    hourlyRate: '',
    notes: ''
  })
  const [editingLaborId, setEditingLaborId] = useState<string | null>(null)

  // Photo state
  const [showPhotoForm, setShowPhotoForm] = useState(false)
  const [photoForm, setPhotoForm] = useState({
    url: '',
    description: '',
    type: 'general'
  })

  // Notes state
  const [notesEditing, setNotesEditing] = useState(false)
  const [notesForm, setNotesForm] = useState({
    customerNotes: '',
    internalNotes: ''
  })

  const loadData = async () => {
    if (!workOrderId) return
    try {
      setLoading(true)
      setError(null)
      const response = await apiFetch(`/api/workorders/${workOrderId}`)
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Werkorder laden mislukt')
      }

      setWorkOrder(data.item)
      setNotesForm({
        customerNotes: data.item.customerNotes || '',
        internalNotes: data.item.internalNotes || ''
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [workOrderId])

  const handleSavePart = async () => {
    try {
      if (editingPartId) {
        await apiFetch(`/api/workorders/${workOrderId}/parts/${editingPartId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            ...partForm,
            unitPrice: partForm.unitPrice ? Number(partForm.unitPrice) : null,
            quantity: Number(partForm.quantity)
          })
        })
      } else {
        await apiFetch(`/api/workorders/${workOrderId}/parts`, {
          method: 'POST',
          body: JSON.stringify({
            ...partForm,
            unitPrice: partForm.unitPrice ? Number(partForm.unitPrice) : null,
            quantity: Number(partForm.quantity)
          })
        })
      }
      setShowPartForm(false)
      setEditingPartId(null)
      setPartForm({ productName: '', articleNumber: '', quantity: 1, unitPrice: '', status: 'PENDING', notes: '' })
      loadData()
    } catch (err: any) {
      alert('Fout bij opslaan: ' + err.message)
    }
  }

  const handleDeletePart = async (partId: string) => {
    if (!confirm('Weet je zeker dat je dit onderdeel wilt verwijderen?')) return
    try {
      await apiFetch(`/api/workorders/${workOrderId}/parts/${partId}`, { method: 'DELETE' })
      loadData()
    } catch (err: any) {
      alert('Fout bij verwijderen: ' + err.message)
    }
  }

  const handleSaveLabor = async () => {
    try {
      if (editingLaborId) {
        await apiFetch(`/api/workorders/${workOrderId}/labor/${editingLaborId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            ...laborForm,
            durationMinutes: Number(laborForm.durationMinutes),
            hourlyRate: laborForm.hourlyRate ? Number(laborForm.hourlyRate) : null
          })
        })
      } else {
        await apiFetch(`/api/workorders/${workOrderId}/labor`, {
          method: 'POST',
          body: JSON.stringify({
            ...laborForm,
            durationMinutes: Number(laborForm.durationMinutes),
            hourlyRate: laborForm.hourlyRate ? Number(laborForm.hourlyRate) : null
          })
        })
      }
      setShowLaborForm(false)
      setEditingLaborId(null)
      setLaborForm({ description: '', durationMinutes: 0, hourlyRate: '', notes: '' })
      loadData()
    } catch (err: any) {
      alert('Fout bij opslaan: ' + err.message)
    }
  }

  const handleDeleteLabor = async (laborId: string) => {
    if (!confirm('Weet je zeker dat je deze werkzaamheid wilt verwijderen?')) return
    try {
      await apiFetch(`/api/workorders/${workOrderId}/labor/${laborId}`, { method: 'DELETE' })
      loadData()
    } catch (err: any) {
      alert('Fout bij verwijderen: ' + err.message)
    }
  }

  const handleSavePhoto = async () => {
    try {
      await apiFetch(`/api/workorders/${workOrderId}/photos`, {
        method: 'POST',
        body: JSON.stringify(photoForm)
      })
      setShowPhotoForm(false)
      setPhotoForm({ url: '', description: '', type: 'general' })
      loadData()
    } catch (err: any) {
      alert('Fout bij opslaan: ' + err.message)
    }
  }

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Weet je zeker dat je deze foto wilt verwijderen?')) return
    try {
      await apiFetch(`/api/workorders/${workOrderId}/photos/${photoId}`, { method: 'DELETE' })
      loadData()
    } catch (err: any) {
      alert('Fout bij verwijderen: ' + err.message)
    }
  }

  const handleSaveNotes = async () => {
    try {
      await apiFetch(`/api/workorders/${workOrderId}`, {
        method: 'PATCH',
        body: JSON.stringify(notesForm)
      })
      setNotesEditing(false)
      loadData()
    } catch (err: any) {
      alert('Fout bij opslaan: ' + err.message)
    }
  }

  const formatCurrency = (amount?: number | null) => {
    if (!amount) return '€ 0,00'
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(Number(amount))
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins}m`
    if (mins === 0) return `${hours}u`
    return `${hours}u ${mins}m`
  }

  const calculateTotals = () => {
    const partsTotal = (workOrder?.partsLines || []).reduce((sum, part) => sum + Number(part.totalPrice || 0), 0)
    const laborTotal = (workOrder?.laborLines || []).reduce((sum, labor) => sum + Number(labor.totalAmount || 0), 0)
    const subtotal = partsTotal + laborTotal
    const vat = subtotal * 0.21
    const total = subtotal + vat
    return { partsTotal, laborTotal, subtotal, vat, total }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-slate-600">Laden...</div>
      </div>
    )
  }

  if (error || !workOrder) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
          {error || 'Werkorder niet gevonden'}
        </div>
      </div>
    )
  }

  const totals = calculateTotals()

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push('/admin/workorders')}
              className="mb-2 text-sm text-slate-600 hover:text-slate-900"
            >
              ← Terug naar werkorders
            </button>
            <h1 className="text-3xl font-bold text-slate-900">
              {workOrder.workOrderNumber || workOrder.id}
            </h1>
            <p className="text-slate-600">{workOrder.title}</p>
          </div>
          <div className="text-right">
            <div className="mb-2 text-sm text-slate-600">Status</div>
            <div className="rounded-full bg-blue-100 px-4 py-2 font-semibold text-blue-700">
              {workOrder.workOrderStatus || 'DRAFT'}
            </div>
          </div>
        </div>

        {/* Customer & Vehicle Info */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Klant</h2>
            {workOrder.customer ? (
              <div className="space-y-2 text-sm">
                <div><strong>Naam:</strong> {workOrder.customer.name}</div>
                {workOrder.customer.email && <div><strong>Email:</strong> {workOrder.customer.email}</div>}
                {workOrder.customer.phone && <div><strong>Telefoon:</strong> {workOrder.customer.phone}</div>}
              </div>
            ) : (
              <div className="text-sm text-slate-500">Geen klant gekoppeld</div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Voertuig</h2>
            {workOrder.vehicle ? (
              <div className="space-y-2 text-sm">
                <div><strong>Merk:</strong> {workOrder.vehicle.make}</div>
                <div><strong>Model:</strong> {workOrder.vehicle.model}</div>
                {workOrder.vehicle.licensePlate && (
                  <div><strong>Kenteken:</strong> {workOrder.vehicle.licensePlate}</div>
                )}
              </div>
            ) : (
              <div className="text-sm text-slate-500">Geen voertuig gekoppeld</div>
            )}
          </div>
        </div>

        {/* Totals Summary */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Totalen</h2>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <div className="text-sm text-slate-600">Onderdelen</div>
              <div className="text-xl font-bold text-slate-900">{formatCurrency(totals.partsTotal)}</div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Arbeid</div>
              <div className="text-xl font-bold text-slate-900">{formatCurrency(totals.laborTotal)}</div>
            </div>
            <div>
              <div className="text-sm text-slate-600">BTW (21%)</div>
              <div className="text-xl font-bold text-slate-900">{formatCurrency(totals.vat)}</div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Totaal</div>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totals.total)}</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex border-b border-slate-200">
            {[
              { id: 'parts' as const, label: 'Onderdelen', count: workOrder.partsLines?.length || 0 },
              { id: 'labor' as const, label: 'Werkzaamheden', count: workOrder.laborLines?.length || 0 },
              { id: 'photos' as const, label: "Foto's", count: workOrder.photos?.length || 0 },
              { id: 'notes' as const, label: 'Notities', count: 0 }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-6 py-4 text-center font-medium transition ${
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Parts Tab */}
            {activeTab === 'parts' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">Onderdelen</h3>
                  <button
                    onClick={() => {
                      setShowPartForm(true)
                      setEditingPartId(null)
                      setPartForm({ productName: '', articleNumber: '', quantity: 1, unitPrice: '', status: 'PENDING', notes: '' })
                    }}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    + Onderdeel toevoegen
                  </button>
                </div>

                {showPartForm && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <h4 className="mb-4 font-semibold">
                      {editingPartId ? 'Onderdeel bewerken' : 'Nieuw onderdeel'}
                    </h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Omschrijving *
                        </label>
                        <input
                          type="text"
                          value={partForm.productName}
                          onChange={(e) => setPartForm({ ...partForm, productName: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Artikelnummer
                        </label>
                        <input
                          type="text"
                          value={partForm.articleNumber}
                          onChange={(e) => setPartForm({ ...partForm, articleNumber: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Aantal *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={partForm.quantity}
                          onChange={(e) => setPartForm({ ...partForm, quantity: Number(e.target.value) })}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Prijs per stuk (€)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={partForm.unitPrice}
                          onChange={(e) => setPartForm({ ...partForm, unitPrice: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Status
                        </label>
                        <select
                          value={partForm.status}
                          onChange={(e) => setPartForm({ ...partForm, status: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        >
                          <option value="PENDING">In behandeling</option>
                          <option value="BESTELD">Besteld</option>
                          <option value="ONDERWEG">Onderweg</option>
                          <option value="BINNEN">Binnen</option>
                          <option value="GEMONTEERD">Gemonteerd</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Notities
                        </label>
                        <textarea
                          value={partForm.notes}
                          onChange={(e) => setPartForm({ ...partForm, notes: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                          rows={2}
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={handleSavePart}
                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                      >
                        Opslaan
                      </button>
                      <button
                        onClick={() => {
                          setShowPartForm(false)
                          setEditingPartId(null)
                        }}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Annuleren
                      </button>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-slate-200 bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Omschrijving</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Art.nr</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Aantal</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Prijs/st</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Totaal</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Status</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Acties</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(workOrder.partsLines || []).map((part) => (
                        <tr key={part.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm text-slate-900">{part.productName}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{part.articleNumber || '-'}</td>
                          <td className="px-4 py-3 text-center text-sm text-slate-900">{part.quantity}</td>
                          <td className="px-4 py-3 text-right text-sm text-slate-900">
                            {part.unitPrice ? formatCurrency(part.unitPrice) : '-'}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                            {formatCurrency(part.totalPrice)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                              {part.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => {
                                setEditingPartId(part.id)
                                setPartForm({
                                  productName: part.productName,
                                  articleNumber: part.articleNumber || '',
                                  quantity: part.quantity,
                                  unitPrice: part.unitPrice?.toString() || '',
                                  status: part.status,
                                  notes: part.notes || ''
                                })
                                setShowPartForm(true)
                              }}
                              className="mr-2 text-sm text-blue-600 hover:text-blue-800"
                            >
                              Bewerk
                            </button>
                            <button
                              onClick={() => handleDeletePart(part.id)}
                              className="text-sm text-red-600 hover:text-red-800"
                            >
                              Verwijder
                            </button>
                          </td>
                        </tr>
                      ))}
                      {(workOrder.partsLines || []).length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                            Geen onderdelen toegevoegd
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Labor Tab */}
            {activeTab === 'labor' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">Werkzaamheden</h3>
                  <button
                    onClick={() => {
                      setShowLaborForm(true)
                      setEditingLaborId(null)
                      setLaborForm({ description: '', durationMinutes: 0, hourlyRate: '', notes: '' })
                    }}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    + Werkzaamheid toevoegen
                  </button>
                </div>

                {showLaborForm && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <h4 className="mb-4 font-semibold">
                      {editingLaborId ? 'Werkzaamheid bewerken' : 'Nieuwe werkzaamheid'}
                    </h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Omschrijving *
                        </label>
                        <input
                          type="text"
                          value={laborForm.description}
                          onChange={(e) => setLaborForm({ ...laborForm, description: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                          placeholder="Bijv. APK controle, remblokken vervangen"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Tijd (minuten) *
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="15"
                          value={laborForm.durationMinutes}
                          onChange={(e) => setLaborForm({ ...laborForm, durationMinutes: Number(e.target.value) })}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Uurtarief (€)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={laborForm.hourlyRate}
                          onChange={(e) => setLaborForm({ ...laborForm, hourlyRate: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Notities
                        </label>
                        <textarea
                          value={laborForm.notes}
                          onChange={(e) => setLaborForm({ ...laborForm, notes: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                          rows={2}
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={handleSaveLabor}
                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                      >
                        Opslaan
                      </button>
                      <button
                        onClick={() => {
                          setShowLaborForm(false)
                          setEditingLaborId(null)
                        }}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Annuleren
                      </button>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-slate-200 bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Omschrijving</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Monteur</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Tijd</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Uurtarief</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Totaal</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Acties</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(workOrder.laborLines || []).map((labor) => (
                        <tr key={labor.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm text-slate-900">{labor.description}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{labor.userName || '-'}</td>
                          <td className="px-4 py-3 text-center text-sm text-slate-900">
                            {formatDuration(labor.durationMinutes)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-slate-900">
                            {labor.hourlyRate ? formatCurrency(labor.hourlyRate) : '-'}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                            {formatCurrency(labor.totalAmount)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => {
                                setEditingLaborId(labor.id)
                                setLaborForm({
                                  description: labor.description,
                                  durationMinutes: labor.durationMinutes,
                                  hourlyRate: labor.hourlyRate?.toString() || '',
                                  notes: labor.notes || ''
                                })
                                setShowLaborForm(true)
                              }}
                              className="mr-2 text-sm text-blue-600 hover:text-blue-800"
                            >
                              Bewerk
                            </button>
                            <button
                              onClick={() => handleDeleteLabor(labor.id)}
                              className="text-sm text-red-600 hover:text-red-800"
                            >
                              Verwijder
                            </button>
                          </td>
                        </tr>
                      ))}
                      {(workOrder.laborLines || []).length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                            Geen werkzaamheden toegevoegd
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Photos Tab */}
            {activeTab === 'photos' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">Foto's</h3>
                  <button
                    onClick={() => setShowPhotoForm(true)}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    + Foto toevoegen
                  </button>
                </div>

                {showPhotoForm && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <h4 className="mb-4 font-semibold">Nieuwe foto</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          URL *
                        </label>
                        <input
                          type="text"
                          value={photoForm.url}
                          onChange={(e) => setPhotoForm({ ...photoForm, url: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                          placeholder="https://..."
                        />
                        <p className="mt-1 text-xs text-slate-500">
                          Tip: Upload foto naar externe service en plak hier de URL
                        </p>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Type
                        </label>
                        <select
                          value={photoForm.type}
                          onChange={(e) => setPhotoForm({ ...photoForm, type: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        >
                          <option value="general">Algemeen</option>
                          <option value="before">Voor</option>
                          <option value="after">Na</option>
                          <option value="damage">Schade</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Beschrijving
                        </label>
                        <textarea
                          value={photoForm.description}
                          onChange={(e) => setPhotoForm({ ...photoForm, description: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                          rows={2}
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={handleSavePhoto}
                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                      >
                        Opslaan
                      </button>
                      <button
                        onClick={() => setShowPhotoForm(false)}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Annuleren
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-3">
                  {(workOrder.photos || []).map((photo) => (
                    <div key={photo.id} className="group relative overflow-hidden rounded-lg border border-slate-200">
                      <img
                        src={photo.url}
                        alt={photo.description || 'Werkorder foto'}
                        className="h-48 w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 transition group-hover:bg-opacity-50" />
                      <div className="absolute bottom-0 left-0 right-0 bg-white bg-opacity-90 p-3 opacity-0 transition group-hover:opacity-100">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                            {photo.type}
                          </span>
                          <button
                            onClick={() => handleDeletePhoto(photo.id)}
                            className="text-sm text-red-600 hover:text-red-800"
                          >
                            Verwijder
                          </button>
                        </div>
                        {photo.description && (
                          <p className="text-xs text-slate-600">{photo.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {(workOrder.photos || []).length === 0 && (
                    <div className="col-span-3 py-8 text-center text-sm text-slate-500">
                      Geen foto's toegevoegd
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes Tab */}
            {activeTab === 'notes' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">Notities</h3>
                  {!notesEditing && (
                    <button
                      onClick={() => setNotesEditing(true)}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Bewerken
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Klant notities (zichtbaar voor klant)
                    </label>
                    {notesEditing ? (
                      <textarea
                        value={notesForm.customerNotes}
                        onChange={(e) => setNotesForm({ ...notesForm, customerNotes: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        rows={6}
                        placeholder="Deze notities zijn zichtbaar voor de klant in offertes en facturen"
                      />
                    ) : (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                        {workOrder.customerNotes || <em className="text-slate-500">Geen klant notities</em>}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Interne notities (alleen intern zichtbaar)
                    </label>
                    {notesEditing ? (
                      <textarea
                        value={notesForm.internalNotes}
                        onChange={(e) => setNotesForm({ ...notesForm, internalNotes: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        rows={6}
                        placeholder="Deze notities zijn alleen intern zichtbaar"
                      />
                    ) : (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                        {workOrder.internalNotes || <em className="text-slate-500">Geen interne notities</em>}
                      </div>
                    )}
                  </div>

                  {notesEditing && (
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveNotes}
                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                      >
                        Opslaan
                      </button>
                      <button
                        onClick={() => {
                          setNotesEditing(false)
                          setNotesForm({
                            customerNotes: workOrder.customerNotes || '',
                            internalNotes: workOrder.internalNotes || ''
                          })
                        }}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Annuleren
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Export Actions */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Exporteren</h2>
          <div className="flex gap-3">
            <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              📄 Offerte genereren
            </button>
            <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              🧾 Factuur genereren
            </button>
            <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              📧 Email naar klant
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
