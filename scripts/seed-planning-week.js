/* eslint-disable no-console */
const admin = require('firebase-admin')
const fs = require('fs')
const path = require('path')

const ensureAdmin = () => {
  if (admin.apps.length) return admin.apps[0]
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  const envProjectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket,
      projectId: serviceAccount.project_id || envProjectId
    })
  }
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
  if (clientEmail && privateKey) {
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId: envProjectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n')
      }),
      storageBucket,
      projectId: envProjectId
    })
  }
  const keyPath = path.join(process.cwd(), 'serviceAccountKey.json')
  if (fs.existsSync(keyPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'))
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket,
      projectId: serviceAccount.project_id || envProjectId
    })
  }
  return admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    storageBucket,
    projectId: envProjectId
  })
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

const pad = (value) => String(value).padStart(2, '0')

const formatDateTimeLocal = (date) => {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`
}

const addDays = (date, days) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

const shuffle = (array) => {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

const sample = (list) => list[Math.floor(Math.random() * list.length)]

const buildTitle = (vehicleLabel) => {
  const tasks = [
    'APK-keuring',
    'Remmencontrole',
    'Software-update',
    'Wintercheck',
    'Diagnose',
    'Bandenwissel',
    'Onderhoudsbeurt',
    'Storing uitlezen',
    'Airco service',
    'Kleine beurt',
    'Grote beurt',
    'Accutest'
  ]
  if (vehicleLabel) {
    return `${sample(tasks)} · ${vehicleLabel}`
  }
  return sample(tasks)
}

const getNextMonday = () => {
  const now = new Date()
  const today = now.getDay()
  const daysUntilMonday = ((8 - today) % 7) || 7
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() + daysUntilMonday)
  return start
}

const buildSlots = (dayStartMinutes, dayEndMinutes, slotMinutes, duration) => {
  const slots = []
  for (let start = dayStartMinutes; start + duration <= dayEndMinutes; start += slotMinutes) {
    slots.push(start)
  }
  return slots
}

const overlaps = (start, end, intervals) =>
  intervals.some((interval) => start < interval.end && end > interval.start)

const run = async () => {
  ensureAdmin()
  const firestore = admin.firestore()
  const nowIso = new Date().toISOString()

  const settingsSnap = await firestore.collection('settings').doc('planning').get()
  const planningSettings = settingsSnap.exists ? settingsSnap.data()?.data || {} : {}
  const dayStart = planningSettings.dayStart || '08:00'
  const dayEnd = planningSettings.dayEnd || '17:00'
  const slotMinutes = Math.max(Number(planningSettings.slotMinutes || 60), 15)

  const toMinutes = (value) => {
    const [hours, minutes] = String(value || '').split(':').map((v) => Number(v))
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0
    return hours * 60 + minutes
  }

  const dayStartMinutes = toMinutes(dayStart)
  const dayEndMinutes = toMinutes(dayEnd)

  const rolesSnap = await firestore.collection('roles').get()
  const roles = rolesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  const rolesById = new Map(roles.map((role) => [role.id, role]))

  const usersSnap = await firestore.collection('users').get()
  const users = usersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  const activeUsers = users.filter((user) => user.active !== false)
  const planningUsers = activeUsers.filter((user) => {
    if (!user.roleId) return false
    return rolesById.get(user.roleId)?.includeInPlanning === true
  })
  const assignees = planningUsers.length > 0 ? planningUsers : activeUsers
  if (assignees.length === 0) {
    throw new Error('Geen actieve werknemers gevonden om te plannen.')
  }

  const customersSnap = await firestore.collection('customers').get()
  const customers = customersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  const customersById = new Map(customers.map((customer) => [customer.id, customer]))

  const vehiclesSnap = await firestore.collection('vehicles').get()
  const vehicles = vehiclesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

  const typesSnap = await firestore.collection('planningTypes').get()
  const planningTypes = typesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

  const startDate = getNextMonday()
  const days = Array.from({ length: 7 }, (_, index) => addDays(startDate, index))
  const scheduleByDay = new Map()
  const minutesByDayUser = new Map()

  const getSchedule = (dayKey, userId) => {
    const key = `${dayKey}:${userId}`
    if (!scheduleByDay.has(key)) scheduleByDay.set(key, [])
    return scheduleByDay.get(key)
  }

  const getMinutes = (dayKey, userId) => {
    const key = `${dayKey}:${userId}`
    if (!minutesByDayUser.has(key)) minutesByDayUser.set(key, 0)
    return minutesByDayUser.get(key)
  }

  const setMinutes = (dayKey, userId, value) => {
    const key = `${dayKey}:${userId}`
    minutesByDayUser.set(key, value)
  }

  const buildScheduledAt = (day, startMinutes) => {
    const date = new Date(day)
    date.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0)
    return formatDateTimeLocal(date)
  }

  const items = []
  const totalPlanned = []
  const defaultDurationSlotsMin = Math.ceil(60 / slotMinutes)
  const defaultDurationSlotsMax = Math.max(defaultDurationSlotsMin, Math.ceil(120 / slotMinutes))

  days.forEach((day) => {
    const dayKey = DAY_KEYS[day.getDay()]
    const dayAssignees = assignees.filter((user) => {
      if (Array.isArray(user.workingDays) && user.workingDays.length > 0) {
        return user.workingDays.includes(dayKey)
      }
      return true
    })
    const eligible = dayAssignees.length > 0 ? dayAssignees : assignees
    const shuffled = shuffle(eligible)
    const count = randomInt(8, 12)
    let planned = 0

    for (let index = 0; index < count; index += 1) {
      const durationSlots = randomInt(defaultDurationSlotsMin, defaultDurationSlotsMax)
      const durationMinutes = durationSlots * slotMinutes
      let assigned = false

      for (let offset = 0; offset < shuffled.length; offset += 1) {
        const user = shuffled[(index + offset) % shuffled.length]
        const maxMinutes = Number(user.planningHoursPerDay) * 60
        if (Number.isFinite(maxMinutes) && maxMinutes > 0) {
          const already = getMinutes(dayKey, user.id)
          if (already + durationMinutes > maxMinutes) continue
        }

        const schedule = getSchedule(dayKey, user.id)
        const slots = buildSlots(dayStartMinutes, dayEndMinutes, slotMinutes, durationMinutes)
        const available = slots.filter((start) => !overlaps(start, start + durationMinutes, schedule))
        if (available.length === 0) continue

        const startMinutes = sample(available)
        schedule.push({ start: startMinutes, end: startMinutes + durationMinutes })
        schedule.sort((a, b) => a.start - b.start)
        setMinutes(dayKey, user.id, getMinutes(dayKey, user.id) + durationMinutes)

        const vehicle = vehicles.length > 0 ? sample(vehicles) : null
        const customer =
          vehicle?.customerId && customersById.get(vehicle.customerId)
            ? customersById.get(vehicle.customerId)
            : customers.length > 0
            ? sample(customers)
            : null
        const planningType = planningTypes.length > 0 ? sample(planningTypes) : null
        const vehicleLabel = vehicle
          ? `${vehicle.brand} ${vehicle.model}${vehicle.licensePlate ? ` (${vehicle.licensePlate})` : ''}`
          : null

        items.push({
          title: buildTitle(vehicleLabel),
          scheduledAt: buildScheduledAt(day, startMinutes),
          durationMinutes,
          assigneeId: user.id,
          assigneeName: user.name || null,
          assigneeColor: user.color || null,
          location: sample(['Werkplaats', 'Garage 1', 'Garage 2', 'Buitendienst']),
          customerId: customer?.id || null,
          customerName: customer?.name || null,
          vehicleId: vehicle?.id || null,
          vehiclePlate: vehicle?.licensePlate || null,
          vehicleLabel,
          planningTypeId: planningType?.id || null,
          planningTypeName: planningType?.name || null,
          planningTypeColor: planningType?.color || null,
          notes: null,
          priority: sample(['low', 'medium', 'high']),
          partsRequired: Math.random() < 0.3,
          isRequest: false,
          workOrderId: null,
          created_at: nowIso,
          updated_at: nowIso,
          created_by: 'seed-planning-week',
          updated_by: 'seed-planning-week',
          createdAt: nowIso,
          createdByUid: 'seed-planning-week'
        })
        planned += 1
        assigned = true
        break
      }

      if (!assigned) break
    }

    totalPlanned.push({ day: day.toISOString().slice(0, 10), planned })
  })

  const chunks = []
  for (let i = 0; i < items.length; i += 400) {
    chunks.push(items.slice(i, i + 400))
  }

  for (const chunk of chunks) {
    const batch = firestore.batch()
    chunk.forEach((payload) => {
      const docRef = firestore.collection('planningItems').doc()
      batch.set(docRef, { id: docRef.id, ...payload })
    })
    await batch.commit()
  }

  console.log(`✅ Ingepland: ${items.length} afspraken`)
  console.table(totalPlanned)
}

run().catch((error) => {
  console.error('❌ Seed failed:', error)
  process.exit(1)
})
