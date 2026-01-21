export const isDutchLicensePlate = (plate?: string | null) => {
  if (!plate) return false
  const normalized = plate.trim().toUpperCase().replace(/[^0-9A-Z]/g, "")
  if (!normalized) return false
  return normalized.length === 6
}

export const normalizeLicensePlate = (plate?: string | null) => {
  if (!plate) return ""
  const normalized = plate.trim().toUpperCase().replace(/[^0-9A-Z]/g, "")
  if (normalized.length !== 6) {
    return plate.trim().toUpperCase()
  }

  if (/^[A-Z]{2}[0-9]{2}[A-Z]{2}$/.test(normalized)) {
    return `${normalized.slice(0, 2)}-${normalized.slice(2, 4)}-${normalized.slice(4)}`
  }
  if (/^[0-9]{2}[A-Z]{2}[0-9]{2}$/.test(normalized)) {
    return `${normalized.slice(0, 2)}-${normalized.slice(2, 4)}-${normalized.slice(4)}`
  }
  if (/^[A-Z]{2}[0-9]{4}$/.test(normalized)) {
    return `${normalized.slice(0, 2)}-${normalized.slice(2, 4)}-${normalized.slice(4)}`
  }
  if (/^[0-9]{2}[A-Z]{4}$/.test(normalized)) {
    return `${normalized.slice(0, 2)}-${normalized.slice(2, 4)}-${normalized.slice(4)}`
  }
  if (/^[A-Z][0-9]{3}[A-Z]{2}$/.test(normalized)) {
    return `${normalized.slice(0, 1)}-${normalized.slice(1, 4)}-${normalized.slice(4)}`
  }
  if (/^[A-Z]{2}[0-9]{3}[A-Z]$/.test(normalized)) {
    return `${normalized.slice(0, 2)}-${normalized.slice(2, 5)}-${normalized.slice(5)}`
  }
  if (/^[0-9][A-Z]{3}[0-9]{2}$/.test(normalized)) {
    return `${normalized.slice(0, 1)}-${normalized.slice(1, 4)}-${normalized.slice(4)}`
  }
  if (/^[0-9]{2}[A-Z]{3}[0-9]$/.test(normalized)) {
    return `${normalized.slice(0, 2)}-${normalized.slice(2, 5)}-${normalized.slice(5)}`
  }

  return plate.trim().toUpperCase()
}
