import { adminFirestore, ensureAdmin } from '@/lib/firebase-admin'
import { getNumberingSettings } from '@/lib/settings'

const ensureFirestore = () => {
  ensureAdmin()
  if (!adminFirestore) {
    throw new Error('Firebase Admin not initialized')
  }
  return adminFirestore
}

const pad = (value: number, length: number) => String(value).padStart(length, '0')

export type NumberingKey = 'orders' | 'invoices' | 'creditInvoices' | 'rmas'

export const generateSalesNumber = async (key: NumberingKey) => {
  const firestore = ensureFirestore()
  const numbering = await getNumberingSettings()
  const now = new Date()
  const yearRaw = String(now.getFullYear())
  const year = yearRaw.slice(-numbering.yearLength)

  const prefixMap: Record<NumberingKey, string> = {
    orders: numbering.orderPrefix,
    invoices: numbering.invoicePrefix,
    creditInvoices: numbering.creditPrefix,
    rmas: numbering.rmaPrefix
  }
  const prefix = prefixMap[key]

  const counterRef = firestore.collection('counters').doc(key)
  const nextNumber = await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef)
    const data = snap.data() || {}
    const storedYear = String(data.year || '')
    const currentSeq = Number(data.seq || 0)
    const nextSeq = storedYear === year ? currentSeq + 1 : 1
    tx.set(counterRef, { year, seq: nextSeq, updated_at: now.toISOString() }, { merge: true })
    return nextSeq
  })

  return `${prefix}-${year}${pad(nextNumber, numbering.sequenceLength)}`
}
