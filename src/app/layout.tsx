import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  getSiteAccessCookieValue,
  isSiteAccessRequired,
  SITE_ACCESS_COOKIE_NAME,
} from "@/lib/site-access";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.tesland.com"),
  title: {
    default: "Tesland | Tesla specialist voor onderhoud en accessoires",
    template: "%s | Tesland",
  },
  description:
    "Tesland is dé onafhankelijke Tesla-specialist voor onderhoud, accessoires en service. Snel, vakkundig en betrouwbaar.",
  keywords: [
    "Tesla onderhoud",
    "Tesla accessoires",
    "Tesla service",
    "Tesla specialist",
    "Tesla onderdelen",
    "Tesla reparatie",
    "APK Tesla",
    "Tesla werkplaats",
    "Tesland",
  ],
  alternates: {
    canonical: "/",
    languages: {
      "nl-NL": "/nl",
      "en-US": "/en",
      "de-DE": "/de",
      "fr-FR": "/fr",
    },
  },
  openGraph: {
    type: "website",
    siteName: "Tesland",
    title: "Tesland | Tesla specialist voor onderhoud en accessoires",
    description:
      "Tesland is dé onafhankelijke Tesla-specialist voor onderhoud, accessoires en service. Snel, vakkundig en betrouwbaar.",
    url: "https://www.tesland.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tesland | Tesla specialist voor onderhoud en accessoires",
    description:
      "Tesland is dé onafhankelijke Tesla-specialist voor onderhoud, accessoires en service. Snel, vakkundig en betrouwbaar.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Site-wachtwoord: check in Node-runtime (env beschikbaar bij runtime)
  if (isSiteAccessRequired()) {
    const pathname = (await headers()).get("x-pathname") ?? "";
    const isGate = pathname.startsWith("/_site-access");
    const isSiteAccessApi = pathname.startsWith("/api/site-access");
    if (!isGate && !isSiteAccessApi) {
      const cookieStore = await cookies();
      const cookie = cookieStore.get(SITE_ACCESS_COOKIE_NAME)?.value;
      const password = process.env.SITE_ACCESS_PASSWORD!;
      const secret = process.env.JWT_SECRET ?? "";
      const expected = getSiteAccessCookieValue(password, secret);
      if (!cookie || cookie !== expected) {
        const search = pathname ? `?next=${encodeURIComponent(pathname)}` : "";
        redirect(`/_site-access${search}`);
      }
    }
  }

  return (
    <html lang="nl">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
