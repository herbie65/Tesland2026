/**
 * Migration script: Firestore → PostgreSQL
 * 
 * This script migrates all data from Firestore to PostgreSQL.
 * 
 * Prerequisites:
 * 1. Firebase Admin SDK must be configured (serviceAccountKey.json or env vars)
 * 2. PostgreSQL database must be running and migrations applied
 * 3. DATABASE_URL must be set in .env.local
 * 
 * Usage:
 *   node scripts/migrate-firestore-to-postgres.js
 * 
 * Options:
 *   --dry-run    : Preview migration without writing to database
 *   --collection : Migrate specific collection only (e.g., --collection=users)
 *   --skip       : Skip specific collections (e.g., --skip=auditLogs,rdwLogs)
 */

const { PrismaClient } = require('../src/generated/prisma')
const admin = require('firebase-admin')
const path = require('path')
const fs = require('fs')

// Parse command line arguments
const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const specificCollection = args.find(arg => arg.startsWith('--collection='))?.split('=')[1]
const skipCollections = args.find(arg => arg.startsWith('--skip='))?.split('=')[1]?.split(',') || []

const prisma = new PrismaClient()

// Initialize Firebase Admin
function initFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.app()
  }

  // Try multiple methods to initialize Firebase Admin
  const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json')
  
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })
  }

  throw new Error('Firebase Admin could not be initialized. Please provide serviceAccountKey.json or FIREBASE_SERVICE_ACCOUNT_KEY env var.')
}

const firestore = initFirebaseAdmin().firestore()

// Collection mapping: Firestore collection name → Prisma model name
const COLLECTION_MAP = {
  users: 'user',
  roles: 'role',
  customers: 'customer',
  vehicles: 'vehicle',
  planningItems: 'planningItem',
  planningTypes: 'planningType',
  workOrders: 'workOrder',
  products: 'product',
  partsLines: 'partsLine',
  inventoryLocations: 'inventoryLocation',
  stockMoves: 'stockMove',
  orders: 'order',
  purchaseOrders: 'purchaseOrder',
  invoices: 'invoice',
  creditInvoices: 'creditInvoice',
  rmas: 'rma',
  settings: 'setting',
  emailTemplates: 'emailTemplate',
  emailLogs: 'emailLog',
  pages: 'page',
  auditLogs: 'auditLog',
  rdwLogs: 'rdwLog',
  notifications: 'notification',
  counters: 'counter',
}

// Stats tracker
const stats = {
  collections: {},
  errors: [],
  startTime: Date.now(),
}

function log(message, type = 'info') {
  const timestamp = new Date().toISOString()
  const prefix = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warn: '⚠️',
    skip: '⏭️',
  }[type] || 'ℹ️'
  
  console.log(`[${timestamp}] ${prefix} ${message}`)
}

// Convert Firestore Timestamp to JavaScript Date
function convertTimestamp(value) {
  if (value && typeof value.toDate === 'function') {
    return value.toDate()
  }
  if (value && value._seconds !== undefined) {
    return new Date(value._seconds * 1000)
  }
  return value
}

