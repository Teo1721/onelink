import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/auth/', '/console/', '/ops/', '/kiosk/', '/kiosk-pin/', '/employee/', '/admin/'],
    },
    sitemap: 'https://onelink.pl/sitemap.xml',
  }
}
