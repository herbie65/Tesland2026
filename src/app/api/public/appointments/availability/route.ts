import { NextRequest, NextResponse } from 'next/server'
import { adminFirestore, ensureAdmin } from '@/lib/firebase-admin'
import { addDays, endOfMonth, format, startOfMonth } from 'date-fns'

const ensureFirestore = () => {
  ensureAdmin()
  if (!adminFirestore) {
    throw new Error('Firebase Admin not initialized')
  }
  return adminFirestore
}

const getPlanningSettings = async () => {
  const firestore = ensureFirestore()
  const docSnap = await firestore.collection('settings').doc('planning').get()
  const data = docSnap.exists ? (docSnap.data()?.data ?? docSnap.data()) : {}
  const dayStart = String(data?.dayStart || '08:00')
  const dayEnd = String(data?.dayEnd || '17:00')
  const slotMinutes = Number(data?.slotMinutes || 30)
  const defaultDurationMinutes = Number(data?.defaultDurationMinutes || 60)
  const selectableSaturday = Boolean(data?.selectableSaturday)
  const selectableSunday = Boolean(data?.selectableSunday)
  return {
    dayStart,
    dayEnd,
    slotMinutes,
    defaultDurationMinutes,
    selectableSaturday,
    selectableSunday
  }
}

const parseTime = (value: string) => {
  const [hours, minutes] = value.split(':').map((part) => Number(part))
  return (Number(hours) || 0) * 60 + (Number(minutes) || 0)
}

const buildSlots = (dayStart: string, dayEnd: string, slotMinutes: number) => {
  const start = parseTime(dayStart)
  const end = parseTime(dayEnd)
  const slots: number[] = []
  for (let current = start; current + slotMinutes <= end; current += slotMinutes) {
    slots.push(current)
  }
  return slots
}

const slotToLabel = (minutes: number) => {
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const monthParam = searchParams.get('month')
    const dateParam = searchParams.get('date')

    const firestore = ensureFirestore()
    const planningSettings = await getPlanningSettings()
    const slotMinutes = planningSettings.slotMinutes > 0 ? planningSettings.slotMinutes : 30
    const slots = buildSlots(planningSettings.dayStart, planningSettings.dayEnd, slotMinutes)

    const snapshot = await firestore.collection('planningItems').get()
    const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as any[]

    if (dateParam) {
      const dayKey = dateParam
      const day = new Date(`${dayKey}T00:00:00`)
      const dayIndex = day.getDay()
      const weekendClosed =
        (dayIndex === 6 && !planningSettings.selectableSaturday) ||
        (dayIndex === 0 && !planningSettings.selectableSunday)
      if (weekendClosed) {
        return NextResponse.json({
          success: true,
          date: dayKey,
          slots: [],
          settings: planningSettings
        })
      }
      const dayItems = items.filter((item) => {
        if (!item.scheduledAt) return false
        return String(item.scheduledAt).slice(0, 10) === dayKey
      })

      const busySlots = new Set<number>()
      dayItems.forEach((item) => {
        const start = new Date(item.scheduledAt)
        const duration = Number(item.durationMinutes || planningSettings.defaultDurationMinutes || 60)
        const startMinutes = start.getHours() * 60 + start.getMinutes()
        const endMinutes = startMinutes + duration
        slots.forEach((slot) => {
          const slotEnd = slot + slotMinutes
          if (slot < endMinutes && slotEnd > startMinutes) {
            busySlots.add(slot)
          }
        })
      })

      const availableSlots = slots
        .filter((slot) => !busySlots.has(slot))
        .map((slot) => ({ value: slotToLabel(slot), minutes: slot }))

      return NextResponse.json({
        success: true,
        date: dayKey,
        slots: availableSlots,
        settings: planningSettings
      })
    }

    const monthDate = monthParam ? new Date(`${monthParam}-01T00:00:00`) : new Date()
    const start = startOfMonth(monthDate)
    const end = endOfMonth(monthDate)

    const days: { date: string; status: 'available' | 'limited' | 'full' }[] = []
    for (let day = start; day <= end; day = addDays(day, 1)) {
      const dayKey = format(day, 'yyyy-MM-dd')
      const dayIndex = day.getDay()
      const weekendClosed =
        (dayIndex === 6 && !planningSettings.selectableSaturday) ||
        (dayIndex === 0 && !planningSettings.selectableSunday)
      if (weekendClosed) {
        days.push({ date: dayKey, status: 'full' })
        continue
      }
      const dayItems = items.filter((item) => {
        if (!item.scheduledAt) return false
        return String(item.scheduledAt).slice(0, 10) === dayKey
      })
      const busySlots = new Set<number>()
      dayItems.forEach((item) => {
        const startAt = new Date(item.scheduledAt)
        const duration = Number(item.durationMinutes || planningSettings.defaultDurationMinutes || 60)
        const startMinutes = startAt.getHours() * 60 + startAt.getMinutes()
        const endMinutes = startMinutes + duration
        slots.forEach((slot) => {
          const slotEnd = slot + slotMinutes
          if (slot < endMinutes && slotEnd > startMinutes) {
            busySlots.add(slot)
          }
        })
      })
      const availableSlots = slots.length - busySlots.size
      const availableMinutes = availableSlots * slotMinutes
      const status =
        availableSlots <= 0
          ? 'full'
          : availableMinutes < 360
            ? 'limited'
            : 'available'
      days.push({ date: dayKey, status })
    }

    return NextResponse.json({ success: true, month: format(monthDate, 'yyyy-MM'), days, settings: planningSettings })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error fetching availability:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
