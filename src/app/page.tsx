import type { CSSProperties } from 'react'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
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
  const data = await response.json()
  if (!response.ok || !data.success) {
    notFound()
  }

  const page = data.item as PageDoc
  const blocks = Array.isArray(page.blocks) ? page.blocks : []
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
        {blocks.map((block, index) => {
          if (block.type === 'hero') {
            return (
              <section
                key={`hero-${index}`}
                className="rounded-2xl border border-slate-200 bg-white p-10 shadow-sm"
                style={
                  block.backgroundImage
                    ? {
                        backgroundImage: `linear-gradient(120deg, rgba(255,255,255,0.9), rgba(255,255,255,0.95)), url("${block.backgroundImage}")`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }
                    : undefined
                }
              >
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {page.title || 'Tesland'}
                </p>
                <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
                  {block.headline}
                </h2>
                {block.subheadline ? (
                  <p className="mt-3 max-w-2xl text-lg text-slate-600">{block.subheadline}</p>
                ) : null}
                {block.ctaText && block.ctaLink ? (
                  <a
                    className="accent-bg mt-6 inline-flex rounded-full px-4 py-2 text-sm font-semibold text-slate-900"
                    href={block.ctaLink}
                  >
                    {block.ctaText}
                  </a>
                ) : null}
              </section>
            )
          }

          if (block.type === 'introText') {
            return (
              <section
                key={`intro-${index}`}
                id="intro"
                className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
              >
                <h3 className="text-2xl font-semibold">{block.heading}</h3>
                <div className="mt-4 space-y-4 text-slate-600">
                  {renderParagraphs(block.body).map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            )
          }

          if (block.type === 'ctaBanner') {
            return (
              <section
                key={`cta-${index}`}
                id="cta"
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
              >
                <p className="text-lg font-semibold text-slate-900">{block.text}</p>
                {block.buttonText && block.buttonLink ? (
                  <a
                    className="accent-bg rounded-full px-4 py-2 text-sm font-semibold text-slate-900"
                    href={block.buttonLink}
                  >
                    {block.buttonText}
                  </a>
                ) : null}
              </section>
            )
          }

          return null
        })}
      </main>
      <SiteFooter />
    </div>
  )
}
