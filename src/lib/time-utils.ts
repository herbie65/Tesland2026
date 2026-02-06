// Helper functions voor uren/dagen conversie
// 1 werkdag = 8 uur

export const HOURS_PER_DAY = 8

/**
 * Converteer uren naar dagen en resterende uren
 * @param hours - Totaal aantal uren
 * @param hoursPerDay - Uren per werkdag (default 8)
 * @returns Object met dagen en uren
 */
export function hoursToDaysAndHours(hours: number, hoursPerDay: number = HOURS_PER_DAY): { days: number; hours: number } {
  const hpd = hoursPerDay > 0 ? hoursPerDay : HOURS_PER_DAY
  const days = Math.floor(hours / hpd)
  const remainingHours = hours % hpd
  return { days, hours: remainingHours }
}

/**
 * Formatteer uren als "X dagen en Y uur"
 * @param hours - Totaal aantal uren
 * @param hoursPerDay - Uren per werkdag voor conversie (default 8)
 * @returns Geformatteerde string
 */
export function formatHoursAsDaysAndHours(hours: number, hoursPerDay: number = HOURS_PER_DAY): string {
  if (hours === 0) return '0 uur'
  const hpd = hoursPerDay > 0 ? hoursPerDay : HOURS_PER_DAY
  const { days, hours: remainingHours } = hoursToDaysAndHours(hours, hpd)

  const parts: string[] = []

  if (days > 0) {
    parts.push(`${days} ${days === 1 ? 'dag' : 'dagen'}`)
  }

  if (remainingHours > 0) {
    const formattedHours = remainingHours % 1 === 0
      ? remainingHours.toString()
      : remainingHours.toFixed(1)
    parts.push(`${formattedHours} uur`)
  }

  if (parts.length === 0) return '0 uur'

  return parts.join(' en ')
}

/**
 * Converteer dagen naar uren
 * @param days - Aantal dagen
 * @returns Aantal uren
 */
export function daysToHours(days: number): number {
  return days * HOURS_PER_DAY
}

/**
 * Formatteer decimale dagen als "X dagen en Y uur" (bijv. 3.69 → "3 dagen en 5,52 uur" bij 8 uur/dag)
 */
export function formatDecimalDaysAsDaysAndHours(decimalDays: number, hoursPerDay: number): string {
  if (!Number.isFinite(decimalDays) || decimalDays <= 0) return '0 uur'
  const d = Math.floor(decimalDays)
  const remainderHours = (decimalDays % 1) * hoursPerDay
  const parts: string[] = []
  if (d > 0) parts.push(`${d} ${d === 1 ? 'dag' : 'dagen'}`)
  if (remainderHours > 0) {
    const h = remainderHours % 1 === 0 ? remainderHours.toString() : remainderHours.toFixed(2)
    parts.push(`${h} uur`)
  }
  return parts.length ? parts.join(' en ') : '0 uur'
}

/**
 * Formatteer verlof saldo voor display
 * Toont altijd in dagen en uren format
 */
export function formatLeaveBalance(hours: number): string {
  return formatHoursAsDaysAndHours(hours)
}

/**
 * Parse een string zoals "3 dagen en 2 uur" terug naar uren
 */
export function parseDaysAndHoursToHours(daysStr: string, hoursStr: string): number {
  const days = parseFloat(daysStr) || 0
  const hours = parseFloat(hoursStr) || 0
  return (days * HOURS_PER_DAY) + hours
}
