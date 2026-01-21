import * as admin from 'firebase-admin'
import path from 'path'
import fs from 'fs'

declare global {
  // eslint-disable-next-line no-var
  var __FIREBASE_ADMIN__: admin.app.App | undefined
}

function initializeAdminApp(): admin.app.App {
  if (global.__FIREBASE_ADMIN__) return global.__FIREBASE_ADMIN__

  try {
    const existingApp = admin.app()
    if (existingApp) {
      global.__FIREBASE_ADMIN__ = existingApp
      return existingApp
    }
  } catch {
    // No existing app, continue
  }

  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET

  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

  if (!storageBucket || !projectId) {
    throw new Error('Missing Firebase Admin configuration (projectId/storageBucket).')
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (serviceAccountJson) {
    try {
      const raw = JSON.parse(serviceAccountJson) as Record<string, any>
      const serviceAccount = {
        projectId: raw.project_id || raw.projectId || projectId,
        clientEmail: raw.client_email || raw.clientEmail,
        privateKey: String(raw.private_key || raw.privateKey || '').replace(/\\n/g, '\n')
      }
      if (!serviceAccount.privateKey || !serviceAccount.clientEmail || !serviceAccount.projectId) {
        throw new Error(
          'FIREBASE_SERVICE_ACCOUNT_KEY is missing required fields (private_key, client_email, or project_id)'
        )
      }

      const app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        storageBucket,
        projectId: serviceAccount.projectId || projectId
      })
      global.__FIREBASE_ADMIN__ = app
      console.log('✅ Firebase Admin initialized from FIREBASE_SERVICE_ACCOUNT_KEY')
      return app
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.error('❌ Failed to initialize from FIREBASE_SERVICE_ACCOUNT_KEY:', errorMsg)
      throw new Error(`Firebase Admin initialization failed: ${errorMsg}`)
    }
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
  if (clientEmail && privateKey) {
    const normalizedKey = privateKey.replace(/\\n/g, '\n')
    const app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: normalizedKey
      }),
      storageBucket,
      projectId
    })
    global.__FIREBASE_ADMIN__ = app
    console.log('✅ Firebase Admin initialized from FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY')
    return app
  }

  try {
    const app = admin.initializeApp(
      {
        credential: admin.credential.applicationDefault(),
        storageBucket,
        projectId
      },
      'default'
    )
    global.__FIREBASE_ADMIN__ = app
    console.log('✅ Firebase Admin initialized from Application Default Credentials')
    return app
  } catch {
    // Fallback to local serviceAccount file
  }

  const rootPath = process.cwd()
  const keyPath = path.join(rootPath, 'serviceAccountKey.json')
  if (fs.existsSync(keyPath)) {
    const serviceAccountJson = fs.readFileSync(keyPath, 'utf8')
    const serviceAccount = JSON.parse(serviceAccountJson)

    const app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      storageBucket,
      projectId
    })

    global.__FIREBASE_ADMIN__ = app
    console.log('✅ Firebase Admin initialized from serviceAccountKey.json')
    return app
  }

  throw new Error(
    'Firebase Admin initialization failed. Provide FIREBASE_SERVICE_ACCOUNT_KEY, FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY, or serviceAccountKey.json.'
  )
}

let adminApp: admin.app.App | null = null
let adminStorage: admin.storage.Storage | null = null
let adminFirestore: admin.firestore.Firestore | null = null

try {
  adminApp = initializeAdminApp()
  adminStorage = adminApp.storage()
  adminFirestore = adminApp.firestore()
} catch (error) {
  console.error('Failed to initialize Firebase Admin:', error)
}

export function ensureAdmin(): void {
  if (admin.apps.length > 0) return

  adminApp = initializeAdminApp()
  adminStorage = adminApp.storage()
  adminFirestore = adminApp.firestore()
}

export function getAdminApp(): admin.app.App {
  ensureAdmin()
  if (!adminApp) {
    throw new Error('Firebase Admin app is null after initialization')
  }
  return adminApp
}

export { adminApp, adminStorage, adminFirestore }
