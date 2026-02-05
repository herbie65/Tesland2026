import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/app/components/SiteFooter'
import ShopClient from './ShopClient'

export default async function ShopPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return (
    <div className="public-site min-h-screen bg-[#111] text-slate-900">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="rounded-2xl bg-slate-50 p-6">
          <ShopClient locale={locale} />
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

