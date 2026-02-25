import type { Metadata } from 'next'
import {
  Inter,
  Bebas_Neue,
  IBM_Plex_Mono,
  Playfair_Display,
  Lato,
  Montserrat,
  Source_Sans_3,
  Nunito,
} from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

// The Circuit
const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
  display: 'swap',
})
const ibmPlexMono = IBM_Plex_Mono({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
})

// The Club
const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})
const lato = Lato({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-lato',
  display: 'swap',
})

// The Trail
const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
})
const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-source-sans',
  display: 'swap',
})

// The Getaway
const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Yearout',
  description: 'Every year. Every crew. Forever.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3003'),
}

const fontVariables = [
  inter.variable,
  bebasNeue.variable,
  ibmPlexMono.variable,
  playfairDisplay.variable,
  lato.variable,
  montserrat.variable,
  sourceSans.variable,
  nunito.variable,
].join(' ')

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${fontVariables} antialiased`}>
        {children}
      </body>
    </html>
  )
}
