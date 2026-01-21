export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-sm text-slate-600">
        <p>© {new Date().getFullYear()} Tesland</p>
        <div className="flex items-center gap-4">
          <a className="hover:text-slate-900" href="/admin">
            Naar admin
          </a>
          <a className="hover:text-slate-900" href="#cta">
            Contact
          </a>
        </div>
      </div>
    </footer>
  )
}
