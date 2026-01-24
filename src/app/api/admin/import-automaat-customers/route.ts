import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ';' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ['MANAGEMENT'])

    const body = await request.json()
    const { csvContent } = body

    if (!csvContent) {
      return NextResponse.json(
        { success: false, error: 'No CSV content provided' },
        { status: 400 }
      )
    }

    const lines = csvContent.split('\n').filter((line: string) => line.trim())
    if (lines.length < 2) {
      return NextResponse.json(
        { success: false, error: 'CSV file is empty or invalid' },
        { status: 400 }
      )
    }

    const headers = parseCSVLine(lines[0])
    console.log('CSV Headers:', headers)

    // Map alle CSV kolommen
    const idIdx = headers.findIndex(h => h.toLowerCase() === 'id')
    const customerNumberIdx = headers.findIndex(h => h.toLowerCase() === 'customernumber')
    const displayNameIdx = headers.findIndex(h => h.toLowerCase() === 'displayname')
    const contactIdx = headers.findIndex(h => h.toLowerCase() === 'contact')
    const addressIdx = headers.findIndex(h => h.toLowerCase() === 'address')
    const zipCodeIdx = headers.findIndex(h => h.toLowerCase() === 'zipcode')
    const cityIdx = headers.findIndex(h => h.toLowerCase() === 'city')
    const countryIdIdx = headers.findIndex(h => h.toLowerCase() === 'countryid')
    const phoneIdx = headers.findIndex(h => h.toLowerCase() === 'phone')
    const faxIdx = headers.findIndex(h => h.toLowerCase() === 'fax')
    const mobileIdx = headers.findIndex(h => h.toLowerCase() === 'mobile')
    const emailIdx = headers.findIndex(h => h.toLowerCase() === 'email')
    const emailDestinationsIdx = headers.findIndex(h => h.toLowerCase() === 'emaildestinations')
    const branchIdIdx = headers.findIndex(h => h.toLowerCase() === 'branchid')
    const extra1Idx = headers.findIndex(h => h.toLowerCase() === 'extra1')

    let imported = 0
    let updated = 0
    let skipped = 0
    const errors: string[] = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      try {
        const fields = parseCSVLine(line)
        
        // Haal ALLE velden op
        const externalId = idIdx >= 0 ? fields[idIdx] : null
        const customerNumber = customerNumberIdx >= 0 ? fields[customerNumberIdx] : null
        const displayName = displayNameIdx >= 0 ? fields[displayNameIdx] : null
        const contact = contactIdx >= 0 ? fields[contactIdx] : null
        const street = addressIdx >= 0 ? fields[addressIdx] : null
        const zipCode = zipCodeIdx >= 0 ? fields[zipCodeIdx] : null
        const city = cityIdx >= 0 ? fields[cityIdx] : null
        const countryId = countryIdIdx >= 0 ? fields[countryIdIdx] : null
        const phone = phoneIdx >= 0 ? fields[phoneIdx] : null
        const fax = faxIdx >= 0 ? fields[faxIdx] : null
        const mobile = mobileIdx >= 0 ? fields[mobileIdx] : null
        const email = emailIdx >= 0 ? fields[emailIdx] : null
        const emailDestinations = emailDestinationsIdx >= 0 ? fields[emailDestinationsIdx] : null
        const branchId = branchIdIdx >= 0 ? fields[branchIdIdx] : null
        const extra1 = extra1Idx >= 0 ? fields[extra1Idx] : null

        // Skip if no meaningful data
        if (!displayName || displayName === '---' || displayName.includes('PASSANTEN')) {
          skipped++
          continue
        }

        // Build name from displayName and contact
        let name = displayName
        if (contact && contact !== displayName) {
          name = `${displayName} (${contact})`
        }

        // Build full address for legacy field
        let fullAddress = ''
        const addressParts = [street, zipCode, city].filter(p => p && p.trim())
        if (addressParts.length > 0) {
          fullAddress = addressParts.join(', ')
        }

        // Use mobile if phone is empty
        const phoneNumber = phone || mobile || null

        // Clean email (remove extra spaces)
        const cleanEmail = email ? email.trim() : null

        // Try to find existing customer by external ID or name
        let existingCustomer = null
        if (externalId) {
          existingCustomer = await prisma.customer.findFirst({
            where: {
              OR: [
                { externalId },
                { name }
              ]
            }
          })
        } else {
          existingCustomer = await prisma.customer.findFirst({
            where: { name }
          })
        }

        // Prepare ALLE data voor import
        const customerData = {
          name,
          displayName: displayName || null,
          contact: contact || null,
          email: cleanEmail,
          phone: phoneNumber,
          mobile: mobile || null,
          fax: fax || null,
          company: displayName !== name ? displayName : null,
          street: street || null,
          zipCode: zipCode || null,
          city: city || null,
          countryId: countryId || null,
          customerNumber: customerNumber || null,
          emailDestinations: emailDestinations || null,
          branchId: branchId || null,
          extra1: extra1 || null,
          address: fullAddress || undefined,
          externalId: externalId || null
        }

        if (existingCustomer) {
          // Update existing
          await prisma.customer.update({
            where: { id: existingCustomer.id },
            data: customerData
          })
          updated++
        } else {
          // Create new
          await prisma.customer.create({
            data: customerData
          })
          imported++
        }
      } catch (err: any) {
        console.error(`Error processing line ${i}:`, err)
        errors.push(`Regel ${i}: ${err.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        imported,
        updated,
        skipped,
        total: lines.length - 1,
        errors
      }
    })
  } catch (error: any) {
    console.error('Error importing customers:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
