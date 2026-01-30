// Helper functions voor uren/dagen conversie
// 1 werkdag = 8 uur

export const HOURS_PER_DAY = 8

/**
 * Converteer uren naar dagen en resterende uren
 * @param hours - Totaal aantal uren
 * @returns Object met dagen en uren
 */
export function hoursToDaysAndHours(hours: number): { days: number; hours: number } {
  const days = Math.floor(hours / HOURS_PER_DAY)
  const remainingHours = hours % HOURS_PER_DAY
  return { days, hours: remainingHours }
}

/**
 * Formatteer uren als "X dagen en Y uur"
 * @param hours - Totaal aantal uren
 * @returns Geformatteerde string
 */
export function formatHoursAsDaysAndHours(hours: number): string {
  if (hours === 0) return '0 uur'
  
  const { days, hours: remainingHours } = hoursToDaysAndHours(hours)
  
  const parts: string[] = []
  
  if (days > 0) {
    parts.push(`${days} ${days === 1 ? 'dag' : 'dagen'}`)
  }
  
  if (remainingHours > 0) {
    // Toon decimalen als het niet een heel getal is
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
