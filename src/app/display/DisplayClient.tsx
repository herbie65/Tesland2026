'use client'

import { useEffect, useState, useCallback } from 'react'
import SignaturePad from '@/components/SignaturePad'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

interface WorkOrder {
  id: string
  workOrderNumber: string
  title: string
  description?: string
  workOrderStatus: string
  scheduledAt?: string
  customerName?: string
  vehiclePlate?: string
  vehicleLabel?: string
  notes?: string
  customerNotes?: string
  // Full customer object from API
  customer?: {
    id: string
    name: string
    email?: string
    phone?: string
    mobile?: string
    company?: string
    address?: any
    street?: string
    city?: string
    zipCode?: string
  }
  // Full vehicle object from API
  vehicle?: {
    id: string
    licensePlate: string
    make?: string
    model?: string
    year?: number
    vin?: string
    color?: string
    mileage?: number
  }
  partsLines: Array<{
    id: string
    productName?: string
    articleNumber?: string
    quantity: number
    unitPrice?: number
    totalPrice?: number
    status: string
  }>
  laborLines: Array<{
    id: string
    description: string
    durationMinutes: number
    totalAmount?: number
    userName?: string
  }>
  photos: Array<{
    id: string
    url: string
    description?: string
    type: string
  }>
  customerSignedAt?: string
  customerSignedBy?: string
}

