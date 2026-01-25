'use client'

import { useEffect, useMemo, useState } from 'react'
import { addMonths, addDays, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns'
import type { Locale } from 'date-fns'
import { nl, enUS, de, fr } from 'date-fns/locale'

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

type SupportedLocale = 'nl' | 'en' | 'de' | 'fr'

type TranslationCopy = {
  title: string
  subtitle: string
  availabilityLoading: string
  availabilityLegend: string
  dateLabel: string
  timeLabel: string
  timePlaceholder: string
  timeSuffix: string
  planningTypeLabel: string
  planningTypePlaceholder: string
  notesLabel: string
  requestButton: string
  modalTitle: string
  close: string
  vehicleLabel: string
  colorLabel: string
  plateLabel: string
  next: string
  checking: string
  rdwFetch: string
  rdwFetching: string
  emailLabel: string
  companyLabel: string
  nameLabel: string
  addressLabel: string
  postalCodeLabel: string
  cityLabel: string
  phoneLabel: string
  submitAppointment: string
  successTitle: string
  successBody: string
  lookupPlateFound: string
  lookupPlateUnknown: string
  lookupEmailMatch: string
  lookupEmailMismatch: string
  errorPlateCheck: string
  errorEmailCheck: string
  errorAvailability: string
  errorSlots: string
  errorPlanningTypes: string
  errorRdw: string
  errorSelectDateTime: string
  errorMissingEmail: string
  errorMissingContact: string
  errorMissingAddress: string
  errorSubmit: string
  daysShort: string[]
}

const copyByLocale: Record<SupportedLocale, TranslationCopy> = {
  nl: {
    title: 'Planning',
    subtitle: 'Kies een datum en tijd om een afspraak aan te vragen.',
    availabilityLoading: 'Beschikbaarheid laden...',
    availabilityLegend: 'Groen = plek, oranje = beperkt, rood = vol, grijs = gesloten.',
    dateLabel: 'Datum',
    timeLabel: 'Hoe laat wilt u uw voertuig brengen?',
    timePlaceholder: 'Kies tijd',
    timeSuffix: 'uur',
    planningTypeLabel: 'Wat moet er gebeuren?',
    planningTypePlaceholder: 'Kies type',
    notesLabel: 'Verdere opmerkingen',
    requestButton: 'Planning aanvragen',
    modalTitle: 'Planning aanvragen',
    close: 'Sluiten',
    vehicleLabel: 'Voertuig',
    colorLabel: 'Kleur',
    plateLabel: 'Uw kenteken',
    next: 'Verder',
    checking: 'Controleren...',
    rdwFetch: 'RDW ophalen',
    rdwFetching: 'RDW ophalen...',
    emailLabel: 'E-mailadres',
    companyLabel: 'Bedrijfsnaam (optioneel)',
    nameLabel: 'Naam',
    addressLabel: 'Adres',
    postalCodeLabel: 'Postcode',
    cityLabel: 'Plaats',
    phoneLabel: 'Telefoon',
    submitAppointment: 'Afspraak aanvragen',
    successTitle: 'Afspraak aangevraagd',
    successBody:
      'Uw afspraak is aangevraagd. Let op: deze is pas bevestigd als u van ons een bevestigingsmail heeft ontvangen.',
    lookupPlateFound: 'Kenteken gevonden. Vul het e-mailadres in dat bij ons bekend is.',
    lookupPlateUnknown: 'Kenteken niet bekend bij ons. Voer uw gegevens in.',
    lookupEmailMatch: 'E-mailadres klopt. U kunt de afspraak aanvragen.',
    lookupEmailMismatch: 'Wij herkennen dit e-mailadres niet bij dit voertuig. Voer uw gegevens in.',
    errorPlateCheck: 'We kunnen het kenteken nu niet controleren. Probeer het later opnieuw.',
    errorEmailCheck: 'We kunnen het e-mailadres nu niet controleren. Probeer het later opnieuw.',
    errorAvailability: 'Beschikbaarheid laden mislukt',
    errorSlots: 'Tijden laden mislukt',
    errorPlanningTypes: 'Planningstypes laden mislukt',
    errorRdw: 'RDW lookup mislukt',
    errorSelectDateTime: 'Kies eerst een datum en tijd.',
    errorMissingEmail: 'Vul uw e-mailadres in.',
    errorMissingContact: 'Vul uw naam, e-mailadres en telefoonnummer in.',
    errorMissingAddress: 'Vul uw adresgegevens volledig in.',
    errorSubmit: 'Aanvraag mislukt. Probeer het later opnieuw.',
    daysShort: ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']
  },
  en: {
    title: 'Planning',
    subtitle: 'Select a date and time to request an appointment.',
    availabilityLoading: 'Loading availability...',
    availabilityLegend: 'Green = available, orange = limited, red = full, grey = closed.',
    dateLabel: 'Date',
    timeLabel: 'What time will you bring your vehicle?',
    timePlaceholder: 'Select time',
    timeSuffix: 'h',
    planningTypeLabel: 'What needs to be done?',
    planningTypePlaceholder: 'Select type',
    notesLabel: 'Additional notes',
    requestButton: 'Request appointment',
    modalTitle: 'Request appointment',
    close: 'Close',
    vehicleLabel: 'Vehicle',
    colorLabel: 'Color',
    plateLabel: 'License plate',
    next: 'Next',
    checking: 'Checking...',
    rdwFetch: 'Fetch RDW',
    rdwFetching: 'Fetching RDW...',
    emailLabel: 'Email address',
    companyLabel: 'Company name (optional)',
    nameLabel: 'Name',
    addressLabel: 'Address',
    postalCodeLabel: 'Postal code',
    cityLabel: 'City',
    phoneLabel: 'Phone',
    submitAppointment: 'Request appointment',
    successTitle: 'Appointment requested',
    successBody:
      'Your appointment request has been sent. Note: it is only confirmed after you receive a confirmation email from us.',
    lookupPlateFound: 'License plate found. Enter the email address we have on file.',
    lookupPlateUnknown: 'License plate not found. Please enter your details.',
    lookupEmailMatch: 'Email matches. You can request the appointment.',
    lookupEmailMismatch: 'We do not recognize this email for this vehicle. Please enter your details.',
    errorPlateCheck: 'We cannot check the license plate right now. Please try again later.',
    errorEmailCheck: 'We cannot verify the email right now. Please try again later.',
    errorAvailability: 'Failed to load availability',
    errorSlots: 'Failed to load times',
    errorPlanningTypes: 'Failed to load planning types',
    errorRdw: 'RDW lookup failed',
    errorSelectDateTime: 'Please select a date and time first.',
    errorMissingEmail: 'Please enter your email address.',
    errorMissingContact: 'Please enter your name, email and phone number.',
    errorMissingAddress: 'Please complete your address details.',
    errorSubmit: 'Request failed. Please try again later.',
    daysShort: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  },
  de: {
    title: 'Planung',
    subtitle: 'Wählen Sie Datum und Uhrzeit für eine Terminanfrage.',
    availabilityLoading: 'Verfügbarkeit wird geladen...',
    availabilityLegend: 'Grün = frei, orange = begrenzt, rot = voll, grau = geschlossen.',
    dateLabel: 'Datum',
    timeLabel: 'Wann möchten Sie Ihr Fahrzeug bringen?',
    timePlaceholder: 'Zeit wählen',
    timeSuffix: 'Uhr',
    planningTypeLabel: 'Was soll erledigt werden?',
    planningTypePlaceholder: 'Typ wählen',
    notesLabel: 'Weitere Hinweise',
    requestButton: 'Termin anfragen',
    modalTitle: 'Termin anfragen',
    close: 'Schließen',
    vehicleLabel: 'Fahrzeug',
    colorLabel: 'Farbe',
    plateLabel: 'Kennzeichen',
    next: 'Weiter',
    checking: 'Prüfen...',
    rdwFetch: 'RDW abrufen',
    rdwFetching: 'RDW wird abgerufen...',
    emailLabel: 'E-Mail-Adresse',
    companyLabel: 'Firmenname (optional)',
    nameLabel: 'Name',
    addressLabel: 'Adresse',
    postalCodeLabel: 'Postleitzahl',
    cityLabel: 'Ort',
    phoneLabel: 'Telefon',
    submitAppointment: 'Termin anfragen',
    successTitle: 'Termin angefragt',
    successBody:
      'Ihre Terminanfrage wurde gesendet. Hinweis: Der Termin ist erst bestätigt, wenn Sie eine Bestätigungs‑E‑Mail erhalten.',
    lookupPlateFound: 'Kennzeichen gefunden. Bitte die bei uns bekannte E-Mail-Adresse eingeben.',
    lookupPlateUnknown: 'Kennzeichen nicht gefunden. Bitte Ihre Daten eingeben.',
    lookupEmailMatch: 'E-Mail stimmt. Sie können den Termin anfragen.',
    lookupEmailMismatch:
      'Wir erkennen diese E-Mail für dieses Fahrzeug nicht. Bitte geben Sie Ihre Daten ein.',
    errorPlateCheck: 'Wir können das Kennzeichen derzeit nicht prüfen. Bitte später erneut versuchen.',
    errorEmailCheck: 'Wir können die E-Mail derzeit nicht prüfen. Bitte später erneut versuchen.',
    errorAvailability: 'Verfügbarkeit konnte nicht geladen werden',
    errorSlots: 'Zeiten konnten nicht geladen werden',
    errorPlanningTypes: 'Planungstypen konnten nicht geladen werden',
    errorRdw: 'RDW-Abfrage fehlgeschlagen',
    errorSelectDateTime: 'Bitte zuerst Datum und Uhrzeit auswählen.',
    errorMissingEmail: 'Bitte E-Mail-Adresse eingeben.',
    errorMissingContact: 'Bitte Name, E-Mail und Telefonnummer eingeben.',
    errorMissingAddress: 'Bitte Adresse vollständig ausfüllen.',
    errorSubmit: 'Anfrage fehlgeschlagen. Bitte später erneut versuchen.',
    daysShort: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
  },
  fr: {
    title: 'Planning',
    subtitle: 'Choisissez une date et une heure pour demander un rendez-vous.',
    availabilityLoading: 'Chargement des disponibilités...',
    availabilityLegend: 'Vert = disponible, orange = limité, rouge = complet, gris = fermé.',
    dateLabel: 'Date',
    timeLabel: 'À quelle heure souhaitez-vous déposer votre véhicule ?',
    timePlaceholder: 'Choisir une heure',
    timeSuffix: 'h',
    planningTypeLabel: 'Que faut-il faire ?',
    planningTypePlaceholder: 'Choisir un type',
    notesLabel: 'Remarques supplémentaires',
    requestButton: 'Demander un rendez-vous',
    modalTitle: 'Demander un rendez-vous',
    close: 'Fermer',
    vehicleLabel: 'Véhicule',
    colorLabel: 'Couleur',
    plateLabel: 'Plaque',
    next: 'Suivant',
    checking: 'Vérification...',
    rdwFetch: 'Récupérer RDW',
    rdwFetching: 'RDW en cours...',
    emailLabel: 'Adresse e‑mail',
    companyLabel: 'Société (optionnel)',
    nameLabel: 'Nom',
    addressLabel: 'Adresse',
    postalCodeLabel: 'Code postal',
    cityLabel: 'Ville',
    phoneLabel: 'Téléphone',
    submitAppointment: 'Demander un rendez-vous',
    successTitle: 'Rendez-vous demandé',
    successBody:
      'Votre demande a été envoyée. Attention : elle n’est confirmée qu’après réception d’un e‑mail de confirmation.',
    lookupPlateFound: 'Plaque trouvée. Entrez l’adresse e‑mail connue chez nous.',
    lookupPlateUnknown: 'Plaque inconnue. Veuillez saisir vos informations.',
    lookupEmailMatch: 'E‑mail correct. Vous pouvez demander le rendez-vous.',
    lookupEmailMismatch:
      'Nous ne reconnaissons pas cet e‑mail pour ce véhicule. Veuillez saisir vos informations.',
    errorPlateCheck: 'Impossible de vérifier la plaque pour le moment. Réessayez plus tard.',
    errorEmailCheck: 'Impossible de vérifier l’e‑mail pour le moment. Réessayez plus tard.',
    errorAvailability: 'Impossible de charger les disponibilités',
    errorSlots: 'Impossible de charger les horaires',
    errorPlanningTypes: 'Impossible de charger les types de planning',
    errorRdw: 'Échec de la recherche RDW',
    errorSelectDateTime: 'Veuillez d’abord choisir une date et une heure.',
    errorMissingEmail: 'Veuillez saisir votre adresse e‑mail.',
    errorMissingContact: 'Veuillez saisir votre nom, e‑mail et téléphone.',
    errorMissingAddress: 'Veuillez compléter votre adresse.',
    errorSubmit: 'Échec de la demande. Réessayez plus tard.',
    daysShort: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
  }
}

const localeMap: Record<SupportedLocale, Locale> = {
  nl,
  en: enUS,
  de,
  fr
}

export default function AppointmentClient({ locale = 'nl' }: { locale?: SupportedLocale }) {
  const copy = copyByLocale[locale]
  const dateLocale = localeMap[locale] || nl
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
        throw new Error(data.error || copy.errorAvailability)
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
        throw new Error(data.error || copy.errorSlots)
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
      const response = await fetch('/api/public/appointments/planning-types')
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || copy.errorPlanningTypes)
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
        throw new Error(copy.errorPlateCheck)
      }
      const result = data as LookupResult
      if (result.plateExists) {
        setVehicleId(result.vehicle?.id || null)
        setLookupStep('email')
        setLookupVehicle(result.vehicle || null)
        setLookupMessage(copy.lookupPlateFound)
      } else {
        setLookupVehicle(null)
        setLookupMessage(copy.lookupPlateUnknown)
        setLookupStep('details')
        setAutoFilled(false)
        setCustomerId(null)
        await handleRdwLookup()
      }
    } catch (err: any) {
      setError(copy.errorPlateCheck)
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
        throw new Error(copy.errorEmailCheck)
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
        setLookupMessage(copy.lookupEmailMatch)
      } else {
        setAutoFilled(false)
        setCustomerId(null)
        setLookupStep('details')
        setLookupVehicle(result.vehicle || null)
        setLookupMessage(copy.lookupEmailMismatch)
      }
    } catch (err: any) {
      setError(copy.errorEmailCheck)
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
        throw new Error(data.error || copy.errorRdw)
      }
      if (data.vehicle) {
        setLookupVehicle(data.vehicle)
      }
    } catch (err: any) {
      setRdwLookupError(err.message || copy.errorRdw)
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
        throw new Error(copy.errorSelectDateTime)
      }
      if (licensePlate && !email) {
        throw new Error(copy.errorMissingEmail)
      }
      if (!name || !email || (!autoFilled && !phone)) {
        throw new Error(copy.errorMissingContact)
      }
      if (lookupStep === 'details' && (!address || !postalCode || !city)) {
        throw new Error(copy.errorMissingAddress)
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
        throw new Error(copy.errorSubmit)
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
        <h2 className="text-2xl font-semibold">{copy.title}</h2>
        <p className="mt-2 text-sm text-slate-600">
          {copy.subtitle}
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
                {format(currentMonth, 'MMMM yyyy', { locale: dateLocale })}
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
              {copy.daysShort.map((label) => (
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
              <p className="mt-4 text-xs text-slate-500">{copy.availabilityLoading}</p>
            ) : (
              <p className="mt-4 text-xs text-slate-500">
                {copy.availabilityLegend}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {copy.dateLabel}
              <input
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-base"
                value={selectedDate}
                readOnly
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {copy.timeLabel}
              <select
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-base"
                value={selectedTime}
                onChange={(event) => setSelectedTime(event.target.value)}
                disabled={!selectedDate}
              >
                <option value="">{copy.timePlaceholder}</option>
                {slots.map((slot) => (
                  <option key={slot.value} value={slot.value}>
                    {slot.value} {copy.timeSuffix}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {copy.planningTypeLabel}
              <select
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-base"
                value={planningTypeId}
                onChange={(event) => {
                  setPlanningTypeId(event.target.value)
                  setPlanningTypeLabel('')
                }}
              >
                <option value="none">{copy.planningTypePlaceholder}</option>
                {planningTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name || type.id}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {copy.notesLabel}
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
          {copy.requestButton}
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
              <h3 className="text-lg font-semibold">{copy.modalTitle}</h3>
              <button
                className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50"
                type="button"
                onClick={() => setRequestOpen(false)}
              >
                {copy.close}
              </button>
            </div>

            {lookupMessage ? (
              <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                {lookupMessage}
              </p>
            ) : null}

            {lookupVehicle ? (
              <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                <p className="text-xs font-semibold uppercase text-slate-500">{copy.vehicleLabel}</p>
                <p>
                  {lookupVehicle.brand || '-'} {lookupVehicle.model || ''}
                </p>
                <p>
                  {copy.colorLabel}: {lookupVehicle.color || '-'}
                </p>
              </div>
            ) : null}

            {lookupStep === 'plate' ? (
              <div className="mt-4 grid gap-3">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  {copy.plateLabel}
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
                  {lookupLoading ? copy.checking : copy.next}
                </button>
                <button
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                  onClick={handleRdwLookup}
                  disabled={!licensePlate.trim() || rdwLookupLoading}
                >
                  {rdwLookupLoading ? copy.rdwFetching : copy.rdwFetch}
                </button>
                {rdwLookupError ? (
                  <p className="text-xs text-red-600">{rdwLookupError}</p>
                ) : null}
              </div>
            ) : null}

            {lookupStep === 'email' ? (
              <div className="mt-4 grid gap-3">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  {copy.emailLabel}
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
                  {lookupLoading ? copy.checking : copy.next}
                </button>
              </div>
            ) : null}

            {lookupStep === 'details' ? (
              <div className="mt-4 grid gap-3">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  {copy.companyLabel}
                  <input
                    className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                    value={company}
                    onChange={(event) => setCompany(event.target.value)}
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  {copy.nameLabel}
                  <input
                    className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  {copy.addressLabel}
                  <input
                    className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    {copy.postalCodeLabel}
                    <input
                      className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                      value={postalCode}
                      onChange={(event) => setPostalCode(event.target.value)}
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    {copy.cityLabel}
                    <input
                      className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                      value={city}
                      onChange={(event) => setCity(event.target.value)}
                    />
                  </label>
                </div>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  {copy.emailLabel}
                  <input
                    className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  {copy.phoneLabel}
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
                  {copy.submitAppointment}
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
                  {copy.submitAppointment}
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
            <h3 className="text-lg font-semibold">{copy.successTitle}</h3>
            <p className="mt-3 text-sm text-slate-600">
              {copy.successBody}
            </p>
            <button
              className="mt-6 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
              type="button"
              onClick={() => setSuccessOpen(false)}
            >
              {copy.close}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
