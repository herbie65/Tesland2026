import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { licensePlate, email } = body

    if (!licensePlate) {
      return NextResponse.json(
        { success: false, error: 'licensePlate is required' },
        { status: 400 }
      )
    }

    // Normalize license plate: remove spaces, dashes, and convert to uppercase
    const normalizedPlate = licensePlate.replace(/[\s-]/g, '').toUpperCase()

    // Find vehicle by license plate with normalized comparison
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        OR: [
          // Exact match (case insensitive)
          {
            licensePlate: {
              equals: licensePlate,
              mode: 'insensitive'
            }
          },
          // Normalized match (without spaces/dashes)
          {
            licensePlate: {
              contains: normalizedPlate,
              mode: 'insensitive'
            }
          }
        ]
      },
      include: {
        customer: true
      }
    })

    // If no vehicle found with contains, try to find any plate that matches when normalized
    let finalVehicle = vehicle
    if (!finalVehicle) {
      const allVehicles = await prisma.vehicle.findMany({
        include: {
          customer: true
        }
      })
      
      finalVehicle = allVehicles.find(v => {
        if (!v.licensePlate) return false
        const dbPlateNormalized = v.licensePlate.replace(/[\s-]/g, '').toUpperCase()
        return dbPlateNormalized === normalizedPlate
      }) || null
    }

    // If vehicle doesn't exist
    if (!finalVehicle) {
      return NextResponse.json({
        success: true,
        match: false,
        plateExists: false
      })
    }

    // If only checking plate (no email provided)
    if (!email) {
      return NextResponse.json({
        success: true,
        plateExists: true,
        vehicle: {
          id: finalVehicle.id,
          licensePlate: finalVehicle.licensePlate,
          brand: finalVehicle.make || '',
          model: finalVehicle.model || '',
          color: finalVehicle.color || null
        },
        customer: finalVehicle.customer ? {
          id: finalVehicle.customer.id,
          name: finalVehicle.customer.name,
          email: finalVehicle.customer.email || '',
          phone: finalVehicle.customer.phone || ''
        } : undefined
      })
    }

    // If email is provided, check if it matches the customer
    if (!finalVehicle.customer) {
      return NextResponse.json({
        success: true,
        match: false,
        plateExists: true,
        vehicle: {
          id: finalVehicle.id,
          licensePlate: finalVehicle.licensePlate,
          brand: finalVehicle.make || '',
          model: finalVehicle.model || '',
          color: finalVehicle.color || null
        }
      })
    }

    // Check email match (case insensitive)
    const emailMatch = finalVehicle.customer.email?.toLowerCase() === email.toLowerCase()

    return NextResponse.json({
      success: true,
      match: emailMatch,
      plateExists: true,
      vehicle: {
        id: finalVehicle.id,
        licensePlate: finalVehicle.licensePlate,
        brand: finalVehicle.make || '',
        model: finalVehicle.model || '',
        color: finalVehicle.color || null
      },
      customer: emailMatch ? {
        id: finalVehicle.customer.id,
        name: finalVehicle.customer.name,
        email: finalVehicle.customer.email || '',
        phone: finalVehicle.customer.phone || ''
      } : undefined
    })

  } catch (error: any) {
    console.error('Error in lookup:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
