import type { MetadataRoute } from 'next';

/**
 * Web App Manifest — served by Next.js at /manifest.webmanifest.
 * White-label: name/short_name follow siteConfig (subject short name
 * respects the ~12 character install-label limit).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'فصيح',
    short_name: 'فصيح',
    description: 'اللغة العربية للثانوية العامة',
    start_url: '/',
    display: 'standalone',
    background_color: '#F4F6F8',
    theme_color: '#4685CE',
    lang: 'ar',
    dir: 'rtl',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
