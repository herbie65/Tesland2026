import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

type RouteContext = {
  params: { id?: string } | Promise<{ id?: string }>
}

const getIdFromRequest = async (request: NextRequest, context: RouteContext) => {
  const params = await context.params
  const directId = params?.id
  if (directId) return directId
  const segments = request.nextUrl.pathname.split('/').filter(Boolean)
  return segments[segments.length - 1] || ''
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(request, ['MANAGEMENT'])
    const id = await getIdFromRequest(request, context)
    if (!id) {
      return new NextResponse('Missing id', { status: 400 })
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        vehicle: true,
        lines: true
      }
    })

    if (!order) {
      return new NextResponse('Bestelling niet gevonden', { status: 404 })
    }

    const orderNumber = order.orderNumber ?? order.id.slice(0, 8)
    const lines = order.lines ?? []

    // Datum bestelling: placedAt, orderDate of createdAt
    const orderDate = order.placedAt ?? order.orderDate ?? order.createdAt
    const orderDateStr = orderDate ? formatDateNL(orderDate) : '-'

    // Verzenden naar: shippingAddress (JSON) of customer
    const ship = (order.shippingAddress as Record<string, unknown>) ?? {}
    const name = (ship.name as string) ?? order.customer?.name ?? '-'
    const street = (ship.street as string) ?? (ship.street1 as string) ?? order.customer?.street ?? ''
    const postalCode = (ship.postalCode as string) ?? (ship.postcode as string) ?? order.customer?.zipCode ?? ''
    const city = (ship.city as string) ?? order.customer?.city ?? ''
    const country = (ship.country as string) ?? (ship.countryCode as string) ?? 'Netherlands'
    const email = (ship.email as string) ?? order.customerEmail ?? order.customer?.email ?? ''
    const phone = (ship.phone as string) ?? order.customer?.phone ?? order.customer?.mobile ?? ''

    const shippingMethod = order.shippingMethod ?? '-'
    const generatedAt = new Date()
    const generatedAtStr = `${formatDateNL(generatedAt)} ${generatedAt.toTimeString().slice(0, 8)}`

    // QR-code van bestelnummer (rechtsboven op pakbon)
    const qrPayload = orderNumber
    const qrDataUrl = await QRCode.toDataURL(qrPayload, { width: 140, margin: 1 })

    const html = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <title>Pakbon ${orderNumber}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 24px auto; padding: 24px; color: #111; position: relative; }
    .no-print { margin-bottom: 16px; }
    .top-right-qr { position: absolute; top: 24px; right: 24px; }
    .top-right-qr img { display: block; width: 100px; height: 100px; }
    h1 { font-size: 1.75rem; font-weight: 700; margin: 0 0 16px 0; letter-spacing: 0.02em; }
    .header-line { display: flex; justify-content: space-between; margin-bottom: 24px; font-size: 0.95rem; }
    .section-label { font-weight: 600; margin-bottom: 6px; font-size: 0.9rem; }
    .address-block { margin-bottom: 20px; line-height: 1.5; font-size: 0.95rem; }
    .address-block div { margin: 2px 0; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 0.9rem; }
    th, td { border: 1px solid #333; padding: 10px 12px; text-align: left; }
    th { background: #f5f5f5; font-weight: 600; }
    td.amount { text-align: right; }
    td.check { width: 80px; text-align: center; }
    .notes-section { margin-top: 24px; }
    .notes-label { font-weight: 600; margin-bottom: 4px; }
    .notes-content { min-height: 40px; border-bottom: 1px solid #333; padding: 4px 0; }
    .signature-row { margin-top: 32px; display: flex; gap: 48px; flex-wrap: wrap; }
    .signature-block { min-width: 180px; }
    .signature-label { font-size: 0.85rem; margin-bottom: 4px; }
    .signature-line { border-bottom: 1px solid #333; height: 28px; }
    .footer { margin-top: 40px; font-size: 0.8rem; color: #666; text-align: center; }
    @media print { body { margin: 0; padding: 16px; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print">
    <button type="button" onclick="window.print()" style="padding: 8px 16px; background: #0f172a; color: white; border: none; border-radius: 6px; cursor: pointer;">Afdrukken</button>
    <button type="button" onclick="window.close()" style="margin-left: 8px; padding: 8px 16px; background: #e2e8f0; border: none; border-radius: 6px; cursor: pointer;">Sluiten</button>
  </div>

  <div class="top-right-qr" aria-hidden="true">
    <img src="${qrDataUrl}" alt="QR ${escapeHtml(orderNumber)}" width="100" height="100" />
  </div>

  <h1>PAKBON</h1>
  <div class="header-line">
    <span><strong>Bestelnummer:</strong> ${escapeHtml(orderNumber)}</span>
    <span><strong>Datum:</strong> ${orderDateStr}</span>
  </div>

  <div class="section-label">Verzenden naar:</div>
  <div class="address-block">
    <div>${escapeHtml(name)}</div>
    ${street ? `<div>${escapeHtml(street)}</div>` : ''}
    ${postalCode || city ? `<div>${escapeHtml(postalCode + (postalCode && city ? ' ' : '') + city)}</div>` : ''}
    ${country ? `<div>${escapeHtml(country)}</div>` : ''}
    ${email ? `<div>E-mail: ${escapeHtml(email)}</div>` : ''}
    ${phone ? `<div>Tel: ${escapeHtml(phone)}</div>` : ''}
  </div>

  <div style="margin-bottom: 16px;"><strong>Verzendmethode:</strong> ${escapeHtml(shippingMethod)}</div>

  <table>
    <thead>
      <tr>
        <th>Aantal</th>
        <th>Product</th>
        <th>SKU</th>
        <th class="check">Afgevinkt</th>
      </tr>
    </thead>
    <tbody>
      ${
        lines.length > 0
          ? lines
              .map(
                (line: { sku: string; name: string; quantity: number }) =>
                  `<tr>
                    <td class="amount">${line.quantity}</td>
                    <td>${escapeHtml(line.name)}</td>
                    <td>${escapeHtml(line.sku)}</td>
                    <td class="check"></td>
                  </tr>`
              )
              .join('')
          : `<tr><td class="amount">–</td><td>–</td><td>–</td><td class="check"></td></tr>`
      }
    </tbody>
  </table>

  <div class="notes-section">
    <div class="notes-label">Opmerkingen:</div>
    <div class="notes-content">${order.notes ? escapeHtml(order.notes) : ''}</div>
  </div>

  <div class="signature-row">
    <div class="signature-block">
      <div class="signature-label">Handtekening magazijn:</div>
      <div class="signature-line"></div>
    </div>
    <div class="signature-block">
      <div class="signature-label">Datum:</div>
      <div class="signature-line"></div>
    </div>
  </div>

  <div class="footer">
    <div>Pakbon gegenereerd op ${generatedAtStr}</div>
    <div style="margin-top: 4px;">-- 1 of 1 --</div>
  </div>
</body>
</html>`

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })
  } catch (error: any) {
    console.error('Error generating paklijst:', error)
    return new NextResponse('Fout bij genereren paklijst', { status: 500 })
  }
}

function formatDateNL(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  const day = date.getDate()
  const month = date.getMonth() + 1
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}

function escapeHtml(s: unknown): string {
  const str = s == null ? '' : String(s)
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
