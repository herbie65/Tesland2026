import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth, eachDayOfInterval, format } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') // e.g., "2026-01"
    const date = searchParams.get('date')   // e.g., "2026-01-26"

    // Get planning settings from Settings model
    const settingsDoc = await prisma.setting.findUnique({
      where: { group: 'planning' }
    })
    
    const planningSettings = settingsDoc?.data as any || {}
    const selectableSaturday = planningSettings.selectableSaturday ?? false
    const selectableSunday = planningSettings.selectableSunday ?? false
    const dayStartHour = planningSettings.dayStartHour ?? 8
    const dayEndHour = planningSettings.dayEndHour ?? 17
    const slotDuration = planningSettings.slotDuration ?? 30 // minutes

    // If specific date is requested, return slots for that day
    if (date) {
      const slots = []
      const totalMinutes = (dayEndHour - dayStartHour) * 60
      const numberOfSlots = Math.floor(totalMinutes / slotDuration)

      for (let i = 0; i < numberOfSlots; i++) {
        const minutes = dayStartHour * 60 + i * slotDuration
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60
        const timeString = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
        
        slots.push({
          value: timeString,
          minutes: slotDuration
        })
      }

      return NextResponse.json({
        success: true,
        slots,
        settings: {
          selectableSaturday,
          selectableSunday
        }
      })
    }

    // If month is requested, return availability for each day in that month
    if (month) {
      const [year, monthNum] = month.split('-').map(Number)
      const monthDate = new Date(year, monthNum - 1, 1)
      const start = startOfMonth(monthDate)
      const end = endOfMonth(monthDate)
      const days = eachDayOfInterval({ start, end })

      // Get all planning items for this month
      const startOfMonthDate = new Date(start)
      startOfMonthDate.setHours(0, 0, 0, 0)
      const endOfMonthDate = new Date(end)
      endOfMonthDate.setHours(23, 59, 59, 999)

      const planningItems = await prisma.planningItem.findMany({
        where: {
          scheduledAt: {
            gte: startOfMonthDate,
            lte: endOfMonthDate
          }
        }
      })

      // Map planning items by date (YYYY-MM-DD)
      const itemsByDate = new Map<string, typeof planningItems>()
      planningItems.forEach(item => {
        const dateKey = format(new Date(item.scheduledAt), 'yyyy-MM-dd')
        if (!itemsByDate.has(dateKey)) {
          itemsByDate.set(dateKey, [])
        }
        itemsByDate.get(dateKey)!.push(item)
      })

      // Calculate availability for each day
      const maxSlotsPerDay = Math.floor(((dayEndHour - dayStartHour) * 60) / slotDuration)
      const availability = days.map(day => {
        const dateKey = format(day, 'yyyy-MM-dd')
        const dayOfWeek = day.getDay()
        const itemsOnDay = itemsByDate.get(dateKey) || []
        
        // Weekend check
        const isWeekend = dayOfWeek === 6 || dayOfWeek === 0
        if (isWeekend) {
          if ((dayOfWeek === 6 && !selectableSaturday) || (dayOfWeek === 0 && !selectableSunday)) {
            return {
              date: dateKey,
              status: 'full' as const
            }
          }
        }

        // Calculate capacity
        const usedSlots = itemsOnDay.length
        const capacityRatio = usedSlots / maxSlotsPerDay

        return {
          date: dateKey,
          status: capacityRatio >= 0.9 ? 'full' as const : 
                  capacityRatio >= 0.6 ? 'limited' as const : 
                  'available' as const
        }
      })

      return NextResponse.json({
        success: true,
        days: availability,
        settings: {
          selectableSaturday,
          selectableSunday
        }
      })
    }

    return NextResponse.json(
      { success: false, error: 'Either month or date parameter is required' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Error fetching availability:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
