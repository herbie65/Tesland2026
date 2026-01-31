export type WorkOrder = {
  id: string
  workOrderNumber?: string | null
  title: string
  workOrderStatus?: string | null
  scheduledAt?: string | null
  durationMinutes?: number | null
  licensePlate?: string | null
  notes?: string | null
  createdAt?: string | null
  customerName?: string | null
  vehicleLabel?: string | null
  assigneeName?: string | null
  partsSummaryStatus?: string | null
  partsRequired?: boolean | null
  customerApproved?: boolean | null
  pricingMode?: string | null
  priceAmount?: number | null
  estimatedAmount?: number | null
  planningTypeName?: string | null
  planningTypeColor?: string | null
  customer?: {
    id: string
    name: string
    phone?: string | null
    mobile?: string | null
  } | null
}

export type User = {
  id: string
  name?: string | null
  color?: string | null
}

export type Customer = {
  id: string
  name?: string | null
  email?: string | null
  companyName?: string | null
  contactFirstName?: string | null
  contactLastName?: string | null
  postalCode?: string | null
  phone?: string | null
}

export type Vehicle = {
  id: string
  brand?: string | null
  model?: string | null
  licensePlate?: string | null
  customerId?: string | null
}

export type PlanningType = {
  id: string
  name?: string | null
  color?: string | null
}

export type StatusEntry = {
  code: string
  label: string
  sortOrder?: number
}
