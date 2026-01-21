import { adminFirestore, ensureAdmin } from '@/lib/firebase-admin'

const requireFirestore = () => {
  ensureAdmin()
  if (!adminFirestore) {
    throw new Error('Firebase Admin is not initialized')
  }
  return adminFirestore
}

const generateLogicalId = (collectionName: string) => {
  const timestamp = Date.now()
  const date = new Date(timestamp)
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const timeStr = date.toTimeString().slice(0, 8).replace(/:/g, '')

  switch (collectionName) {
    case 'planning':
      return `PLN-${dateStr}-${timeStr}-${String(timestamp).slice(-3)}`
    case 'customers':
      return `CUS-${dateStr}-${timeStr}-${String(timestamp).slice(-3)}`
    case 'vehicles':
      return `VEH-${dateStr}-${timeStr}-${String(timestamp).slice(-3)}`
    case 'orders':
      return `ORD-${dateStr}-${timeStr}-${String(timestamp).slice(-3)}`
    case 'products':
      return `PRD-${dateStr}-${timeStr}-${String(timestamp).slice(-3)}`
    default:
      return `${collectionName.toUpperCase().slice(0, 4)}-${dateStr}-${timeStr}-${String(timestamp).slice(-3)}`
  }
}

export class FirebaseAdminService {
  static async listCollection(collectionName: string) {
    const firestore = requireFirestore()
    const snapshot = await firestore.collection(collectionName).get()
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  }

  static async getCollectionItem(collectionName: string, id: string) {
    const firestore = requireFirestore()
    const docRef = firestore.collection(collectionName).doc(id)
    const docSnap = await docRef.get()
    if (!docSnap.exists) return null
    return { id: docSnap.id, ...docSnap.data() }
  }

  static async createCollectionItem(collectionName: string, data: any) {
    const firestore = requireFirestore()
    const logicalId = generateLogicalId(collectionName)
    const nowIso = new Date().toISOString()
    const payload = {
      ...data,
      id: logicalId,
      created_at: nowIso,
      updated_at: nowIso
    }
    await firestore.collection(collectionName).doc(logicalId).set(payload)
    return { id: logicalId, ...payload }
  }

  static async updateCollectionItem(collectionName: string, id: string, data: any) {
    const firestore = requireFirestore()
    const { id: _omitId, ...updateData } = data
    const cleanedUpdateData = Object.fromEntries(
      Object.entries(updateData || {}).filter(([_, value]) => value !== undefined)
    )
    const payload = {
      ...cleanedUpdateData,
      updated_at: new Date().toISOString()
    }
    await firestore.collection(collectionName).doc(id).set(payload, { merge: true })
    return { id, ...payload }
  }

  static async deleteCollectionItem(collectionName: string, id: string) {
    const firestore = requireFirestore()
    await firestore.collection(collectionName).doc(id).delete()
    return true
  }

  static async getPlanningItems() {
    return this.listCollection('planning')
  }

  static async getPlanningItem(id: string) {
    return this.getCollectionItem('planning', id)
  }

  static async createPlanningItem(data: any) {
    return this.createCollectionItem('planning', data)
  }

  static async updatePlanningItem(id: string, data: any) {
    return this.updateCollectionItem('planning', id, data)
  }

  static async deletePlanningItem(id: string) {
    return this.deleteCollectionItem('planning', id)
  }

  static async getProducts() {
    return this.listCollection('products')
  }

  static async getProduct(id: string) {
    return this.getCollectionItem('products', id)
  }

  static async createProduct(data: any) {
    return this.createCollectionItem('products', data)
  }

  static async updateProduct(id: string, data: any) {
    return this.updateCollectionItem('products', id, data)
  }

  static async deleteProduct(id: string) {
    return this.deleteCollectionItem('products', id)
  }
}
