import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'OneLink Pracownicy',
    short_name: 'OneLink',
    description: 'Twój harmonogram pracy — OneLink',
    start_url: '/employee',
    display: 'standalone',
    background_color: '#F9FAFB',
    theme_color: '#1D4ED8',
    orientation: 'portrait',
    icons: [
      {
        src: '/company-logo.png',
        sizes: 'any',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  }
}
