'use client'

import { useState } from 'react'
import { copyByLocale, type Locale } from './maintenanceCopy'

export default function MaintenanceContent({ locale }: { locale: Locale }) {
  const copy = copyByLocale[locale]
  const localePrefix = `/${locale}`
  const [ppfOpen, setPpfOpen] = useState(false)

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-6 py-12">
      <section className="flex flex-wrap items-center justify-between gap-8 rounded-3xl bg-gradient-to-r from-[#232323] via-[#232323] to-[#8bc342] p-8">
        <div className="max-w-xl space-y-4">
          <h1 className="text-3xl font-semibold text-[#8bc342] sm:text-4xl">{copy.heroTitle}</h1>
          <p className="text-lg text-white/90">{copy.heroBody}</p>
          <a
            href={`${localePrefix}/planning`}
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#e45b25] to-[#8bc342] px-8 py-3 text-lg font-semibold text-white shadow-[0_4px_24px_rgba(228,91,37,0.53)] transition-all hover:scale-[1.06] hover:from-[#8bc342] hover:to-[#e45b25] hover:text-[#181818] hover:shadow-[0_8px_32px_rgba(139,195,66,0.53),0_0_16px_2px_rgba(228,91,37,0.67)]"
          >
            {copy.heroCta}
          </a>
        </div>
        <img
          src="/media/wysiwyg/hv-rep.jpeg"
          alt="Tesla Service Center"
          className="w-full max-w-sm rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.2)]"
        />
      </section>

      <section className="rounded-2xl bg-[#2d2d2d] p-8 text-white">
        <div className="flex flex-wrap items-start gap-8">
          <img
            src="/media/wysiwyg/apk-logo.jpg"
            alt="APK Keuring"
            className="w-full max-w-[220px] rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
          />
          <div className="flex-1 space-y-4">
            <h2 className="text-2xl font-semibold text-[#8bc342]">{copy.apkTitle}</h2>
            <p className="text-white/90">{copy.apkBody}</p>
            <ul className="list-inside list-disc space-y-2 text-white/90">
              {copy.apkBullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <a
              href={`${localePrefix}/planning`}
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#e45b25] to-[#8bc342] px-8 py-3 text-lg font-semibold text-white shadow-[0_4px_24px_rgba(228,91,37,0.53)] transition-all hover:scale-[1.06] hover:from-[#8bc342] hover:to-[#e45b25] hover:text-[#181818] hover:shadow-[0_8px_32px_rgba(139,195,66,0.53),0_0_16px_2px_rgba(228,91,37,0.67)]"
            >
              {copy.apkCta}
            </a>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-[#232323] p-8 text-white">
        <h2 className="mb-4 text-2xl font-semibold text-[#8bc342]">{copy.whyTitle}</h2>
        <ul className="space-y-2 text-white/90">
          {copy.whyBullets.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-1 text-[#8bc342]">✔</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl bg-[#2d2d2d] p-8 text-white">
        <h2 className="mb-4 text-2xl font-semibold text-[#8bc342]">{copy.checksTitle}</h2>
        <div className="flex flex-wrap items-start gap-8">
          <img
            src="/media/wysiwyg/tesland_airco_cleaning1.jpg"
            alt="Tesla Check"
            className="w-full max-w-[240px] rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
          />
          <div className="flex-1 space-y-4">
            <p>{copy.checksIntro}</p>
            <ul className="list-inside list-disc space-y-2 text-white/90">
              {copy.checksBullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p>{copy.checksOutro}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-[#232323] p-8 text-white">
        <h2 className="mb-4 text-2xl font-semibold text-[#8bc342]">{copy.xpelTitle}</h2>
        <div className="flex flex-wrap items-start gap-8">
          <img
            src="/media/wysiwyg/Tesland_Model3_ppf.JPG"
            alt="Tesla met XPEL PPF en getinte ramen"
            className="w-full max-w-[260px] rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
          />
          <div className="flex-1 space-y-4">
            <p className="font-semibold">{copy.xpelLead}</p>
            <p>{copy.xpelBodyOne}</p>
            <p>{copy.xpelBodyTwo}</p>
            <p>{copy.xpelBodyThree}</p>
            <a
              href="#ppf"
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#e45b25] to-[#8bc342] px-8 py-3 text-lg font-semibold text-white shadow-[0_4px_24px_rgba(228,91,37,0.53)] transition-all hover:scale-[1.06] hover:from-[#8bc342] hover:to-[#e45b25] hover:text-[#181818] hover:shadow-[0_8px_32px_rgba(139,195,66,0.53),0_0_16px_2px_rgba(228,91,37,0.67)]"
              onClick={(event) => {
                event.preventDefault()
                setPpfOpen(true)
              }}
            >
              {copy.xpelCta}
            </a>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-[#2d2d2d] p-8 text-white">
        <h2 className="mb-4 text-2xl font-semibold text-[#8bc342]">{copy.tireHotelTitle}</h2>
        <div className="flex flex-wrap items-start gap-8">
          <img
            src="/media/wysiwyg/Tesland_bandenhotel.jpg"
            alt="Bandenhotel"
            className="w-full max-w-[200px] rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
          />
          <div className="flex-1 space-y-3 text-white/90">
            <p>{copy.tireHotelBodyOne}</p>
            <p>{copy.tireHotelBodyTwo}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-[#232323] p-8 text-white">
        <h2 className="mb-4 text-2xl font-semibold text-[#8bc342]">{copy.appointmentTitle}</h2>
        <p className="text-white/90">
          {copy.appointmentBody}{' '}
          <a className="text-[#8bc342] hover:text-[#c8ff88]" href="tel:+31853033403">
            085 303 3403
          </a>
        </p>
        <a
          href={`${localePrefix}/planning`}
          className="mt-4 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#e45b25] to-[#8bc342] px-8 py-3 text-lg font-semibold text-white shadow-[0_4px_24px_rgba(228,91,37,0.53)] transition-all hover:scale-[1.06] hover:from-[#8bc342] hover:to-[#e45b25] hover:text-[#181818] hover:shadow-[0_8px_32px_rgba(139,195,66,0.53),0_0_16px_2px_rgba(228,91,37,0.67)]"
        >
          {copy.appointmentCta}
        </a>
      </section>

      <section className="rounded-2xl bg-[#232323] p-8 text-white">
        <h2 className="mb-4 text-2xl font-semibold text-[#8bc342]">{copy.contactTitle}</h2>
        <div className="flex flex-wrap gap-10">
          <div className="space-y-1">
            <strong>{copy.contactCompany}</strong>
            <a
              className="block text-white/90 hover:text-white"
              href="https://www.google.com/maps?q=Kweekgrasstraat+36,+1313+BX+Almere"
              target="_blank"
              rel="noreferrer"
            >
              Kweekgrasstraat 36
              <br />
              1313 BX Almere
            </a>
            <a className="block text-white/90 hover:text-white" href="tel:+31853033403">
              085 303 3403
            </a>
            <a className="block text-white/90 hover:text-white" href="mailto:info@tesland.com">
              info@tesland.com
            </a>
          </div>
          <div className="space-y-1">
            <strong>{copy.contactHoursTitle}</strong>
            <p className="text-white/90">{copy.contactHoursWeek}</p>
            <p className="text-white/90">{copy.contactHoursWeekend}</p>
          </div>
        </div>
      </section>
      {ppfOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6">
          <div className="relative w-full max-w-5xl rounded-3xl bg-[#232323] p-8 text-white shadow-[0_24px_60px_rgba(0,0,0,0.6)]">
            <button
              type="button"
              onClick={() => setPpfOpen(false)}
              className="absolute right-6 top-6 text-3xl text-white/70 transition hover:text-white"
              aria-label={copy.ppfClose}
            >
              &times;
            </button>
            <section className="mb-8 flex flex-wrap items-center gap-6">
              <div className="max-w-xl space-y-4">
                <h2 className="text-3xl font-semibold text-white">{copy.ppfPopupTitle}</h2>
                <p className="text-white/90">{copy.ppfPopupBody}</p>
                <a
                  href={`${localePrefix}/planning`}
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#e45b25] to-[#8bc342] px-7 py-3 text-base font-semibold text-white shadow-[0_4px_24px_rgba(228,91,37,0.53)] transition-all hover:scale-[1.06] hover:from-[#8bc342] hover:to-[#e45b25] hover:text-[#181818]"
                >
                  {copy.ppfPopupCta}
                </a>
              </div>
              <img
                src="/media/wysiwyg/ppf-hero.png"
                alt="PPF Service"
                className="w-full max-w-sm rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
              />
            </section>

            <section className="mb-6 rounded-2xl bg-[#2d2d2d] p-6">
              <h3 className="mb-3 text-xl font-semibold text-[#8bc342]">{copy.ppfInfoTitle}</h3>
              <p className="text-white/90">{copy.ppfInfoBody}</p>
            </section>

            <section className="mb-6 rounded-2xl bg-[#232323] p-6">
              <h3 className="mb-4 text-xl font-semibold text-[#8bc342]">{copy.ppfOptionsTitle}</h3>
              <div className="grid gap-4 md:grid-cols-3">
                {copy.ppfOptions.map((option) => (
                  <div key={option.title} className="rounded-2xl bg-[#2d2d2d] p-4">
                    <h4 className="mb-2 font-semibold text-white">{option.title}</h4>
                    <p className="text-sm text-white/80">{option.body}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mb-6 rounded-2xl bg-[#2d2d2d] p-6">
              <h3 className="mb-3 text-xl font-semibold text-[#8bc342]">{copy.ppfBenefitsTitle}</h3>
              <ul className="space-y-2 text-white/90">
                {copy.ppfBenefits.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 text-[#8bc342]">✔</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl bg-[#2d2d2d] p-6">
              <h3 className="mb-3 text-xl font-semibold text-[#8bc342]">{copy.ppfWindowTitle}</h3>
              <p className="text-white/90">{copy.ppfWindowBody}</p>
              <ul className="mt-3 space-y-2 text-white/90">
                {copy.ppfWindowBenefits.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 text-[#8bc342]">✔</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      ) : null}
    </main>
  )
}
