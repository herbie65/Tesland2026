import OrdersClient from './OrdersClient'

export default function OrdersPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Bestellingen</h1>
        <p className="text-slate-600">Beheer bestellingen en status.</p>
      </header>
      <OrdersClient />
    </div>
  )
}
