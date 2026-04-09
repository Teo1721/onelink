import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Ignore TypeScript Errors during build (e.g. "any" types)
  typescript: {
    ignoreBuildErrors: true,
  },

  async rewrites() {
    return [
      // ── Auth ────────────────────────────────────────────────
      { source: '/sign-in',           destination: '/auth/login' },
      { source: '/sign-up',           destination: '/auth/sign-up' },
      { source: '/sign-up/success',   destination: '/auth/sign-up-success' },
      { source: '/forgot-password',   destination: '/auth/forgot-password' },
      { source: '/reset-password',    destination: '/auth/update-password' },
      { source: '/set-password',      destination: '/auth/set-password' },

      // ── Admin console ────────────────────────────────────────
      { source: '/console',           destination: '/admin' },
      { source: '/console/:path*',    destination: '/admin/:path*' },

      // ── Operations portal ────────────────────────────────────
      { source: '/portal',            destination: '/ops' },
      { source: '/portal/:path*',     destination: '/ops/:path*' },

      // ── Employee workspace ───────────────────────────────────
      { source: '/workspace',         destination: '/employee' },
      { source: '/workspace/:path*',  destination: '/employee/:path*' },

      // ── Kiosk PIN ────────────────────────────────────────────
      { source: '/kiosk/pin',         destination: '/kiosk-pin' },

      // ── Clock in / out ───────────────────────────────────────
      { source: '/clock-in',          destination: '/clock' },
    ]
  },
}

export default nextConfig;