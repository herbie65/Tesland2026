import type { CSSProperties } from 'react'
import { headers } from 'next/headers'
import SiteHeader from './components/SiteHeader'
import SiteFooter from './components/SiteFooter'

type PageBlock =
  | {
      type: 'hero'
      headline: string
      subheadline?: string
      ctaText?: string
      ctaLink?: string
      backgroundImage?: string
    }
  | {
      type: 'introText'
      heading: string
      body: string
    }
  | {
      type: 'ctaBanner'
      text: string
      buttonText?: string
      buttonLink?: string
    }

type PageDoc = {
  id: string
  title?: string | null
  status?: string | null
  seo?: {
    metaTitle?: string
    metaDescription?: string
  }
  blocks?: PageBlock[]
}

const renderParagraphs = (value: string) =>
  value
    .split(/\n\n+/g)
    .map((part) => part.trim())
    .filter(Boolean)

export default async function Home() {
  const headerList = await headers()
  const host = headerList.get('host') || 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'

  const response = await fetch(`${protocol}://${host}/api/public/pages/_home`, { cache: 'no-store' })
  const data = await response.json().catch(() => null)
  const page = data?.success ? (data.item as PageDoc) : null
  const featureCards = [
    {
      title: 'Snelle Service',
      description: 'Onze monteurs staan altijd voor je klaar. Snel, vakkundig en betrouwbaar.',
      image: '/media/wysiwyg/service.png',
      alt: 'Snelle Service',
      link: '/nl/tesla-onderhoud',
      accent: 'orange',
      buttonLabel: 'Onderhoud'
    },
    {
      title: 'Comfort & Duurzaamheid',
      description:
        'Geniet van gratis koffie, wifi en een ontspannen sfeer. Wij zijn energiepositief en duurzaam.',
      image: '/media/wysiwyg/wacht.png',
      alt: 'Comfort & Duurzaamheid',
      link: '/nl/pand',
      accent: 'green',
      buttonLabel: 'Kijk bij ons binnen'
    },
    {
      title: 'Accessoires & Onderdelen',
      description: 'Het grootste assortiment Tesla accessoires. Snel leverbaar en altijd op voorraad.',
      image: '/media/wysiwyg/snel.png',
      alt: 'Accessoires & Onderdelen',
      link: '/nl/accessoires',
      accent: 'orange',
      buttonLabel: 'Bekijk accessoires'
    }
  ]
  const modelTiles = [
    { title: 'Model S', href: '/accessoires/model-s/', image: '/media/wysiwyg/TL-MS.png' },
    { title: 'Model 3', href: '/accessoires/model-3/', image: '/media/wysiwyg/TL-M3.png' },
    { title: 'Model X', href: '/accessoires/model-x/', image: '/media/wysiwyg/TL-MX.png' },
    { title: 'Model Y', href: '/accessoires/model-y/', image: '/media/wysiwyg/TL-MY.png' }
  ]
  const uspItems = [
    {
      title: 'BOVAG & RDW',
      subtitle: 'Erkende kwaliteit',
      description: 'en betrouwbaarheid'
    },
    {
      title: 'Tesla-specialisten',
      subtitle: 'Ervaren team',
      description: 'volledig getraind'
    },
    {
      title: 'Snelle service',
      subtitle: 'Minimale wachttijd',
      description: 'maximale inzet'
    },
    {
      title: 'Koffie & wifi',
      subtitle: 'Relaxte wachtruimte',
      description: 'met zicht op je auto'
    }
  ]

  return (
    <div className="public-site min-h-screen bg-[#111] text-slate-900">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-16">
        <section className="relative left-1/2 right-1/2 -mx-[50vw] h-[45vw] max-h-[480px] w-screen overflow-hidden rounded-[32px]">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="h-full w-screen object-cover"
          >
            <source src="/branding/Tesland_Hero.mp4" type="video/mp4" />
            Your browser does not support video playback.
          </video>
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[linear-gradient(120deg,rgba(17,17,17,0.15),rgba(24,24,24,0.25)_80%)] px-[5vw] text-center">
            <h1 className="mb-3 max-w-[90vw] text-[clamp(24px,4vw,36px)] font-extrabold text-white shadow-[0_4px_24px_rgba(0,0,0,0.67)]">
              DÉ TESLA SPECIALIST VAN NEDERLAND
            </h1>
            <p className="mb-6 max-w-[85vw] text-[clamp(14px,2.5vw,20px)] text-white shadow-[0_2px_8px_rgba(0,0,0,0.67)]">
              Voor onderhoud, accessoires en service aan jouw Tesla
            </p>
            <a
              href="/planning"
              className="inline-flex items-center justify-center rounded-[28px] bg-gradient-to-r from-[#e45b25] to-[#8bc342] px-8 py-3 text-[clamp(16px,3vw,20px)] font-bold tracking-[0.5px] text-white shadow-[0_0_22px_rgba(228,91,37,0.45)] transition-all duration-200 hover:scale-[1.06] hover:from-[#8bc342] hover:to-[#e45b25] hover:text-[#181818] hover:shadow-[0_0_32px_rgba(139,195,66,0.6),0_0_18px_rgba(228,91,37,0.7)]"
            >
              Plan direct een afspraak
            </a>
          </div>
        </section>
        <section className="relative left-1/2 right-1/2 -mx-[50vw] w-screen bg-[#111] py-10">
          <div className="mx-auto flex max-w-[1920px] flex-wrap justify-center gap-[2vw] px-6">
            {featureCards.map((card) => {
              const isGreen = card.accent === 'green'
              const accentColor = isGreen ? '#8bc342' : '#e45b25'
              const hoverColor = isGreen ? '#e45b25' : '#8bc342'
              return (
                <div
                  key={card.title}
                  className="flex min-w-[220px] flex-1 rounded-[24px] bg-[#222] px-6 py-8 text-center shadow-[0_8px_28px_rgba(17,17,17,0.12)]"
                  style={
                    {
                      maxWidth: 400,
                      boxShadow: `0 12px 30px rgba(17,17,17,0.14), 0 0 20px ${accentColor}55`
                    } as CSSProperties
                  }
                >
                  <div className="flex w-full flex-col items-center">
                    <div
                      className="mb-[18px] h-[180px] w-[180px] overflow-hidden rounded-[24px] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.2)] transition-all duration-300 ease-in-out hover:-translate-y-2 hover:scale-105 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
                      role="presentation"
                    >
                      <img src={card.image} alt={card.alt} className="h-full w-full object-cover" />
                    </div>
                    <h2 className="mb-2 text-[1.3em] font-bold" style={{ color: accentColor }}>
                      {card.title}
                    </h2>
                    <p className="text-white">{card.description}</p>
                    <a
                      href={card.link}
                      className={`mt-3 inline-flex items-center justify-center rounded-[16px] px-4 py-2 text-[0.9em] text-white transition-all duration-200 ${
                        isGreen
                          ? 'bg-[#8bc342] shadow-[0_0_16px_rgba(139,195,66,0.7)] hover:bg-[#e45b25] hover:shadow-[0_0_22px_rgba(228,91,37,0.7)]'
                          : 'bg-[#e45b25] shadow-[0_0_16px_rgba(228,91,37,0.7)] hover:bg-[#8bc342] hover:shadow-[0_0_22px_rgba(139,195,66,0.7)]'
                      }`}
                    >
                      {card.buttonLabel}
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
        <section className="relative left-1/2 right-1/2 -mx-[50vw] w-screen bg-[#111] py-16">
          <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-10 px-6">
            <h2 className="text-center text-[clamp(24px,3vw,36px)] font-bold text-[#8bc342]">
              Populaire Tesla Modellen
            </h2>
            <div className="flex flex-wrap justify-center gap-6">
              {modelTiles.map((tile) => (
                <a
                  key={tile.title}
                  href={tile.href}
                  className="flex min-w-[220px] flex-1 flex-col items-center rounded-[24px] border border-[#8bc342] bg-[#cccccc] px-6 py-8 text-center text-[#111] shadow-[0_0_12px_rgba(139,195,66,0.4)] transition-all duration-300 ease-in-out hover:-translate-y-1.5 hover:shadow-[0_0_24px_rgba(139,195,66,0.8),0_12px_32px_rgba(0,0,0,0.15)]"
                  style={{ maxWidth: 360 }}
                >
                  <img src={tile.image} alt={tile.title} className="mb-5 h-[50px] w-auto" />
                  <h3 className="mb-2 font-bold text-[#333]">{tile.title}</h3>
                  <span className="mt-4 inline-flex items-center justify-center rounded-[24px] bg-gradient-to-r from-[#27ae60] to-[#f39c12] px-6 py-2 text-sm font-bold text-white transition-colors duration-200 hover:bg-[#e45b25]">
                    Bekijk
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>
        <section className="relative left-1/2 right-1/2 -mx-[50vw] w-screen bg-[#181818] py-16">
          <div className="mx-auto w-full max-w-[1200px] px-6 text-center">
            <h2 className="mb-5 text-[clamp(24px,3vw,36px)] font-bold text-[#8bc342]">
              Over Tesland
            </h2>
            <p className="mb-8 text-[clamp(16px,2vw,18px)] leading-relaxed text-[#ccc]">
              Tesland is de onafhankelijke Tesla-specialist voor onderhoud, accessoires en service.
              Sinds 2015 helpen wij duizenden Tesla-rijders uit binnen- en buitenland om hun auto in
              topconditie te houden. Onze moderne werkplaats is volledig ingericht op Tesla’s – met
              gecertificeerde specialisten, originele én hoogwaardige after-market onderdelen, en
              korte wachttijden. Of het nu gaat om een APK, bandenservice of technische upgrade: wij
              staan voor je klaar. In Augustus 2025 is Tesland uitgeroepen tot finalist: "BOVAG
              Onafhankelijk Autobedrijf van het 2025"
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-5">
              {uspItems.map((item) => (
                <div
                  key={item.title}
                  className="flex w-full max-w-[260px] flex-1 flex-col items-center rounded-[24px] bg-[#222] px-6 py-6 text-center shadow-[0_0_12px_rgba(139,195,66,0.53)] transition-all duration-300 ease-in-out"
                >
                  <h3 className="mb-2 text-base font-semibold text-[#e45b25]">{item.title}</h3>
                  <p className="text-sm text-[#8bc342]">
                    <strong>{item.subtitle}</strong>
                    <br />
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="relative left-1/2 right-1/2 -mx-[50vw] w-screen bg-[#7cc122] py-10">
          <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-6 px-6">
            <div className="flex items-center gap-4">
              <img
                src="/branding/logo_tesland_white.png"
                alt="Tesland"
                className="h-12 w-auto"
              />
              <p className="text-lg font-semibold text-white">
                Schrijf je in voor onze nieuwsbrief
              </p>
            </div>
            <form className="flex w-full max-w-md items-center gap-3 sm:w-auto">
              <label className="sr-only" htmlFor="newsletter-email">
                E-mailadres
              </label>
              <input
                id="newsletter-email"
                type="email"
                placeholder="Voer uw e-mailadres in"
                className="w-full flex-1 rounded-full border border-white/50 bg-white/10 px-5 py-2 text-sm text-white placeholder-white/80 focus:border-white focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center rounded-full border border-white/70 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Meld je aan
              </button>
            </form>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
