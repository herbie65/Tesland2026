import { prisma } from '../src/lib/prisma'

async function main() {
  const allVehicles = await prisma.vehicle.findMany({
    select: { licensePlate: true, rdwData: true }
  })
  
  const withPlate = allVehicles.filter(v => v.licensePlate && v.licensePlate.trim().length > 0)
  const withRdw = withPlate.filter(v => v.rdwData !== null)
  const withoutRdw = withPlate.filter(v => v.rdwData === null)
  
  console.log(`Total vehicles: ${allVehicles.length}`)
  console.log(`With license plate: ${withPlate.length}`)
  console.log(`With RDW data: ${withRdw.length}`)
  console.log(`Without RDW data: ${withoutRdw.length}`)
  console.log(`\nPercentage with RDW: ${((withRdw.length / withPlate.length) * 100).toFixed(1)}%`)
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
