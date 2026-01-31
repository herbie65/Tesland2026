export type Customer = {
  id: string
  name: string
  company?: string | null
  email?: string | null
  phone?: string | null
  mobile?: string | null
}

export type Vehicle = {
  id: string
  customerId?: string | null
  make?: string | null
  model?: string | null
  licensePlate?: string | null
  vin?: string | null
  color?: string | null
  year?: number | null
  mileage?: number | null
  apkDueDate?: string | null
  constructionDate?: string | null
  isHistory?: boolean | null
  deleted?: boolean | null
  externalId?: string | null
  notes?: string | null
  rdwData?: any
  createdAt?: string | null
  updatedAt?: string | null
  customer?: {
    id: string
    name: string
  } | null
  // RDW fields (flattened from rdwData)
  rdwColor?: string | null
  rdwVehicleType?: string | null
  rdwEngineCode?: string | null
  rdwBuildYear?: number | null
  rdwRegistrationDatePart1?: string | null
  rdwOwnerSince?: string | null
  rdwOwnerCount?: number | null
  rdwApkDueDate?: string | null
  rdwOdometer?: number | null
  rdwOdometerJudgement?: string | null
  rdwFuelType?: string | null
  rdwEmptyWeight?: number | null
  rdwMaxTowWeightBraked?: number | null
  rdwMaxTowWeightUnbraked?: number | null
  rdwMaxMass?: number | null
}

export const COLUMN_OPTIONS = [
  { key: 'make', label: 'Merk', defaultWidth: 150 },
  { key: 'model', label: 'Model', defaultWidth: 150 },
  { key: 'licensePlate', label: 'Kenteken', defaultWidth: 120 },
  { key: 'vin', label: 'VIN', defaultWidth: 180 },
  { key: 'customer', label: 'Klant', defaultWidth: 180 },
  { key: 'year', label: 'Bouwjaar', defaultWidth: 100 },
  { key: 'color', label: 'Kleur', defaultWidth: 120 },
  { key: 'mileage', label: 'Kilometerstand', defaultWidth: 150 },
  { key: 'apkDueDate', label: 'APK Vervaldatum', defaultWidth: 150 },
  { key: 'constructionDate', label: 'Bouwdatum', defaultWidth: 130 },
  { key: 'notes', label: 'Notities', defaultWidth: 200 },
  { key: 'createdAt', label: 'Aangemaakt', defaultWidth: 150 }
]
