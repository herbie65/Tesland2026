import { prisma } from '@/lib/prisma'
import { getRdwData, mapRdwFields, normalizeRdwPlate } from '@/lib/rdw'

/**
 * Haalt RDW-gegevens op voor een voertuig (o.a. laatst bekende kilometerstand) en werkt het voertuig bij.
 * Wordt o.a. bij aanmaken werkorder aangeroepen zodat "Laatst bekende kilometerstand" beschikbaar is.
 */
export async function fetchRdwAndUpdateVehicle(vehicleId: string): Promise<{ ok: boolean; error?: string }> {
  const existing = await prisma.vehicle.findUnique({ where: { id: vehicleId } })
  if (!existing) return { ok: false, error: 'Vehicle not found' }

  const normalizedPlate = normalizeRdwPlate(existing.licensePlate || '')
  if (!normalizedPlate) return { ok: false, error: 'No license plate' }

  try {
    const rdwResult = await getRdwData(normalizedPlate)
    const baseRecord = Array.isArray(rdwResult.base) ? rdwResult.base[0] : null
    if (!baseRecord) return { ok: false, error: 'Kenteken niet gevonden bij RDW' }

    const mapped = mapRdwFields(baseRecord, rdwResult.fuel)
    const nextBrand = existing.make || baseRecord.merk || null
    const nextModel = existing.model || baseRecord.handelsbenaming || null

    await prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        make: nextBrand,
        model: nextModel,
        licensePlate: normalizedPlate,
        rdwData: baseRecord as any,
        ...mapped
      }
    })
    return { ok: true }
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    console.error('RDW fetch for vehicle failed:', vehicleId, error)
    return { ok: false, error }
  }
}
