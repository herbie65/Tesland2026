/**
 * Parts Status Helper
 * 
 * Calculate parts status directly from parts lines.
 * Used across all views (magazijn, werkorders, planning, etc.)
 */

export type PartsLine = {
  id: string
  status?: string | null
  productName?: string | null
  quantity?: number | null
}

/**
 * Calculate the overall parts status from an array of parts lines
 * Returns the "worst" status (highest priority = needs most attention)
 */
export function calculatePartsStatus(partsLines?: PartsLine[]): string | null {
  if (!partsLines || partsLines.length === 0) {
    return null
  }

  const statuses = partsLines.map(p => p.status).filter(Boolean) as string[]
  
  if (statuses.length === 0) {
    return null
  }

  // Priority order (worst to best):
  // 1. WACHT_OP_BESTELLING / SPECIAAL - needs immediate action!
  // 2. BESTELD - ordered but not arrived
  // 3. ONDERWEG - on the way
  // 4. BINNEN / ONTVANGEN / KLAAR - ready states
  
  if (statuses.some(s => s === 'WACHT_OP_BESTELLING' || s === 'SPECIAAL')) {
    return 'WACHT_OP_BESTELLING'
  }
  
  if (statuses.some(s => s === 'BESTELD')) {
    return 'BESTELD'
  }
  
  if (statuses.some(s => s === 'ONDERWEG')) {
    return 'ONDERWEG'
  }
  
  // If ALL parts are in ready state
  if (statuses.every(s => 
    s === 'BINNEN' || 
    s === 'ONTVANGEN' || 
    s === 'KLAAR' || 
    s === 'BESCHIKBAAR' || 
    s === 'KLAARGELEGD'
  )) {
    return 'BINNEN'
  }
  
  // Fallback: return first status
  return statuses[0]
}

/**
 * Get human-readable label for parts status
 */
export function getPartsStatusLabel(status?: string | null): string {
  const labels: Record<string, string> = {
    'WACHT_OP_BESTELLING': 'Wacht op bestelling',
    'BESTELD': 'Besteld',
    'ONDERWEG': 'Onderweg',
    'KLAAR': 'Klaar',
    'BINNEN': 'Binnen',
    'ONTVANGEN': 'Ontvangen',
    'BESCHIKBAAR': 'Beschikbaar',
    'KLAARGELEGD': 'Klaargelegd',
    'SPECIAAL': 'Speciaal bestelling'
  }
  return labels[status || ''] || status || '-'
}

/**
 * Get color class for parts status (Tailwind CSS)
 */
export function getPartsStatusColor(status?: string | null): string {
  if (!status) return 'text-slate-400'
  
  if (status === 'WACHT_OP_BESTELLING' || status === 'SPECIAAL') {
    return 'text-orange-600 font-semibold'
  }
  
  if (status === 'BESTELD') {
    return 'text-blue-600'
  }
  
  if (status === 'ONDERWEG') {
    return 'text-purple-600'
  }
  
  if (status === 'BINNEN' || status === 'ONTVANGEN' || status === 'KLAAR') {
    return 'text-green-600 font-semibold'
  }
  
  return 'text-slate-600'
}

/**
 * Get badge color for parts status
 */
export function getPartsStatusBadgeColor(status?: string | null): string {
  if (!status) return 'bg-slate-100 text-slate-600'
  
  if (status === 'WACHT_OP_BESTELLING' || status === 'SPECIAAL') {
    return 'bg-orange-100 text-orange-800'
  }
  
  if (status === 'BESTELD') {
    return 'bg-blue-100 text-blue-800'
  }
  
  if (status === 'ONDERWEG') {
    return 'bg-purple-100 text-purple-800'
  }
  
  if (status === 'BINNEN' || status === 'ONTVANGEN' || status === 'KLAAR') {
    return 'bg-green-100 text-green-800'
  }
  
  return 'bg-slate-100 text-slate-600'
}
