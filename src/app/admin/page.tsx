import Link from 'next/link'

const cards = [
  { title: 'Planning', href: '/admin/planning', description: 'Plan afspraken en werkbonnen.' },
  { title: 'Klanten', href: '/admin/customers', description: 'Beheer klantgegevens.' },
  { title: 'Voertuigen', href: '/admin/vehicles', description: 'Koppel voertuigen en eigenaars.' },
  { title: 'Producten', href: '/admin/products', description: 'Beheer het assortiment.' },
  { title: 'Magazijn', href: '/admin/magazijn', description: 'Onderdelen en picklist.' },
  { title: 'Orders', href: '/admin/orders', description: 'Opdrachten en statusbeheer.' },
  { title: 'Import', href: '/admin/import', description: 'Importeer CSV data.' },
  { title: 'Instellingen', href: '/admin/settings', description: 'Basisconfiguratie.' }
]

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900">Dashboard</h2>
        <p className="text-slate-600">
          Start met de belangrijkste modules of werk je instellingen bij.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm transition hover:bg-white"
          >
            <h3 className="text-lg font-semibold text-slate-900">{card.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{card.description}</p>
          </Link>
        ))}
      </section>
    </div>
  )
}
