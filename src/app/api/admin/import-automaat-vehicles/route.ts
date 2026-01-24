import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

// Parse CSV line (handles semicolon-separated values)
const parseCSVLine = (line: string): string[] => {
  return line.split(';').map(field => field.trim())
}

// Parse Dutch date format (DD-MM-YYYY)
const parseDutchDate = (dateStr: string): Date | null => {
  if (!dateStr) return null
  const parts = dateStr.split(/[- :]/)
  if (parts.length >= 3) {
    const day = parseInt(parts[0])
    const month = parseInt(parts[1]) - 1
    const year = parseInt(parts[2])
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month, day)
    }
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ['MANAGEMENT'])
    
    const body = await request.json()
    const { csvContent } = body
    
    if (!csvContent) {
      return NextResponse.json(
        { success: false, error: 'csvContent is required' },
        { status: 400 }
      )
    }
    
    const lines = csvContent.split('\n').filter((line: string) => line.trim())
    
    // Parse header
    const headers = parseCSVLine(lines[0])
    
    let imported = 0
    let updated = 0
    let skipped = 0
    let linked = 0
    const errors: string[] = []
    
    // Process each line (skip header)
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      const row: Record<string, string> = {}
      headers.forEach((header, idx) => {
        row[header] = values[idx] || ''
      })
      
      const licensePlate = row.license?.trim()
      if (!licensePlate) {
        skipped++
        continue
      }

      // Try to find customer by externalId (Automaat customer ID)
      let customerId: string | null = null
      const automatCustomerId = row.customerId?.trim()
      if (automatCustomerId) {
        const customer = await prisma.customer.findFirst({
          where: { externalId: automatCustomerId }
        })
        if (customer) {
          customerId = customer.id
          linked++
        }
      }

      // Parse APK date
      const apkDueDate = row.apkDate ? parseDutchDate(row.apkDate) : null
      const constructionDate = row.constructionDate ? parseDutchDate(row.constructionDate) : null
      
      // Prepare vehicle data - ALLE kolommen importeren
      const vehicleData = {
        licensePlate: licensePlate.toUpperCase(),
        make: row.brand || null,
        model: row.type || null,
        year: constructionDate?.getFullYear() || null,
        constructionDate: constructionDate,
        color: row.color || null,
        vin: row.chassisNumber || null,
        mileage: row.mileage ? parseInt(row.mileage) : null,
        apkDueDate: apkDueDate,
        isHistory: row.isHistory === '1' || row.isHistory === 'true',
        deleted: row.deleted === '1' || row.deleted === 'true',
        externalId: row.ID || null,
        customerId: customerId,
        notes: row.customerName 
          ? `Imported from Automaat. Original customer: ${row.customerName}` 
          : 'Imported from Automaat',
        rdwData: undefined
      }
      
      try {
        // Check if vehicle already exists
        const existing = await prisma.vehicle.findUnique({
          where: { licensePlate: vehicleData.licensePlate }
        })
        
        if (existing) {
          // Update existing vehicle
          await prisma.vehicle.update({
            where: { licensePlate: vehicleData.licensePlate },
            data: vehicleData
          })
          updated++
        } else {
          // Create new vehicle
          await prisma.vehicle.create({
            data: vehicleData
          })
          imported++
        }
      } catch (error: any) {
        errors.push(`${licensePlate}: ${error.message}`)
        skipped++
      }
    }
    
    return NextResponse.json({
      success: true,
      summary: {
        imported,
        updated,
        skipped,
        linked,
        total: lines.length - 1,
        errors
      }
    })
  } catch (error: any) {
    console.error('Error importing vehicles:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