// Convert Firestore document to PostgreSQL format
function convertDocument(doc, collectionName) {
  const data = doc.data()
  const converted = { ...data, id: doc.id }

  // Convert all Timestamp fields to Date
  Object.keys(converted).forEach(key => {
    const value = converted[key]
    if (value && typeof value.toDate === 'function') {
      converted[key] = value.toDate()
    } else if (value && value._seconds !== undefined) {
      converted[key] = new Date(value._seconds * 1000)
    }
  })

  // Collection-specific conversions
  switch (collectionName) {
    case 'users':
      return {
        id: converted.id,
        uid: converted.uid || converted.id,
        email: converted.email || null,
        displayName: converted.displayName || null,
        photoURL: converted.photoURL || null,
        phoneNumber: converted.phoneNumber || null,
        roleId: converted.roleId || null,
        role: converted.role || null,
        isSystemAdmin: converted.isSystemAdmin || false,
        createdAt: convertTimestamp(converted.created_at || converted.createdAt) || new Date(),
        updatedAt: convertTimestamp(converted.updated_at || converted.updatedAt) || new Date(),
      }

    case 'roles':
      return {
        id: converted.id,
        name: converted.name,
        isSystemAdmin: converted.isSystemAdmin || converted.is_system_admin || false,
        permissions: converted.permissions || null,
        description: converted.description || null,
        createdAt: convertTimestamp(converted.created_at || converted.createdAt) || new Date(),
        updatedAt: convertTimestamp(converted.updated_at || converted.updatedAt) || new Date(),
      }

    case 'customers':
      return {
        id: converted.id,
        name: converted.name,
        email: converted.email || null,
        phone: converted.phone || null,
        company: converted.company || null,
        address: converted.address || null,
        notes: converted.notes || null,
        createdAt: convertTimestamp(converted.created_at || converted.createdAt) || new Date(),
        updatedAt: convertTimestamp(converted.updated_at || converted.updatedAt) || new Date(),
      }

    case 'vehicles':
      return {
        id: converted.id,
        customerId: converted.customerId || converted.customer_id,
        licensePlate: converted.licensePlate || converted.license_plate,
        make: converted.make || null,
        model: converted.model || null,
        year: converted.year ? parseInt(converted.year) : null,
        vin: converted.vin || null,
        color: converted.color || null,
        notes: converted.notes || null,
        rdwData: converted.rdwData || converted.rdw_data || null,
        createdAt: convertTimestamp(converted.created_at || converted.createdAt) || new Date(),
        updatedAt: convertTimestamp(converted.updated_at || converted.updatedAt) || new Date(),
      }

    case 'planningItems':
      return {
        id: converted.id,
        title: converted.title,
        scheduledAt: convertTimestamp(converted.scheduledAt || converted.scheduled_at),
        durationMinutes: parseInt(converted.durationMinutes || converted.duration_minutes || 60),
        assigneeId: converted.assigneeId || converted.assignee_id || null,
        assigneeName: converted.assigneeName || converted.assignee_name || null,
        assigneeColor: converted.assigneeColor || converted.assignee_color || null,
        location: converted.location || null,
        customerId: converted.customerId || converted.customer_id || null,
        customerName: converted.customerName || converted.customer_name || null,
        vehicleId: converted.vehicleId || converted.vehicle_id || null,
        vehiclePlate: converted.vehiclePlate || converted.vehicle_plate || null,
        vehicleLabel: converted.vehicleLabel || converted.vehicle_label || null,
        planningTypeId: converted.planningTypeId || converted.planning_type_id || null,
        planningTypeName: converted.planningTypeName || converted.planning_type_name || null,
        planningTypeColor: converted.planningTypeColor || converted.planning_type_color || null,
        notes: converted.notes || null,
        status: converted.status || 'GEPLAND',
        workOrderId: converted.workOrderId || converted.work_order_id || null,
        priority: converted.priority || 'NORMAL',
        createdAt: convertTimestamp(converted.created_at || converted.createdAt) || new Date(),
        updatedAt: convertTimestamp(converted.updated_at || converted.updatedAt) || new Date(),
      }

    case 'workOrders':
      return {
        id: converted.id,
        workOrderNumber: converted.workOrderNumber || converted.work_order_number || `WO-${converted.id}`,
        title: converted.title,
        description: converted.description || null,
        workOrderStatus: converted.workOrderStatus || converted.work_order_status || 'DRAFT',
        executionStatus: converted.executionStatus || converted.execution_status || null,
        warehouseStatus: converted.warehouseStatus || converted.warehouse_status || null,
        customerId: converted.customerId || converted.customer_id || null,
        customerName: converted.customerName || converted.customer_name || null,
        vehicleId: converted.vehicleId || converted.vehicle_id || null,
        vehiclePlate: converted.vehiclePlate || converted.vehicle_plate || null,
        vehicleLabel: converted.vehicleLabel || converted.vehicle_label || null,
        assigneeId: converted.assigneeId || converted.assignee_id || null,
        assigneeName: converted.assigneeName || converted.assignee_name || null,
        licensePlate: converted.licensePlate || converted.license_plate || null,
        scheduledAt: convertTimestamp(converted.scheduledAt || converted.scheduled_at) || null,
        completedAt: convertTimestamp(converted.completedAt || converted.completed_at) || null,
        pricingMode: converted.pricingMode || converted.pricing_mode || null,
        estimatedAmount: converted.estimatedAmount || converted.estimated_amount || null,
        priceAmount: converted.priceAmount || converted.price_amount || null,
        currency: converted.currency || 'EUR',
        priority: converted.priority || 'NORMAL',
        notes: converted.notes || null,
        internalNotes: converted.internalNotes || converted.internal_notes || null,
        createdAt: convertTimestamp(converted.created_at || converted.createdAt) || new Date(),
        updatedAt: convertTimestamp(converted.updated_at || converted.updatedAt) || new Date(),
        createdBy: converted.createdBy || converted.created_by || null,
      }

    case 'settings':
      return {
        id: converted.id || doc.id,
        data: converted.data || converted,
        createdAt: convertTimestamp(converted.created_at || converted.createdAt) || new Date(),
        updatedAt: convertTimestamp(converted.updated_at || converted.updatedAt) || new Date(),
      }

    case 'counters':
      return {
        id: converted.id || doc.id,
        currentValue: parseInt(converted.currentValue || converted.current_value || 0),
        prefix: converted.prefix || null,
        format: converted.format || null,
        updatedAt: convertTimestamp(converted.updated_at || converted.updatedAt) || new Date(),
      }

    default:
      // Generic conversion with camelCase to snake_case mapping
      const result = { id: converted.id }
      Object.keys(converted).forEach(key => {
        if (key !== 'id') {
          result[key] = converted[key]
        }
      })
      return result
  }
}

