/**
 * Parts Status Helper
 *
 * Calculate parts status directly from parts lines.
 * Display:zelfde kleurballetjes + teksten als planning (Rood/Geel/Groen).
 */

export type PartsLine = {
  id: string
  status?: string | null
  productName?: string | null
  quantity?: number | null
}

/** Statuses die als "binnen/compleet" tellen (groen). */
const GREEN_STATUSES = ['BINNEN', 'ONTVANGEN', 'KLAAR', 'BESCHIKBAAR', 'KLAARGELEGD', 'GEMONTEERD']
/** Statuses die als "in behandeling" tellen (geel). */
const YELLOW_STATUSES = ['BESTELD', 'ONDERWEG']

/**
 * Calculate the overall parts status from an array of parts lines
 * Returns the "worst" status (highest priority = needs most attention)
 */
export function calculatePartsStatus(partsLines?: PartsLine[]): string | null {
  if (!partsLines || partsLines.length === 0) {
    return null
  }

  const statuses = partsLines.map((p) => p.status).filter(Boolean) as string[]

  if (statuses.length === 0) {
    return null
  }

  if (statuses.some((s) => s === 'WACHT_OP_BESTELLING' || s === 'PENDING')) {
    return 'WACHT_OP_BESTELLING'
  }
  if (statuses.some((s) => YELLOW_STATUSES.includes(s))) {
    return 'BESTELD'
  }
  if (statuses.every((s) => GREEN_STATUSES.includes(s))) {
    return 'BINNEN'
  }
  return statuses[0]
}

/**
 * Kleur voor onderdelen-statusbal (zelfde als planning).
 * Rood #ef4444, Geel #eab308, Groen #16a34a.
 */
export function getPartsStatusDotColor(status?: string | null): string {
  if (!status) return '#ef4444'
  const s = status.trim().toUpperCase()
  if (GREEN_STATUSES.includes(s)) return '#16a34a'
  if (YELLOW_STATUSES.includes(s)) return '#eab308'
  return '#ef4444'
}

/**
 * Tekst naast onderdelen-statusbal (zelfde als planning).
 */
export function getPartsStatusDotLabel(status?: string | null): string {
  if (!status) return 'Rood: onderdelen nodig'
  const s = status.trim().toUpperCase()
  if (GREEN_STATUSES.includes(s)) return 'Groen: onderdelen binnen'
  if (YELLOW_STATUSES.includes(s)) return 'Geel: onderdelen in behandeling'
  return 'Rood: onderdelen nodig'
}

/**
 * Get human-readable label for parts status (legacy; gebruik getPartsStatusDotLabel voor weergave).
 */
export function getPartsStatusLabel(status?: string | null): string {
  return getPartsStatusDotLabel(status)
}

/**
 * Get color class for parts status (Tailwind CSS)
 */
export function getPartsStatusColor(status?: string | null): string {
  if (!status) return 'text-red-600 font-semibold'
  const s = status.trim().toUpperCase()
  if (GREEN_STATUSES.includes(s)) return 'text-green-600 font-semibold'
  if (YELLOW_STATUSES.includes(s)) return 'text-yellow-600'
  return 'text-red-600 font-semibold'
}

/**
 * Get badge color for parts status (Tailwind CSS)
 */
export function getPartsStatusBadgeColor(status?: string | null): string {
  if (!status) return 'bg-slate-100 text-slate-600'
  const s = status.trim().toUpperCase()
  if (GREEN_STATUSES.includes(s)) return 'bg-green-100 text-green-800'
  if (YELLOW_STATUSES.includes(s)) return 'bg-yellow-100 text-yellow-800'
  return 'bg-red-100 text-red-800'
}