export default function DisplayClient() {
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSignature, setShowSignature] = useState(false)
  const [showPinCodeEntry, setShowPinCodeEntry] = useState(false)
  const [pinCode, setPinCode] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [saving, setSaving] = useState(false)
  const [signed, setSigned] = useState(false)
  
  // Edit customer data state
  const [editingCustomer, setEditingCustomer] = useState(false)
  const [customerForm, setCustomerForm] = useState({
    name: '',
    email: '',
    phone: '',
    mobile: '',
    street: '',
    zipCode: '',
    city: '',
  })

  const fetchActiveWorkOrder = useCallback(async () => {
    try {
      const response = await fetch('/api/display/active')
      const data = await response.json()

      if (data.workOrder) {
        setWorkOrder(data.workOrder)
        setSigned(!!data.workOrder.customerSignedAt)
        setCustomerName(data.workOrder.customerName || '')
        
        // Pre-fill customer form
        if (data.workOrder.customer) {
          setCustomerForm({
            name: data.workOrder.customer.name || '',
            email: data.workOrder.customer.email || '',
            phone: data.workOrder.customer.phone || '',
            mobile: data.workOrder.customer.mobile || '',
            street: data.workOrder.customer.street || '',
            zipCode: data.workOrder.customer.zipCode || '',
            city: data.workOrder.customer.city || '',
          })
        }
      } else {
        setWorkOrder(null)
        setSigned(false)
      }
      setLoading(false)
    } catch (error) {
      console.error('Error fetching work order:', error)
      setLoading(false)
    }
  }, [])

  const handleSaveCustomerData = async () => {
    if (!workOrder?.customer?.id) return
    
    setSaving(true)
    try {
      const response = await fetch(`/api/customers/${workOrder.customer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerForm),
      })

      if (response.ok) {
        setEditingCustomer(false)
        await fetchActiveWorkOrder() // Refresh data
        alert('Uw gegevens zijn bijgewerkt')
      } else {
        const error = await response.json()
        alert('Fout bij opslaan: ' + (error.error || 'Onbekende fout'))
      }
    } catch (error) {
      console.error('Error saving customer data:', error)
      alert('Fout bij opslaan gegevens')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    fetchActiveWorkOrder()

    // Poll for updates every 5 seconds
    const interval = setInterval(fetchActiveWorkOrder, 5000)

    return () => clearInterval(interval)
  }, [fetchActiveWorkOrder])

  const handleSignatureSave = async (signatureData: string) => {
    if (!workOrder) return

    setSaving(true)

    try {
      const response = await fetch('/api/display/signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workOrderId: workOrder.id,
          signatureData,
          customerName: customerName || workOrder.customerName || 'Klant',
          vehiclePinCode: pinCode || null,
        }),
      })

      if (response.ok) {
        setSigned(true)
        setShowSignature(false)
        setShowPinCodeEntry(false)
        setPinCode('')
        // Refresh work order data
        await fetchActiveWorkOrder()
      } else {
        const error = await response.json()
        alert('Fout bij opslaan handtekening: ' + (error.error || 'Onbekende fout'))
      }
    } catch (error) {
      console.error('Error saving signature:', error)
      alert('Fout bij opslaan handtekening')
    } finally {
      setSaving(false)
    }
  }

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      DRAFT: 'Concept',
      OFFERTE: 'Offerte',
      GOEDGEKEURD: 'Goedgekeurd',
      GEPLAND: 'Gepland',
      IN_UITVOERING: 'In uitvoering',
      GEREED: 'Gereed',
      GEFACTUREERD: 'Gefactureerd',
    }
    return statusMap[status] || status
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Laden...</p>
        </div>
      </div>
    )
  }

  if (!workOrder) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-3">Welkom bij Tesland</h1>
          <p className="text-lg text-gray-600">
            Wacht even, onze medewerker opent uw werkorder...
          </p>
        </div>
      </div>
    )
  }

  // Pincode invoer scherm
  if (showPinCodeEntry) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8">
          <button
            onClick={() => setShowPinCodeEntry(false)}
            className="mb-6 text-gray-600 hover:text-gray-800 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Terug
          </button>

          <div className="text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-800 mb-3">Pincode van uw auto</h2>
            <p className="text-gray-600 mb-8">
              Voer de pincode van uw voertuig in, zodat wij indien nodig uw auto kunnen verplaatsen.
            </p>

            <div className="mb-8">
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pinCode}
                onChange={(e) => {
                  // Alleen cijfers toestaan
                  const value = e.target.value.replace(/\D/g, '')
                  setPinCode(value)
                }}
                placeholder="Voer pincode in"
                maxLength={6}
                className="w-full max-w-xs mx-auto text-center text-3xl font-mono tracking-widest px-6 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                autoFocus
              />
              <p className="text-sm text-gray-500 mt-2">Maximaal 6 cijfers</p>
            </div>

            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <button
                onClick={() => {
                  setShowPinCodeEntry(false)
                  setShowSignature(true)
                }}
                disabled={!pinCode}
                className="w-full px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Doorgaan naar handtekening
              </button>
              
              <button
                onClick={() => {
                  setPinCode('')
                  setShowPinCodeEntry(false)
                  setShowSignature(true)
                }}
                className="w-full px-8 py-4 bg-gray-100 text-gray-700 text-lg font-medium rounded-xl hover:bg-gray-200 transition-colors"
              >
                Geen pincode / Overslaan
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (showSignature) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-8">
          <button
            onClick={() => setShowSignature(false)}
            className="mb-6 text-gray-600 hover:text-gray-800 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Terug
          </button>

          <h2 className="text-2xl font-bold text-gray-800 mb-6">Plaats uw handtekening</h2>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Uw naam (optioneel)
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder={workOrder.customerName || 'Naam'}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-4">
              Teken hieronder met uw vinger of stylus om akkoord te gaan met de werkzaamheden.
            </p>
          </div>

          {saving ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Handtekening opslaan...</p>
            </div>
          ) : (
            <SignaturePad
              onSave={handleSignatureSave}
              width={700}
              height={350}
              className="w-full"
            />
          )}
        </div>
      </div>
    )
  }

  if (editingCustomer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-8">
          <button
            onClick={() => setEditingCustomer(false)}
            className="mb-6 text-gray-600 hover:text-gray-800 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Terug
          </button>

          <h2 className="text-2xl font-bold text-gray-800 mb-2">Pas uw gegevens aan</h2>
          <p className="text-gray-600 mb-6">
            Controleer en corrigeer indien nodig uw gegevens. Deze worden direct bijgewerkt in ons systeem.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Naam *
              </label>
              <input
                type="text"
                value={customerForm.name}
                onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                placeholder="Uw volledige naam"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={customerForm.email}
                onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                placeholder="uw@email.nl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefoon
                </label>
                <input
                  type="tel"
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                  placeholder="06-12345678"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mobiel
                </label>
                <input
                  type="tel"
                  value={customerForm.mobile}
                  onChange={(e) => setCustomerForm({ ...customerForm, mobile: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                  placeholder="06-87654321"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Straat + Huisnummer
              </label>
              <input
                type="text"
                value={customerForm.street}
                onChange={(e) => setCustomerForm({ ...customerForm, street: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                placeholder="Straatnaam 123"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Postcode
                </label>
                <input
                  type="text"
                  value={customerForm.zipCode}
                  onChange={(e) => setCustomerForm({ ...customerForm, zipCode: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                  placeholder="1234 AB"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plaats
                </label>
                <input
                  type="text"
                  value={customerForm.city}
                  onChange={(e) => setCustomerForm({ ...customerForm, city: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                  placeholder="Plaatsnaam"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <button
              onClick={handleSaveCustomerData}
              disabled={saving || !customerForm.name}
              className="flex-1 px-6 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Opslaan...' : 'Gegevens Bijwerken'}
            </button>
            <button
              onClick={() => setEditingCustomer(false)}
              className="px-6 py-4 bg-gray-200 text-gray-700 text-lg font-semibold rounded-lg hover:bg-gray-300 transition-colors"
            >
              Annuleren
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header with Hide Button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={async () => {
              try {
                await fetch('/api/display/active', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ workOrderId: null }),
                })
                setWorkOrder(null)
              } catch (error) {
                console.error('Error clearing display:', error)
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white/70 backdrop-blur-md text-gray-700 rounded-xl hover:bg-white/90 transition-all shadow-lg hover:shadow-xl hover:scale-105"
            title="Verberg werkorder (voor medewerkers)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="font-medium">Verberg</span>
          </button>
        </div>

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">{workOrder.title}</h1>
              <p className="text-lg text-gray-600">Werkorder: {workOrder.workOrderNumber}</p>
            </div>
            <div className="text-right">
              <span className="inline-block px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {getStatusLabel(workOrder.workOrderStatus)}
              </span>
            </div>
          </div>

          {/* Customer & Vehicle Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Customer Info */}
            {workOrder.customer && (
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Klant</h3>
                <p className="text-xl font-bold text-gray-900 mb-2">{workOrder.customer.name}</p>
                {workOrder.customer.company && (
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-medium">Bedrijf:</span> {workOrder.customer.company}
                  </p>
                )}
                {workOrder.customer.email && (
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-medium">Email:</span> {workOrder.customer.email}
                  </p>
                )}
                {(workOrder.customer.phone || workOrder.customer.mobile) && (
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-medium">Telefoon:</span> {workOrder.customer.phone || workOrder.customer.mobile}
                  </p>
                )}
                {(workOrder.customer.street || workOrder.customer.city) && (
                  <div className="text-sm text-gray-600 mt-2">
                    <span className="font-medium">Adres:</span>
                    <div className="ml-1 mt-1">
                      {workOrder.customer.street && <div>{workOrder.customer.street}</div>}
                      {(workOrder.customer.zipCode || workOrder.customer.city) && (
                        <div>{workOrder.customer.zipCode} {workOrder.customer.city}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Vehicle Info */}
            {workOrder.vehicle && (
              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Voertuig</h3>
                <p className="text-xl font-bold text-gray-900 mb-2">
                  {workOrder.vehicle.make} {workOrder.vehicle.model}
                </p>
                <p className="text-lg font-semibold text-gray-700 mb-2">
                  {workOrder.vehicle.licensePlate}
                </p>
                {workOrder.vehicle.year && (
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-medium">Bouwjaar:</span> {workOrder.vehicle.year}
                  </p>
                )}
                {workOrder.vehicle.color && (
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-medium">Kleur:</span> {workOrder.vehicle.color}
                  </p>
                )}
                {workOrder.vehicle.vin && (
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-medium">VIN:</span> {workOrder.vehicle.vin}
                  </p>
                )}
                {workOrder.vehicle.mileage && (
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-medium">Laatst bekende kilometerstand:</span> {workOrder.vehicle.mileage.toLocaleString('nl-NL')} km
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Edit customer data button */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <button
              onClick={() => setEditingCustomer(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Zijn uw gegevens niet juist? Pas ze aan
            </button>
          </div>

          {workOrder.scheduledAt && (
            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-1">Gepland</p>
              <p className="text-lg text-gray-800">
                {format(new Date(workOrder.scheduledAt), "EEEE d MMMM yyyy 'om' HH:mm", { locale: nl })}
              </p>
            </div>
          )}

          {workOrder.description && (
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Beschrijving</p>
              <div className="text-gray-800 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: workOrder.description }} />
            </div>
          )}
        </div>

        {/* Description - prominently displayed */}
        {workOrder.description && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Beschrijving Werkzaamheden
            </h2>
            <div className="text-gray-800 prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: workOrder.description }} />
          </div>
        )}

        {/* Labor Lines - What will be done */}
        {workOrder.laborLines && workOrder.laborLines.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Uit te voeren Werkzaamheden
            </h2>
            <div className="space-y-3">
              {workOrder.laborLines.map((labor, index) => (
                <div key={labor.id} className="border-l-4 border-green-500 bg-green-50 pl-4 py-3 rounded-r-lg">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-7 h-7 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-lg">{labor.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {Math.floor(labor.durationMinutes / 60)}u {labor.durationMinutes % 60}min
                        </span>
                        {labor.userName && (
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {labor.userName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Parts Lines */}
        {workOrder.partsLines && workOrder.partsLines.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Benodigde Onderdelen
            </h2>
            <div className="space-y-2">
              {workOrder.partsLines.map((part, index) => (
                <div key={part.id} className="flex justify-between items-center py-3 px-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-gray-900">{part.productName}</p>
                      {part.articleNumber && (
                        <p className="text-sm text-gray-500">Art.nr: {part.articleNumber}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{part.quantity}x</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {(workOrder.notes || workOrder.customerNotes) && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Opmerkingen</h2>
            {workOrder.customerNotes && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-1">Voor u:</p>
                <p className="text-gray-800">{workOrder.customerNotes}</p>
              </div>
            )}
            {workOrder.notes && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Algemeen:</p>
                <p className="text-gray-800">{workOrder.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Signature Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {signed ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Akkoord getekend</h3>
              <p className="text-gray-600">
                Getekend door {workOrder.customerSignedBy}
              </p>
              {workOrder.customerSignedAt && (
                <p className="text-sm text-gray-500 mt-1">
                  {format(new Date(workOrder.customerSignedAt), "d MMMM yyyy 'om' HH:mm", { locale: nl })}
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <h3 className="text-xl font-bold text-gray-800 mb-3">Akkoord verklaring</h3>
              <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                Door te ondertekenen bevestigt u dat wij de hierboven beschreven werkzaamheden mogen uitvoeren en dat u akkoord gaat met de daarbij behorende kosten.
              </p>
              
              <button
                onClick={() => setShowPinCodeEntry(true)}
                className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
              >
                Teken voor akkoord
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
