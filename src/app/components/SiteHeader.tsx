export default function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Tesland</p>
          <h1 className="text-lg font-semibold text-slate-900">Werkplaatssoftware</h1>
        </div>
        <nav className="flex items-center gap-4 text-sm text-slate-600">
          <a className="hover:text-slate-900" href="#intro">
            Over Tesland
          </a>
          <a className="hover:text-slate-900" href="#cta">
            Start
          </a>
          <a className="rounded-full bg-slate-900 px-3 py-1 text-white hover:bg-slate-800" href="/admin">
            Admin
          </a>
        </nav>
      </div>
    </header>
  )
}
