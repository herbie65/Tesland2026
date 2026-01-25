import { prisma } from '@/lib/prisma'
import { getNumberingSettings } from '@/lib/settings'

const pad = (value: number, length: number) => String(value).padStart(length, '0')

export type NumberingKey = 'orders' | 'invoices' | 'creditInvoices' | 'rmas'

export const generateSalesNumber = async (key: NumberingKey) => {
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

  // Use Prisma transaction for atomic counter increment
  const result = await prisma.$transaction(async (tx) => {
    const counter = await tx.counter.findUnique({
      where: { id: key },
    })

    const storedYear = counter?.format?.includes('{year}') ? year : ''
    const currentSeq = counter?.currentValue || 0
    const nextSeq = storedYear === year || !storedYear ? currentSeq + 1 : 1

    await tx.counter.update({
      where: { id: key },
      data: { currentValue: nextSeq },
    })

    return nextSeq
  })

  return `${prefix}-${year}${pad(result, numbering.sequenceLength)}`
}

export const generateWorkOrderNumber = async (date = new Date()) => {
  const now = date
  const year = String(now.getFullYear()).slice(-2)

  // Use Prisma transaction for atomic counter increment with retries
  let attempts = 0
  const maxAttempts = 5
  
  while (attempts < maxAttempts) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const counter = await tx.counter.findUnique({
          where: { id: 'workorders' },
        })

        const storedYear = String((counter?.format || '').match(/\d{2}/)?.[0] || '')
        const currentSeq = counter?.currentValue || 0
        const nextSeq = storedYear === year ? currentSeq + 1 : 1

        await tx.counter.update({
          where: { id: 'workorders' },
          data: { 
            currentValue: nextSeq,
            format: `WO${year}-{seq}`
          },
        })

        return nextSeq
      }, {
        maxWait: 5000,
        timeout: 10000,
        isolationLevel: 'Serializable'
      })

      return `WO${year}-${pad(result, 5)}`
    } catch (err: any) {
      attempts++
      if (attempts >= maxAttempts) {
        throw new Error(`Failed to generate work order number after ${maxAttempts} attempts: ${err.message}`)
      }
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 50 * Math.pow(2, attempts)))
    }
  }
  
  throw new Error('Failed to generate work order number')
}