// Migrate a single collection
async function migrateCollection(collectionName, modelName) {
  if (skipCollections.includes(collectionName)) {
    log(`Skipping collection: ${collectionName}`, 'skip')
    return
  }

  log(`Starting migration for collection: ${collectionName}`)
  
  try {
    const snapshot = await firestore.collection(collectionName).get()
    
    if (snapshot.empty) {
      log(`Collection ${collectionName} is empty`, 'warn')
      stats.collections[collectionName] = { count: 0, migrated: 0, skipped: 0, errors: 0 }
      return
    }

    log(`Found ${snapshot.size} documents in ${collectionName}`)
    
    const results = {
      count: snapshot.size,
      migrated: 0,
      skipped: 0,
      errors: 0,
    }

    for (const doc of snapshot.docs) {
      try {
        const data = convertDocument(doc, collectionName)
        
        if (isDryRun) {
          log(`[DRY RUN] Would migrate ${collectionName}/${doc.id}`, 'info')
          results.migrated++
          continue
        }

        // Upsert to PostgreSQL
        await prisma[modelName].upsert({
          where: { id: data.id },
          update: data,
          create: data,
        })

        results.migrated++
        
        if (results.migrated % 10 === 0) {
          log(`Progress: ${results.migrated}/${snapshot.size} documents migrated for ${collectionName}`)
        }
      } catch (error) {
        results.errors++
        const errorMsg = `Failed to migrate ${collectionName}/${doc.id}: ${error.message}`
        log(errorMsg, 'error')
        stats.errors.push(errorMsg)
      }
    }

    stats.collections[collectionName] = results
    log(`Completed ${collectionName}: ${results.migrated} migrated, ${results.errors} errors`, 'success')
  } catch (error) {
    const errorMsg = `Failed to migrate collection ${collectionName}: ${error.message}`
    log(errorMsg, 'error')
    stats.errors.push(errorMsg)
    stats.collections[collectionName] = { count: 0, migrated: 0, skipped: 0, errors: 1 }
  }
}

// Main migration function
async function main() {
  log('🚀 Starting Firestore → PostgreSQL migration')
  log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE MIGRATION'}`)
  
  if (specificCollection) {
    log(`Migrating only collection: ${specificCollection}`)
  }
  
  if (skipCollections.length > 0) {
    log(`Skipping collections: ${skipCollections.join(', ')}`)
  }

  const collectionsToMigrate = specificCollection
    ? [[specificCollection, COLLECTION_MAP[specificCollection]]]
    : Object.entries(COLLECTION_MAP)

  for (const [collectionName, modelName] of collectionsToMigrate) {
    if (!modelName) {
      log(`No model mapping found for collection: ${collectionName}`, 'warn')
      continue
    }
    
    await migrateCollection(collectionName, modelName)
  }

  // Print summary
  const duration = ((Date.now() - stats.startTime) / 1000).toFixed(2)
  
  console.log('\n' + '='.repeat(60))
  log('Migration Summary', 'success')
  console.log('='.repeat(60))
  
  Object.entries(stats.collections).forEach(([collection, results]) => {
    console.log(`\n${collection}:`)
    console.log(`  Total: ${results.count}`)
    console.log(`  Migrated: ${results.migrated}`)
    console.log(`  Errors: ${results.errors}`)
  })
  
  const totalMigrated = Object.values(stats.collections).reduce((sum, r) => sum + r.migrated, 0)
  const totalErrors = Object.values(stats.collections).reduce((sum, r) => sum + r.errors, 0)
  
  console.log('\n' + '='.repeat(60))
  console.log(`Total documents migrated: ${totalMigrated}`)
  console.log(`Total errors: ${totalErrors}`)
  console.log(`Duration: ${duration}s`)
  console.log('='.repeat(60) + '\n')
  
  if (stats.errors.length > 0) {
    console.log('Errors:')
    stats.errors.forEach(err => console.log(`  - ${err}`))
  }
  
  if (isDryRun) {
    log('This was a DRY RUN. No data was written to the database.', 'warn')
  } else {
    log('Migration completed!', 'success')
  }
}

main()
  .catch((error) => {
    log(`Migration failed: ${error.message}`, 'error')
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
