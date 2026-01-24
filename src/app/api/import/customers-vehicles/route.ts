import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'
// import { adminFirestore, ensureAdmin } from '@/lib/firebase-admin'

type ParsedRow = Record<string, string>

const parseCsv = (content: string): ParsedRow[] => {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length === 0) return []
  const header = lines[0]
    .replace(/^\uFEFF/, '')
    .split(';')
    .map((cell) => cell.trim())
  return lines.slice(1).map((line) => {
    const values = line.split(';')
    const row: ParsedRow = {}
    header.forEach((key, index) => {
      row[key] = (values[index] ?? '').trim()
    })
    return row
  })
}

const toBool = (value: string) => {
  if (!value) return false
  return value === '1' || value.toLowerCase() === 'true' || value.toLowerCase() === 'yes'
}

const pickFile = async (importDir: string, prefix: string) => {
  const files = await fs.readdir(importDir)
  return files.find((file) => file.startsWith(prefix) && file.endsWith('.csv')) || null
}

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const dryRun = url.searchParams.get('dryRun') === 'true'
    const customersFileParam = url.searchParams.get('customersFile')
    const vehiclesFileParam = url.searchParams.get('vehiclesFile')

    const importDir = path.join(process.cwd(), 'import')
    const customersFile =
      customersFileParam || (await pickFile(importDir, 'klanten_')) || ''
    const vehiclesFile = vehiclesFileParam || (await pickFile(importDir, 'auto_')) || ''

    if (!customersFile || !vehiclesFile) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing CSV files. Place klanten_*.csv and auto_*.csv in /import.'
        },
        { status: 400 }
      )
    }

    const customersCsv = await fs.readFile(path.join(importDir, customersFile), 'utf8')
    const vehiclesCsv = await fs.readFile(path.join(importDir, vehiclesFile), 'utf8')

    const customersRows = parseCsv(customersCsv)
    const vehiclesRows = parseCsv(vehiclesCsv)

    const customerLookup = new Map<string, ParsedRow>()
    customersRows.forEach((row) => {
      if (row.ID) customerLookup.set(row.ID, row)
    })

    if (dryRun) {
      const customersPreview = customersRows.slice(0, 5).map((row) => ({
        sourceId: row.ID,
        customerNumber: row.customerNumber,
        displayName: row.displayName,
        contact: row.contact,
        email: row.email,
        phone: row.phone || row.mobile
      }))

      const vehiclesPreview = vehiclesRows.slice(0, 5).map((row) => {
        const customer = row.customerId ? customerLookup.get(row.customerId) : null
        return {
          sourceId: row.ID,
          brand: row.brand,
          model: row.type,
          license: row.license,
          customerSourceId: row.customerId || null,
          customerNameFromVehicle: row.customerName || null,
          linkedCustomerName: customer?.displayName || null,
          linked: Boolean(customer)
        }
      })
      const vehiclesUnlinkedCount = vehiclesRows.filter(
        (row) => row.customerId && !customerLookup.get(row.customerId)
      ).length

      return NextResponse.json({
        success: true,
        dryRun: true,
        customersFile,
        vehiclesFile,
        customersCount: customersRows.length,
        vehiclesCount: vehiclesRows.length,
        vehiclesUnlinkedCount,
        customersPreview,
        vehiclesPreview
      })
    }

    ensureAdmin()
    if (!adminFirestore) {
      return NextResponse.json(
        { success: false, error: 'Firebase Admin not initialized' },
        { status: 500 }
      )
    }

    const customersCollection = adminFirestore.collection('customers')
    const vehiclesCollection = adminFirestore.collection('vehicles')

    const customerIdMap = new Map<string, string>()
    let customersCreated = 0
    let customersSkipped = 0

    for (const row of customersRows) {
      const sourceId = row.ID
      if (!sourceId) continue

      const existing = await customersCollection
        .where('sourceId', '==', sourceId)
        .limit(1)
        .get()
      if (!existing.empty) {
        customersSkipped += 1
        const doc = existing.docs[0]
        customerIdMap.set(sourceId, doc.id)
        continue
      }

      const displayName = row.displayName || row.contact || `Klant ${sourceId}`
      const addressParts = [row.address, row.zipCode, row.city]
        .filter((part) => part && part.length > 0)
        .join(' ')

      const payload = {
        name: displayName,
        displayName: row.displayName || null,
        contactName: row.contact || null,
        company: row.displayName || null,
        address: addressParts || null,
        zipCode: row.zipCode || null,
        city: row.city || null,
        countryId: row.countryId || null,
        phone: row.phone || row.mobile || null,
        email: row.email || null,
        customerNumber: row.customerNumber || null,
        sourceId,
        sourceCustomerNumber: row.customerNumber || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const docRef = customersCollection.doc()
      await docRef.set({ id: docRef.id, ...payload })
      customerIdMap.set(sourceId, docRef.id)
      customersCreated += 1
    }

    let vehiclesCreated = 0
    let vehiclesSkipped = 0
    let vehiclesUnlinked = 0

    for (const row of vehiclesRows) {
      const sourceId = row.ID
      if (!sourceId) continue

      const existing = await vehiclesCollection
        .where('sourceId', '==', sourceId)
        .limit(1)
        .get()
      if (!existing.empty) {
        vehiclesSkipped += 1
        continue
      }

      const customerSourceId = row.customerId || ''
      const linkedCustomerId = customerSourceId
        ? customerIdMap.get(customerSourceId) || null
        : null
      if (customerSourceId && !linkedCustomerId) {
        vehiclesUnlinked += 1
      }

      const payload = {
        brand: row.brand || null,
        model: row.type || null,
        licensePlate: row.license || null,
        constructionDate: row.constructionDate || null,
        color: row.color || null,
        apkDate: row.apkDate || null,
        mileage: row.mileage ? Number(row.mileage) : null,
        vin: row.chassisNumber || null,
        customerId: linkedCustomerId,
        customerSourceId: customerSourceId || null,
        customerName: row.customerName || null,
        isHistory: toBool(row.isHistory),
        deleted: toBool(row.deleted),
        sourceId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const docRef = vehiclesCollection.doc()
      await docRef.set({ id: docRef.id, ...payload })
      vehiclesCreated += 1
    }

    return NextResponse.json({
      success: true,
      customersFile,
      vehiclesFile,
      customers: {
        created: customersCreated,
        skipped: customersSkipped
      },
      vehicles: {
        created: vehiclesCreated,
        skipped: vehiclesSkipped,
        unlinked: vehiclesUnlinked
      }
    })
  } catch (error: any) {
    console.error('Import failed:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
