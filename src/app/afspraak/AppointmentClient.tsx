'use client'

import { useEffect, useMemo, useState } from 'react'
import { addMonths, addDays, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns'
import { nl } from 'date-fns/locale'

type PlanningType = {
  id: string
  name?: string | null
  color?: string | null
}

type DayAvailability = {
  date: string
  status: 'available' | 'limited' | 'full'
}

type SlotOption = {
  value: string
  minutes: number
}

type LookupResult = {
  match: boolean
  plateExists?: boolean
  customer?: {
    id: string
    name: string
    email: string
    phone: string
  }
  vehicle?: {
    id: string
    licensePlate: string
    brand: string
    model: string
    color?: string
  }
}

export default function AppointmentClient() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date())
  const [availability, setAvailability] = useState<DayAvailability[]>([])
  const [slots, setSlots] = useState<SlotOption[]>([])
  const [planningTypes, setPlanningTypes] = useState<PlanningType[]>([])
  const [planningSettings, setPlanningSettings] = useState({
    selectableSaturday: false,
    selectableSunday: false
  })
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [planningTypeId, setPlanningTypeId] = useState<string>('none')
  const [planningTypeLabel, setPlanningTypeLabel] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [licensePlate, setLicensePlate] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [address, setAddress] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [city, setCity] = useState('')
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [vehicleId, setVehicleId] = useState<string | null>(null)
  const [autoFilled, setAutoFilled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successOpen, setSuccessOpen] = useState(false)
  const [requestOpen, setRequestOpen] = useState(false)
  const [lookupStep, setLookupStep] = useState<'plate' | 'email' | 'details' | 'confirm'>('plate')
  const [lookupMessage, setLookupMessage] = useState<string | null>(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupVehicle, setLookupVehicle] = useState<LookupResult['vehicle'] | null>(null)
  const [rdwLookupLoading, setRdwLookupLoading] = useState(false)
  const [rdwLookupError, setRdwLookupError] = useState<string | null>(null)

  const monthKey = format(currentMonth, 'yyyy-MM')
  const today = new Date()
  const todayKey = format(today, 'yyyy-MM-dd')
  const currentMonthKey = format(today, 'yyyy-MM')

  const dayAvailabilityMap = useMemo(() => {
    const map = new Map<string, DayAvailability['status']>()
    availability.forEach((day) => map.set(day.date, day.status))
    return map
  }, [availability])

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 })
    const days: Date[] = []
    for (let day = start; day <= end; day = addDays(day, 1)) {
      days.push(day)
    }
    return days
  }, [currentMonth])

  const loadMonthAvailability = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/public/appointments/availability?month=${monthKey}`)
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Beschikbaarheid laden mislukt')
      }
      setAvailability(data.days || [])
      setPlanningSettings({
        selectableSaturday: Boolean(data.settings?.selectableSaturday),
        selectableSunday: Boolean(data.settings?.selectableSunday)
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadSlots = async (date: string) => {
    try {
      const response = await fetch(`/api/public/appointments/availability?date=${date}`)
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Tijden laden mislukt')
      }
      setSlots(data.slots || [])
      setPlanningSettings({
        selectableSaturday: Boolean(data.settings?.selectableSaturday),
        selectableSunday: Boolean(data.settings?.selectableSunday)
      })
    } catch (err: any) {
      setError(err.message)
      setSlots([])
    }
  }

  const loadPlanningTypes = async () => {
    try {
      const response = await fetch('/api/planning-types')
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Planningstypes laden mislukt')
      }
      setPlanningTypes(data.items || [])
    } catch (err: any) {
      setError(err.message)
    }
  }

  useEffect(() => {
    loadMonthAvailability()
  }, [monthKey])

  useEffect(() => {
    loadPlanningTypes()
  }, [])

  useEffect(() => {
    if (selectedDate) {
      loadSlots(selectedDate)
    }
  }, [selectedDate])

  const handlePlateCheck = async () => {
    if (!licensePlate.trim()) return
    try {
      setLookupLoading(true)
      setLookupMessage(null)
      setRdwLookupError(null)
      const response = await fetch('/api/public/appointments/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licensePlate })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error('Kenteken controleren mislukt.')
      }
      const result = data as LookupResult
      if (result.plateExists) {
        setVehicleId(result.vehicle?.id || null)
        setLookupStep('email')
        setLookupVehicle(result.vehicle || null)
        setLookupMessage('Kenteken gevonden. Vul het e-mailadres in dat bij ons bekend is.')
      } else {
        setLookupVehicle(null)
        setLookupMessage('Kenteken niet bekend bij ons. Voer uw gegevens in.')
        setLookupStep('details')
        setAutoFilled(false)
        setCustomerId(null)
        await handleRdwLookup()
      }
    } catch (err: any) {
      setError('We kunnen het kenteken nu niet controleren. Probeer het later opnieuw.')
    } finally {
      setLookupLoading(false)
    }
  }

  const handleEmailCheck = async () => {
    if (!licensePlate.trim() || !email.trim()) return
    try {
      setLookupLoading(true)
      setLookupMessage(null)
      const response = await fetch('/api/public/appointments/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licensePlate, email })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error('E-mailadres controleren mislukt.')
      }
      const result = data as LookupResult
      if (result.match && result.customer) {
        setName(result.customer.name)
        setEmail(result.customer.email)
        setPhone(result.customer.phone || '')
        setCustomerId(result.customer.id)
        setAutoFilled(true)
        setLookupVehicle(result.vehicle || null)
        setLookupStep('confirm')
        setLookupMessage('E-mailadres klopt. U kunt de afspraak aanvragen.')
      } else {
        setAutoFilled(false)
        setCustomerId(null)
        setLookupStep('details')
        setLookupVehicle(result.vehicle || null)
        setLookupMessage(
          'Wij herkennen dit e-mailadres niet bij dit voertuig. Voer uw gegevens in.'
        )
      }
    } catch (err: any) {
      setError('We kunnen het e-mailadres nu niet controleren. Probeer het later opnieuw.')
    } finally {
      setLookupLoading(false)
    }
  }

  const handleRdwLookup = async () => {
    if (!licensePlate.trim()) return
    try {
      setRdwLookupLoading(true)
      setRdwLookupError(null)
      const response = await fetch('/api/public/appointments/rdw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licensePlate })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'RDW lookup failed')
      }
      if (data.vehicle) {
        setLookupVehicle(data.vehicle)
      }
    } catch (err: any) {
      setRdwLookupError(err.message || 'RDW lookup mislukt')
    } finally {
      setRdwLookupLoading(false)
    }
  }

  const openRequestModal = () => {
    setRequestOpen(true)
    setLookupStep('plate')
    setLookupMessage(null)
    setLicensePlate('')
    setEmail('')
    setName('')
    setPhone('')
    setCompany('')
    setAddress('')
    setPostalCode('')
    setCity('')
    setCustomerId(null)
    setVehicleId(null)
    setAutoFilled(false)
  }

  const handleSubmit = async () => {
    try {
      setError(null)
      if (!selectedDate || !selectedTime) {
        throw new Error('Kies eerst een datum en tijd.')
      }
      if (licensePlate && !email) {
        throw new Error('Vul uw e-mailadres in.')
      }
      if (!name || !email || (!autoFilled && !phone)) {
        throw new Error('Vul uw naam, e-mailadres en telefoonnummer in.')
      }
      if (lookupStep === 'details' && (!address || !postalCode || !city)) {
        throw new Error('Vul uw adresgegevens volledig in.')
      }
      const type = planningTypes.find((item) => item.id === planningTypeId)
      const payload = {
        date: selectedDate,
        time: selectedTime,
        licensePlate: licensePlate || null,
        email,
        name,
        phone: phone || null,
        company: company || null,
        address: address || null,
        postalCode: postalCode || null,
        city: city || null,
        notes: notes || null,
        planningTypeId: type ? type.id : null,
        planningTypeName: type?.name || planningTypeLabel || null,
        planningTypeColor: type?.color || null,
        customerId,
        vehicleId
      }
      const response = await fetch('/api/public/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error('Aanvraag mislukt. Probeer het later opnieuw.')
      }
      setSuccessOpen(true)
      setSelectedTime('')
      setSelectedDate('')
      setNotes('')
      setRequestOpen(false)
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold">Planning</h2>
        <p className="mt-2 text-sm text-slate-600">
          Kies een datum en tijd om een afspraak aan te vragen.
        </p>
        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between">
              <button
                className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
                disabled={format(currentMonth, 'yyyy-MM') <= currentMonthKey}
              >
                &lt;
              </button>
              <h3 className="text-sm font-semibold text-slate-700">
                {format(currentMonth, 'MMMM yyyy', { locale: nl })}
              </h3>
              <button
                className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-white"
                type="button"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                &gt;
              </button>
            </div>
            <div className="mt-5 grid grid-cols-7 gap-2 justify-items-center text-xs text-slate-500">
              {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map((label) => (
                <div key={label} className="text-center font-semibold">
                  {label}
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-7 gap-2 justify-items-center text-sm">
              {calendarDays.map((day) => {
                const dayKey = format(day, 'yyyy-MM-dd')
                const isCurrent = format(day, 'yyyy-MM') === monthKey
                const isPast = dayKey < todayKey
                const dayIndex = day.getDay()
                const weekendClosed =
                  (dayIndex === 6 && !planningSettings.selectableSaturday) ||
                  (dayIndex === 0 && !planningSettings.selectableSunday)
                const availabilityStatus = dayAvailabilityMap.get(dayKey)
                const selected = dayKey === selectedDate
                const base = isCurrent ? 'text-slate-900' : 'text-slate-300'
                const availabilityClass =
                  weekendClosed
                    ? 'bg-slate-200 text-slate-400'
                    : availabilityStatus === 'full'
                      ? 'bg-red-500 text-white'
                      : availabilityStatus === 'limited'
                        ? 'bg-orange-400 text-white'
                        : availabilityStatus === 'available'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-white'
                if (isPast) {
                  return <div key={dayKey} className="h-10 w-10" />
                }
                return (
                  <button
                    key={dayKey}
                    type="button"
                    onClick={() => {
                      if (weekendClosed || availabilityStatus === 'full') return
                      setSelectedDate(dayKey)
                    }}
                    className={`flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 ${base} ${availabilityClass} ${
                      selected ? 'ring-2 ring-slate-900' : ''
                    }`}
                    disabled={weekendClosed}
                  >
                    {format(day, 'd')}
                  </button>
                )
              })}
            </div>
            {loading ? (
              <p className="mt-4 text-xs text-slate-500">Beschikbaarheid laden...</p>
            ) : (
              <p className="mt-4 text-xs text-slate-500">
                Groen = plek, oranje = beperkt, rood = vol, grijs = gesloten.
              </p>
            )}
          </div>

          <div className="space-y-4">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Datum
              <input
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-base"
                value={selectedDate}
                readOnly
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Hoe laat wilt u uw voertuig brengen?
              <select
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-base"
                value={selectedTime}
                onChange={(event) => setSelectedTime(event.target.value)}
                disabled={!selectedDate}
              >
                <option value="">Kies tijd</option>
                {slots.map((slot) => (
                  <option key={slot.value} value={slot.value}>
                    {slot.value} uur
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Wat moet er gebeuren?
              <select
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-base"
                value={planningTypeId}
                onChange={(event) => {
                  setPlanningTypeId(event.target.value)
                  setPlanningTypeLabel('')
                }}
              >
                <option value="none">Kies type</option>
                {planningTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name || type.id}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Verdere opmerkingen
              <textarea
                className="min-h-[96px] rounded-lg border border-slate-200 px-3 py-2 text-base"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={openRequestModal}
          disabled={!selectedDate || !selectedTime}
        >
          Planning aanvragen
        </button>
      </div>

      {requestOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-6 backdrop-blur-sm"
          onClick={() => setRequestOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold">Planning aanvragen</h3>
              <button
                className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50"
                type="button"
                onClick={() => setRequestOpen(false)}
              >
                Sluiten
              </button>
            </div>

            {lookupMessage ? (
              <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                {lookupMessage}
              </p>
            ) : null}

            {lookupVehicle ? (
              <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                <p className="text-xs font-semibold uppercase text-slate-500">Voertuig</p>
                <p>
                  {lookupVehicle.brand || '-'} {lookupVehicle.model || ''}
                </p>
                <p>Kleur: {lookupVehicle.color || '-'}</p>
              </div>
            ) : null}

            {lookupStep === 'plate' ? (
              <div className="mt-4 grid gap-3">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Uw kenteken
                  <input
                    className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                    value={licensePlate}
                    onChange={(event) => setLicensePlate(event.target.value)}
                  />
                </label>
                <button
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                  onClick={handlePlateCheck}
                  disabled={!licensePlate.trim() || lookupLoading}
                >
                  {lookupLoading ? 'Controleren...' : 'Verder'}
                </button>
                <button
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                  onClick={handleRdwLookup}
                  disabled={!licensePlate.trim() || rdwLookupLoading}
                >
                  {rdwLookupLoading ? 'RDW ophalen...' : 'RDW ophalen'}
                </button>
                {rdwLookupError ? (
                  <p className="text-xs text-red-600">{rdwLookupError}</p>
                ) : null}
              </div>
            ) : null}

            {lookupStep === 'email' ? (
              <div className="mt-4 grid gap-3">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  E-mailadres
                  <input
                    className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </label>
                <button
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                  onClick={handleEmailCheck}
                  disabled={!email.trim() || lookupLoading}
                >
                  {lookupLoading ? 'Controleren...' : 'Verder'}
                </button>
              </div>
            ) : null}

            {lookupStep === 'details' ? (
              <div className="mt-4 grid gap-3">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Bedrijfsnaam (optioneel)
                  <input
                    className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                    value={company}
                    onChange={(event) => setCompany(event.target.value)}
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Naam
                  <input
                    className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Adres
                  <input
                    className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    Postcode
                    <input
                      className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                      value={postalCode}
                      onChange={(event) => setPostalCode(event.target.value)}
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    Plaats
                    <input
                      className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                      value={city}
                      onChange={(event) => setCity(event.target.value)}
                    />
                  </label>
                </div>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  E-mailadres
                  <input
                    className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Telefoon
                  <input
                    className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                  />
                </label>
                <button
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
                  type="button"
                  onClick={handleSubmit}
                >
                  Afspraak aanvragen
                </button>
              </div>
            ) : null}

            {lookupStep === 'confirm' ? (
              <div className="mt-4 grid gap-3">
                <p className="text-sm text-slate-600">
                  {name} · {email}
                </p>
                <button
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
                  type="button"
                  onClick={handleSubmit}
                >
                  Afspraak aanvragen
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {successOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-6 backdrop-blur-sm"
          onClick={() => setSuccessOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-lg font-semibold">Afspraak aangevraagd</h3>
            <p className="mt-3 text-sm text-slate-600">
              Uw afspraak is aangevraagd. Let op: deze is pas bevestigd als u van ons een
              bevestigingsmail heeft ontvangen.
            </p>
            <button
              className="mt-6 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
              type="button"
              onClick={() => setSuccessOpen(false)}
            >
              Sluiten
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
