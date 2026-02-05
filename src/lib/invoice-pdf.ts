import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import path from 'path'
import fs from 'fs/promises'

type VatMetaRate = {
  code?: string | null
  name: string
  percentage: number
}

type VatMeta = {
  high: VatMetaRate
  low: VatMetaRate
  zero: VatMetaRate
  reversed: VatMetaRate
}

type InvoicePdfInput = {
  invoice: {
    invoiceNumber: string
    invoiceDate: Date
    totalAmount: unknown
    vatTotal?: unknown | null
    subtotalAmount?: unknown | null
    vatSubtotalHigh?: unknown | null
    vatAmountHigh?: unknown | null
    vatSubtotalLow?: unknown | null
    vatAmountLow?: unknown | null
    vatSubtotalZero?: unknown | null
    vatReversed?: boolean | null
    vatReversedText?: string | null
    vatExempt?: boolean | null
    customerVatNumber?: string | null
    customerIsB2B?: boolean | null
  }
  order?: { orderNumber?: string | null } | null
  customer?: {
    name: string
    email?: string | null
    street?: string | null
    zipCode?: string | null
    city?: string | null
    address?: unknown | null
  } | null
  lines: Array<{
    sku: string
    name: string
    quantity: number
    unitPrice: unknown
    totalPrice: unknown
  }>
  vatMeta: VatMeta
}

const asNumber = (value: unknown) => {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
}

const fmtMoney = (value: unknown) => {
  const n = asNumber(value)
  return `€ ${n.toFixed(2)}`
}

const fmtPct = (value: number) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  // Avoid trailing .00 for integers
  return Number.isInteger(n) ? `${n}%` : `${n.toFixed(2)}%`
}

const A4_WIDTH = 595.28
const A4_HEIGHT = 841.89

