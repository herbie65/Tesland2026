import PlanningClient from './PlanningClient'

export default function PlanningPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Planning</h1>
        <p className="text-slate-600">Beheer planning items en houd status bij.</p>
      </header>
      <PlanningClient />
    </div>
  )
}
