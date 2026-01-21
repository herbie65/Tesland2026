import { headers } from 'next/headers'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'

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

const localeMessages = {
  nl: {
    title: 'Pagina in opbouw',
    body: 'We bouwen deze pagina nog uit. Binnenkort vind je hier alle informatie.'
  },
  en: {
    title: 'Page coming soon',
    body: 'We are still building this page. Check back soon for more information.'
  },
  de: {
    title: 'Seite im Aufbau',
    body: 'Diese Seite wird noch aufgebaut. Schauen Sie bald wieder vorbei.'
  }
}

const renderParagraphs = (value: string) =>
  value
    .split(/\n\n+/g)
    .map((part) => part.trim())
    .filter(Boolean)

const getLocale = (segments: string[]) => {
  const candidate = segments[0]?.toLowerCase()
  if (candidate === 'nl' || candidate === 'en' || candidate === 'de') {
    return candidate
  }
  return 'nl'
}

const fetchPage = async (slug: string) => {
  const headerList = await headers()
  const host = headerList.get('host') || 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'

  const response = await fetch(`${protocol}://${host}/api/public/pages/${encodeURIComponent(slug)}`, {
    cache: 'no-store'
  })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.success) {
    return null
  }
  return data.item as PageDoc
}

export default async function PublicPage({ params }: { params: { slug: string[] } }) {
  const segments = Array.isArray(params.slug) ? params.slug : []
  const path = `/${segments.join('/')}`
  const locale = getLocale(segments)
  const messages = localeMessages[locale] || localeMessages.nl

  const slugCandidate = segments[segments.length - 1]
  const page = slugCandidate ? await fetchPage(slugCandidate) : null
  const blocks = Array.isArray(page?.blocks) ? page.blocks : []

  return (
    <div className="public-site min-h-screen bg-slate-50 text-slate-900">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-16">
        {page ? (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                {page.title || 'Tesland'}
              </p>
              <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
                {page.seo?.metaTitle || page.title || 'Tesland'}
              </h2>
              {page.seo?.metaDescription ? (
                <p className="mt-3 max-w-2xl text-lg text-slate-600">{page.seo.metaDescription}</p>
              ) : null}
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
                    <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">
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
          </>
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{path}</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{messages.title}</h2>
            <p className="mt-3 max-w-2xl text-lg text-slate-600">{messages.body}</p>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}