export async function generateInvoicePdf(input: InvoicePdfInput): Promise<Buffer> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([A4_WIDTH, A4_HEIGHT]) // A4 in points
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)

  // Briefpapier-achtergrond: plaats letterhead.png of letterhead.jpg in public/invoice/
  const invoiceDir = path.join(process.cwd(), 'public', 'invoice')
  for (const name of ['letterhead.png', 'letterhead.jpg']) {
    try {
      const bytes = await fs.readFile(path.join(invoiceDir, name))
      const img = name.endsWith('.png') ? await doc.embedPng(bytes) : await doc.embedJpg(bytes)
      page.drawImage(img, { x: 0, y: 0, width: A4_WIDTH, height: A4_HEIGHT })
      break
    } catch {
      // bestand niet gevonden of ongeldig, ga door zonder achtergrond
    }
  }

  const margin = 48
  let y = A4_HEIGHT - margin

  const drawText = (text: string, size = 11, bold = false, color = rgb(0.1, 0.1, 0.1)) => {
    page.drawText(text, {
      x: margin,
      y,
      size,
      font: bold ? fontBold : font,
      color
    })
    y -= size + 6
  }

  const drawTextAt = (text: string, x: number, yy: number, size = 10, bold = false, color = rgb(0.1, 0.1, 0.1)) => {
    page.drawText(text, { x, y: yy, size, font: bold ? fontBold : font, color })
  }

  // Tesland staat op het briefpapier; Factuur begint waar anders factuurnummer stond
  y -= 84
  drawText('FACTUUR', 14, true)
  y -= 8

  drawText(`Factuurnummer: ${input.invoice.invoiceNumber}`, 11)
  drawText(`Factuurdatum: ${new Date(input.invoice.invoiceDate).toLocaleDateString('nl-NL')}`, 11)
  if (input.order?.orderNumber) {
    drawText(`Order: ${input.order.orderNumber}`, 11)
  }

  y -= 12
  drawText('Klant', 12, true)
  const c = input.customer
  if (c) {
    drawText(c.name, 11)
    const addr =
      c.address && typeof c.address === 'object' && c.address !== null ? (c.address as Record<string, unknown>) : null
    const street = c.street || (addr?.street as string | undefined)
    const zip = c.zipCode || (addr?.zipCode as string | undefined) || (addr?.postalCode as string | undefined)
    const city = c.city || (addr?.city as string | undefined)
    if (street) drawText(String(street), 11)
    if (zip || city) drawText(`${zip ? String(zip) : ''}${zip && city ? ' ' : ''}${city ? String(city) : ''}`, 11)
  }

  y -= 16
  drawText('Regels', 12, true)

  // Table header – rechterrand voor alle bedragen (Totaal-kolom)
  const startY = y
  const pageWidth = A4_WIDTH
  const amountRightEdge = pageWidth - margin
  const colX = {
    qty: margin,
    sku: margin + 40,
    name: margin + 140,
    price: margin + 380,
    totalRight: amountRightEdge
  }
  page.drawText('Qty', { x: colX.qty, y, size: 10, font: fontBold })
  page.drawText('SKU', { x: colX.sku, y, size: 10, font: fontBold })
  page.drawText('Omschrijving', { x: colX.name, y, size: 10, font: fontBold })
  page.drawText('Prijs', { x: colX.price, y, size: 10, font: fontBold })
  const totalHeaderW = fontBold.widthOfTextAtSize('Totaal', 10)
  page.drawText('Totaal', { x: colX.totalRight - totalHeaderW, y, size: 10, font: fontBold })
  y -= 16
  page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 1, color: rgb(0.85, 0.85, 0.85) })
  y -= 10

  for (const line of input.lines) {
    if (y < margin + 120) break // keep simple: single page for now
    page.drawText(String(line.quantity), { x: colX.qty, y, size: 10, font })
    page.drawText(String(line.sku).slice(0, 18), { x: colX.sku, y, size: 10, font })
    page.drawText(String(line.name).slice(0, 45), { x: colX.name, y, size: 10, font })
    const priceStr = fmtMoney(line.unitPrice)
    const totalStr = fmtMoney(line.totalPrice)
    const priceW = font.widthOfTextAtSize(priceStr, 10)
    const totalW = font.widthOfTextAtSize(totalStr, 10)
    page.drawText(priceStr, { x: colX.totalRight - 90 - priceW, y, size: 10, font })
    page.drawText(totalStr, { x: colX.totalRight - totalW, y, size: 10, font })
    y -= 14
  }

  y = Math.min(y, startY) - 18
  page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 1, color: rgb(0.85, 0.85, 0.85) })
  y -= 14

  const subtotal = input.invoice.subtotalAmount != null ? asNumber(input.invoice.subtotalAmount) : null
  const vat = input.invoice.vatTotal != null ? asNumber(input.invoice.vatTotal) : null
  const total = asNumber(input.invoice.totalAmount)

  const vatHighSub = input.invoice.vatSubtotalHigh != null ? asNumber(input.invoice.vatSubtotalHigh) : 0
  const vatHighAmt = input.invoice.vatAmountHigh != null ? asNumber(input.invoice.vatAmountHigh) : 0
  const vatLowSub = input.invoice.vatSubtotalLow != null ? asNumber(input.invoice.vatSubtotalLow) : 0
  const vatLowAmt = input.invoice.vatAmountLow != null ? asNumber(input.invoice.vatAmountLow) : 0
  const vatZeroSub = input.invoice.vatSubtotalZero != null ? asNumber(input.invoice.vatSubtotalZero) : 0

  const vatReversed = input.invoice.vatReversed === true
  const vatReversedText = input.invoice.vatReversedText || null
  const vatExempt = input.invoice.vatExempt === true
  const customerVatNumber = input.invoice.customerVatNumber || null

  const hasHigh = vatHighSub > 0.000001
  const hasLow = vatLowSub > 0.000001
  const hasZero = vatZeroSub > 0.000001
  const hasBreakdown = hasHigh || hasLow || hasZero

  // Subtotaal/BTW/Totaal: labels iets naar rechts, bedragen helemaal rechts uitgelijnd onder Totaal-kolom
  const summaryLabelX = margin + 280
  const drawLineRight = (label: string, amountStr: string, size: number, isTotal = false) => {
    const w = fontBold.widthOfTextAtSize(amountStr, size)
    page.drawText(label, { x: summaryLabelX, y, size, font: fontBold, color: rgb(0.1, 0.1, 0.1) })
    page.drawText(amountStr, { x: amountRightEdge - w, y, size, font: fontBold, color: rgb(0.1, 0.1, 0.1) })
    y -= isTotal ? 18 : 16
  }
  if (subtotal != null) {
    drawLineRight('Subtotaal (excl. BTW):', fmtMoney(subtotal), 11)
  }
  if (vat != null) {
    drawLineRight('BTW:', fmtMoney(vat), 11)
  }
  drawLineRight('Totaal (incl. BTW):', fmtMoney(total), 12, true)

  // BTW-specificatie (compact; alleen niet-nul regels)
  if (hasBreakdown && y > margin + 110) {
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 1,
      color: rgb(0.9, 0.9, 0.9)
    })
    y -= 12

    page.drawText('BTW specificatie', { x: margin, y, size: 11, font: fontBold })
    y -= 12

    const bx = {
      desc: margin,
      pct: margin + 260,
      sub: margin + 330,
      btw: margin + 420,
      totRight: amountRightEdge
    }
    const bedragHeaderW = fontBold.widthOfTextAtSize('Bedrag', 9)

    drawTextAt('Omschrijving', bx.desc, y, 9, true, rgb(0.35, 0.35, 0.35))
    drawTextAt('Tarief', bx.pct, y, 9, true, rgb(0.35, 0.35, 0.35))
    drawTextAt('Subtotaal', bx.sub, y, 9, true, rgb(0.35, 0.35, 0.35))
    drawTextAt('BTW', bx.btw, y, 9, true, rgb(0.35, 0.35, 0.35))
    drawTextAt('Bedrag', bx.totRight - bedragHeaderW, y, 9, true, rgb(0.35, 0.35, 0.35))
    y -= 10
    page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 1, color: rgb(0.92, 0.92, 0.92) })
    y -= 10

    const rows: Array<{ name: string; pct: number; sub: number; btw: number }> = []
    if (hasHigh) rows.push({ name: input.vatMeta.high.name, pct: input.vatMeta.high.percentage, sub: vatHighSub, btw: vatHighAmt })
    if (hasLow) rows.push({ name: input.vatMeta.low.name, pct: input.vatMeta.low.percentage, sub: vatLowSub, btw: vatLowAmt })
    if (hasZero) {
      const meta = vatReversed ? input.vatMeta.reversed : input.vatMeta.zero
      rows.push({ name: meta.name, pct: meta.percentage, sub: vatZeroSub, btw: 0 })
    }

    for (const r of rows) {
      if (y < margin + 95) break
      const totStr = fmtMoney(r.sub + r.btw)
      const totW = font.widthOfTextAtSize(totStr, 10)
      drawTextAt(String(r.name).slice(0, 36), bx.desc, y, 10)
      drawTextAt(fmtPct(r.pct), bx.pct, y, 10)
      drawTextAt(fmtMoney(r.sub), bx.sub, y, 10)
      drawTextAt(fmtMoney(r.btw), bx.btw, y, 10)
      drawTextAt(totStr, bx.totRight - totW, y, 10, true)
      y -= 14
    }

    y -= 6
  }

  // Notices
  if (vatReversed && vatReversedText && y > margin + 70) {
    page.drawText('BTW verlegd', { x: margin, y, size: 11, font: fontBold, color: rgb(0.1, 0.2, 0.6) })
    y -= 14
    const line1 = String(vatReversedText)
    page.drawText(line1.slice(0, 90), { x: margin, y, size: 10, font, color: rgb(0.15, 0.2, 0.45) })
    y -= 12
    if (customerVatNumber) {
      page.drawText(`BTW-nummer klant: ${customerVatNumber}`, { x: margin, y, size: 10, font, color: rgb(0.15, 0.2, 0.45) })
      y -= 12
    }
    y -= 6
  }

  if (vatExempt && y > margin + 50) {
    page.drawText('BTW vrijgesteld', { x: margin, y, size: 11, font: fontBold, color: rgb(0.1, 0.5, 0.2) })
    y -= 14
    page.drawText('Deze factuur is vrijgesteld van BTW.', { x: margin, y, size: 10, font, color: rgb(0.15, 0.45, 0.25) })
    y -= 12
  }

  const bytes = await doc.save()
  return Buffer.from(bytes)
}

