/**
 * Script om ALLE bestaande leave requests opnieuw te berekenen met de CORRECTE logica
 * (werkuren per rooster, NIET kalenderuren)
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Importeer calculate functie - we simuleren het hier omdat we niet direct kunnen importeren
async function getPlanningBreaks() {
  const setting = await prisma.setting.findUnique({ where: { group: 'planning' } })
  const breaks = Array.isArray(setting?.data?.breaks) ? setting.data.breaks : []
  return breaks.map((entry) => ({
    start: String(entry?.start || ''),
    end: String(entry?.end || '')
  }))
}

function calculateBreakOverlapMinutes(startDateTime, endDateTime, breaks) {
  if (!breaks.length) return 0
  let overlapMinutes = 0

  const startDay = new Date(startDateTime)
  startDay.setHours(0, 0, 0, 0)
  const endDay = new Date(endDateTime)
  endDay.setHours(0, 0, 0, 0)

  const current = new Date(startDay)
  while (current <= endDay) {
    for (const entry of breaks) {
      const [startHour, startMinute] = String(entry.start || '').split(':').map(Number)
      const [endHour, endMinute] = String(entry.end || '').split(':').map(Number)
      if (!Number.isFinite(startHour) || !Number.isFinite(startMinute) || !Number.isFinite(endHour) || !Number.isFinite(endMinute)) {
        continue
      }
      const breakStart = new Date(current)
      breakStart.setHours(startHour, startMinute, 0, 0)
      const breakEnd = new Date(current)
      breakEnd.setHours(endHour, endMinute, 0, 0)

      const overlapStart = Math.max(startDateTime.getTime(), breakStart.getTime())
      const overlapEnd = Math.min(endDateTime.getTime(), breakEnd.getTime())
      if (overlapEnd > overlapStart) {
        overlapMinutes += Math.round((overlapEnd - overlapStart) / (1000 * 60))
      }
    }
    current.setDate(current.getDate() + 1)
  }

  return overlapMinutes
}

async function recalculateLeaveRequest(request, user, planningSettings, breaks) {
  const startDate = request.startDate.toISOString().slice(0, 10)
  const endDate = request.endDate.toISOString().slice(0, 10)
  const startTime = request.startTime
  const endTime = request.endTime
  
  const hoursPerDay = Number(user.hoursPerDay || 8)
  const workingDays = user.workingDays || ['mon','tue','wed','thu','fri']
  
  const dayStart = planningSettings?.dayStart || '08:30'
  const dayEnd = planningSettings?.dayEnd || '17:00'
  
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  const workDaySet = new Set(workingDays)
  
  let totalMinutes = 0
  
  const startDateTime = new Date(`${startDate}T${startTime || dayStart}`)
  const endDateTime = new Date(`${endDate}T${endTime || dayEnd}`)
  
  const currentDate = new Date(startDate)
  const endDateOnly = new Date(endDate)
  currentDate.setHours(0, 0, 0, 0)
  endDateOnly.setHours(0, 0, 0, 0)
  
  while (currentDate <= endDateOnly) {
    const dayOfWeek = currentDate.getDay()
    const dayName = dayNames[dayOfWeek]
    
    if (workDaySet.has(dayName)) {
      const workStartThisDay = new Date(currentDate)
      const [startHour, startMin] = (startTime || dayStart).split(':').map(Number)
      workStartThisDay.setHours(startHour, startMin, 0, 0)
      
      const workEndThisDay = new Date(currentDate)
      const [endHour, endMin] = (endTime || dayEnd).split(':').map(Number)
      workEndThisDay.setHours(endHour, endMin, 0, 0)
      
      const overlapStart = new Date(Math.max(startDateTime.getTime(), workStartThisDay.getTime()))
      const overlapEnd = new Date(Math.min(endDateTime.getTime(), workEndThisDay.getTime()))
      
      if (overlapEnd > overlapStart) {
        let dayMinutes = Math.round((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60))
        const breakOverlap = calculateBreakOverlapMinutes(overlapStart, overlapEnd, breaks)
        dayMinutes = Math.max(0, dayMinutes - breakOverlap)
        totalMinutes += dayMinutes
      }
    }
    
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  const totalHours = Math.round((totalMinutes / 60) * 100) / 100
  const totalDays = Math.round((totalHours / hoursPerDay) * 100) / 100
  
  return { totalMinutes, totalHours, totalDays }
}

async function main() {
  console.log('🔧 Herberekenen van alle verlofaanvragen...\n')
  
  const planningSettings = await prisma.setting.findUnique({ where: { group: 'planning' } })
  const breaks = await getPlanningBreaks()
  
  const requests = await prisma.leaveRequest.findMany({
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          email: true,
          hoursPerDay: true,
          workingDays: true,
        }
      }
    }
  })
  
  console.log(`📋 Gevonden: ${requests.length} verlofaanvragen\n`)
  
  let updated = 0
  let skipped = 0
  
  for (const request of requests) {
    const oldValues = {
      totalDays: request.totalDays,
      totalHours: request.totalHours,
      totalMinutes: request.totalMinutes,
    }
    
    try {
      const newValues = await recalculateLeaveRequest(
        request,
        request.user,
        planningSettings?.data,
        breaks
      )
      
      const changed = 
        oldValues.totalMinutes !== newValues.totalMinutes ||
        oldValues.totalHours !== newValues.totalHours ||
        oldValues.totalDays !== newValues.totalDays
      
      if (changed) {
        await prisma.leaveRequest.update({
          where: { id: request.id },
          data: {
            totalMinutes: newValues.totalMinutes,
            totalHours: newValues.totalHours,
            totalDays: newValues.totalDays,
          }
        })
        
        console.log(`✅ ${request.user.displayName || request.user.email}`)
        console.log(`   ${request.startDate.toISOString().slice(0,10)} - ${request.endDate.toISOString().slice(0,10)}`)
        console.log(`   OUD: ${oldValues.totalDays} dagen, ${oldValues.totalHours} uur, ${oldValues.totalMinutes} min`)
        console.log(`   NIEUW: ${newValues.totalDays} dagen, ${newValues.totalHours} uur, ${newValues.totalMinutes} min\n`)
        updated++
      } else {
        skipped++
      }
    } catch (err) {
      console.error(`❌ Fout bij aanvraag ${request.id}:`, err.message)
    }
  }
  
  console.log(`\n✨ Klaar!`)
  console.log(`   Bijgewerkt: ${updated}`)
  console.log(`   Ongewijzigd: ${skipped}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
