import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { JellyfinProvider } from '@/components/jellyfin-provider'
import { OfflineSupport } from '@/components/offline-support'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: { default: 'JFLX — Films, séries et TV', template: '%s · JFLX' },
  description: 'Explorez votre médiathèque Jellyfin : films, séries, favoris et télévision en direct.',
  icons: { icon: '/favicon.svg' },
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#101019',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} bg-background`}
    >
      <body className="font-sans antialiased">
        <JellyfinProvider>{children}</JellyfinProvider>
        <OfflineSupport />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
