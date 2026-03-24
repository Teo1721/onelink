import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'OneLink — Mój Grafik',
  description: 'Twój harmonogram pracy',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'OneLink',
  },
}

export const viewport: Viewport = {
  themeColor: '#1D4ED8',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js')
              })
            }
          `,
        }}
      />
      {children}
    </>
  )
}
