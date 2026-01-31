export type Customer = {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  mobile?: string | null
  fax?: string | null
  company?: string | null
  contact?: string | null
  address?: string | null
  street?: string | null
  zipCode?: string | null
  city?: string | null
  countryId?: string | null
  customerNumber?: string | null
  displayName?: string | null
  emailDestinations?: string | null
  branchId?: string | null
  extra1?: string | null
  externalId?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  vehicles?: Vehicle[]
}

export type Vehicle = {
  id: string
  customerId?: string | null
  licensePlate?: string | null
  brand?: string | null
  model?: string | null
  make?: string | null
  year?: number | null
  color?: string | null
  vin?: string | null
  mileage?: number | null
  apkDueDate?: string | null
}

export const COLUMN_OPTIONS = [
  { key: 'externalId', label: 'Klant ID', defaultWidth: 120 },
  { key: 'name', label: 'Naam', defaultWidth: 200 },
  { key: 'company', label: 'Bedrijf', defaultWidth: 180 },
  { key: 'email', label: 'Email', defaultWidth: 200 },
  { key: 'phone', label: 'Telefoon', defaultWidth: 130 },
  { key: 'mobile', label: 'Mobiel', defaultWidth: 130 },
  { key: 'address', label: 'Adres', defaultWidth: 250 },
  { key: 'city', label: 'Plaats', defaultWidth: 150 },
  { key: 'zipCode', label: 'Postcode', defaultWidth: 100 },
  { key: 'customerNumber', label: 'Klantnummer', defaultWidth: 120 },
  { key: 'contact', label: 'Contactpersoon', defaultWidth: 180 },
  { key: 'vehicles', label: "Auto's", defaultWidth: 150 },
  { key: 'createdAt', label: 'Aangemaakt', defaultWidth: 150 }
]
