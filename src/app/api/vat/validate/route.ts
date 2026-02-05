/**
 * API endpoint for VIES VAT number validation
 * POST /api/vat/validate
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  checkViesVatNumber, 
  validateVatNumberFormat,
  formatVatNumber 
} from '@/lib/vies-validator'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { vatNumber, customerId } = body

    if (!vatNumber) {
      return NextResponse.json(
        { success: false, error: 'VAT number is required' },
        { status: 400 }
      )
    }

    // Step 1: Format validation
    const formatCheck = validateVatNumberFormat(vatNumber)
    if (!formatCheck.valid) {
      return NextResponse.json({
        success: false,
        valid: false,
        error: formatCheck.error,
        formatted: null
      })
    }

    // Step 2: VIES check
    console.log(`🔍 Checking VAT number with VIES: ${vatNumber}`)
    const viesResult = await checkViesVatNumber(vatNumber)

    // Step 3: Update customer if customerId provided
    if (customerId && viesResult.valid) {
      await prisma.customer.update({
        where: { id: customerId },
        data: {
          vatNumber: formatVatNumber(vatNumber),
          vatNumberValidated: true,
          vatNumberValidatedAt: viesResult.validatedAt,
          isBusinessCustomer: true
        }
      })
      console.log(`✅ Customer ${customerId} updated with validated VAT number`)
    }

    return NextResponse.json({
      success: true,
      valid: viesResult.valid,
      formatted: formatVatNumber(vatNumber),
      countryCode: formatCheck.countryCode,
      companyName: viesResult.companyName,
      companyAddress: viesResult.companyAddress,
      validatedAt: viesResult.validatedAt,
      error: viesResult.error
    })

  } catch (error: any) {
    console.error('VAT validation error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
