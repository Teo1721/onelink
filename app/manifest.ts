import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'OneLink — System zarządzania restauracją',
    short_name: 'OneLink',
    description: 'Zarządzaj restauracją, śledź wyniki i przeglądaj swój grafik — OneLink',
    start_url: '/employee',
    scope: '/',
    display: 'standalone',
    background_color: '#F7F8FA',
    theme_color: '#1D4ED8',
    orientation: 'portrait-primary',
    categories: ['business', 'productivity', 'food'],
    lang: 'pl',
    dir: 'ltr',
    icons: [
      {
        src: '/company-logo.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/company-logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Mój grafik',
        short_name: 'Grafik',
        description: 'Sprawdź swój harmonogram pracy',
        url: '/employee?tab=schedule',
        icons: [{ src: '/company-logo.png', sizes: '96x96' }],
      },
      {
        name: 'Złóż wniosek urlopowy',
        short_name: 'Urlop',
        description: 'Złóż wniosek o urlop',
        url: '/employee?tab=leave',
        icons: [{ src: '/company-logo.png', sizes: '96x96' }],
      },
    ],
    screenshots: [],
  }
}
