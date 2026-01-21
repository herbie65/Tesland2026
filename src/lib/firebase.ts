import { initializeApp, getApps } from 'firebase/app'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  setDoc,
  where
} from 'firebase/firestore'

let app: ReturnType<typeof initializeApp> | undefined
let db: ReturnType<typeof getFirestore> | null = null
const memoryStore: Record<string, Map<string, any>> = {}
let warnedAboutConfig = false

const getFirebaseConfig = () => ({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ''
})

const hasFirebaseConfig = () => {
  const firebaseConfig = getFirebaseConfig()
  return Boolean(
    firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId
  )
}

const initializeFirebase = () => {
  try {
    const firebaseConfig = getFirebaseConfig()

    if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
      throw new Error('Missing required Firebase configuration values.')
    }

    const apps = getApps()
    if (apps.length === 0) {
      app = initializeApp(firebaseConfig)
    } else {
      app = apps[0]
    }

    if (!db) {
      db = getFirestore(app)
    }

    return db
  } catch (error) {
    console.error('Firebase initialization error:', error)
    throw new Error('Failed to initialize Firebase. Please check your configuration.')
  }
}

const getDb = () => {
  if (!db) {
    return initializeFirebase()
  }
  return db
}

const getMemoryCollection = (collectionName: string) => {
  if (!memoryStore[collectionName]) {
    memoryStore[collectionName] = new Map<string, any>()
  }
  return memoryStore[collectionName]
}

export class FirebaseService {
  static isConfigured() {
    return hasFirebaseConfig()
  }

  static shouldUseMemoryStore() {
    if (hasFirebaseConfig()) return false
    if (!warnedAboutConfig) {
      console.warn(
        'Firebase config missing. Falling back to in-memory store for development.'
      )
      warnedAboutConfig = true
    }
    return true
  }

  static async generateLogicalId(collectionName: string) {
    const timestamp = Date.now()
    const date = new Date(timestamp)
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
    const timeStr = date.toTimeString().slice(0, 8).replace(/:/g, '')

    switch (collectionName) {
      case 'planning':
        return `PLN-${dateStr}-${timeStr}-${String(timestamp).slice(-3)}`
      default:
        return `${collectionName.toUpperCase().slice(0, 4)}-${dateStr}-${timeStr}-${String(timestamp).slice(-3)}`
    }
  }

  static async getDocument(collectionName: string, docId: string) {
    try {
      if (this.shouldUseMemoryStore()) {
        const store = getMemoryCollection(collectionName)
        return store.get(docId) || null
      }
      const database = getDb()
      const docRef = doc(database, collectionName, docId)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() }
      }
      return null
    } catch (error) {
      console.error('Error getting document:', error)
      throw error
    }
  }

  static async getDocuments(collectionName: string, conditions: any[] = []) {
    try {
      if (this.shouldUseMemoryStore()) {
        const store = getMemoryCollection(collectionName)
        const items = Array.from(store.values())
        if (!conditions.length) return items
        return items.filter((item) =>
          conditions.every(
            (condition) => item?.[condition.field] === condition.value
          )
        )
      }
      const database = getDb()
      let q: any = collection(database, collectionName)

      conditions.forEach((condition) => {
        q = query(q, where(condition.field, condition.operator, condition.value))
      })

      const querySnapshot = await getDocs(q)
      const documents: any[] = []

      querySnapshot.forEach((snapshot) => {
        documents.push({ id: snapshot.id, ...(snapshot.data() as any) })
      })

      return documents
    } catch (error) {
      console.error('Error getting documents:', error)
      throw error
    }
  }

  static async addDocument(collectionName: string, data: any) {
    try {
      if (this.shouldUseMemoryStore()) {
        const store = getMemoryCollection(collectionName)
        const logicalId = await this.generateLogicalId(collectionName)
        const nowIso = new Date().toISOString()
        const payload = {
          ...data,
          id: logicalId,
          created_at: nowIso,
          updated_at: nowIso
        }
        store.set(logicalId, payload)
        return { id: logicalId, ...payload }
      }
      const database = getDb()
      const logicalId = await this.generateLogicalId(collectionName)
      const docRef = doc(database, collectionName, logicalId)
      const nowIso = new Date().toISOString()
      const payload = {
        ...data,
        id: logicalId,
        created_at: nowIso,
        updated_at: nowIso
      }

      await setDoc(docRef, payload)

      return { id: logicalId, ...payload }
    } catch (error) {
      console.error('Error adding document:', error)
      throw error
    }
  }

  static async updateDocument(collectionName: string, docId: string, data: any) {
    try {
      if (!docId || typeof docId !== 'string') {
        throw new Error(`Invalid document id for collection ${collectionName}`)
      }
      if (this.shouldUseMemoryStore()) {
        const store = getMemoryCollection(collectionName)
        const existing = store.get(docId)
        if (!existing) {
          throw new Error('Document not found')
        }
        const { id, ...updateData } = data
        const cleanedUpdateData = Object.fromEntries(
          Object.entries(updateData || {}).filter(([_, value]) => value !== undefined)
        )
        const updated = {
          ...existing,
          ...cleanedUpdateData,
          updated_at: new Date().toISOString()
        }
        store.set(docId, updated)
        return { id: docId, ...updated }
      }
      const database = getDb()
      const docRef = doc(database, collectionName, docId)
      const { id, ...updateData } = data
      const cleanedUpdateData = Object.fromEntries(
        Object.entries(updateData || {}).filter(([_, value]) => value !== undefined)
      )

      await setDoc(
        docRef,
        {
          ...cleanedUpdateData,
          updated_at: new Date().toISOString()
        },
        { merge: true }
      )

      return { id: docId, ...cleanedUpdateData }
    } catch (error) {
      console.error('Error updating document:', error)
      throw error
    }
  }

  static async deleteDocument(collectionName: string, docId: string) {
    try {
      if (this.shouldUseMemoryStore()) {
        const store = getMemoryCollection(collectionName)
        store.delete(docId)
        return true
      }
      const database = getDb()
      const docRef = doc(database, collectionName, docId)
      await deleteDoc(docRef)
      return true
    } catch (error) {
      console.error('Error deleting document:', error)
      throw error
    }
  }

  static async getPlanningItems() {
    return this.getDocuments('planning')
  }

  static async getPlanningItem(id: string) {
    return this.getDocument('planning', id)
  }

  static async createPlanningItem(data: any) {
    return this.addDocument('planning', data)
  }

  static async updatePlanningItem(id: string, data: any) {
    return this.updateDocument('planning', id, data)
  }

  static async deletePlanningItem(id: string) {
    return this.deleteDocument('planning', id)
  }
}

export { db, app, getDb }
