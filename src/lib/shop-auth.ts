import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, type AuthUser } from '@/lib/auth'

export type CustomerSession = {
  user: AuthUser
  customer: {
    id: string
    name: string
    email: string | null
    phone: string | null
    company: string | null
    street: string | null
    zipCode: string | null
    city: string | null
    address: unknown | null
    // BTW fields
    vatNumber: string | null
    vatNumberValidated: boolean
    isBusinessCustomer: boolean
    vatReversed: boolean
    vatExempt: boolean
    countryId: string | null
  }
}

type AuthError = Error & { status?: number }
const buildAuthError = (message: string, status = 401): AuthError => {
  const err = new Error(message) as AuthError
  err.status = status
  return err
}

export async function requireCustomer(request: NextRequest): Promise<CustomerSession> {
  const user = await requireAuth(request)
  if (!user.customerId) {
    throw buildAuthError('Customer account required', 403)
  }

  const customer = await prisma.customer.findUnique({
    where: { id: user.customerId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      company: true,
      street: true,
      zipCode: true,
      city: true,
      address: true,
      vatNumber: true,
      vatNumberValidated: true,
      isBusinessCustomer: true,
      vatReversed: true,
      vatExempt: true,
      countryId: true
    }
  })

  if (!customer) {
    throw buildAuthError('Customer not found', 403)
  }

  return {
    user,
    customer: {
      ...customer,
      vatNumberValidated: customer.vatNumberValidated === true,
      isBusinessCustomer: customer.isBusinessCustomer === true,
      vatReversed: customer.vatReversed === true,
      vatExempt: customer.vatExempt === true
    }
  }
}

