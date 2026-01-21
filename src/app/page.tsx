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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-16">
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
                    className="mt-6 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
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
                    className="rounded-full bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
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
