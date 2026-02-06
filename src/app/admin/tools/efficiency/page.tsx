import EfficiencyClient from './EfficiencyClient'

export default function EfficiencyPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Efficiëntie werkplaats</h1>
      <p className="text-sm text-slate-600">
        Geplande vs. werkelijke uren en benutting van beschikbare tijd (bijv. 8 uur per dag).
      </p>
      <EfficiencyClient />
    </div>
  )
}
