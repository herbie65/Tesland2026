import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Script id="smartsupp-chat" strategy="afterInteractive">
          {`var _smartsupp = _smartsupp || {};
_smartsupp.key = '3588e7049d4d60c9cb98e26d4fb260b145470a14';
window.smartsupp||(function(d) {
  var s,c,o=smartsupp=function(){ o._.push(arguments)};o._=[];
  s=d.getElementsByTagName('script')[0];c=d.createElement('script');
  c.type='text/javascript';c.charset='utf-8';c.async=true;
  c.src='https://www.smartsuppchat.com/loader.js?';s.parentNode.insertBefore(c,s);
})(document);`}
        </Script>
      </body>
    </html>
  );
}
