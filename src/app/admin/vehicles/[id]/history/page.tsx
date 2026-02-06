import VehicleHistoryClient from './VehicleHistoryClient'

type PageProps = {
  params: { id?: string } | Promise<{ id?: string }>
}

export default async function VehicleHistoryPage({ params }: PageProps) {
  const resolved = await params
  const vehicleId = resolved?.id
  return (
    <div className="space-y-4">
      <VehicleHistoryClient vehicleId={vehicleId || ''} />
    </div>
  )
}
