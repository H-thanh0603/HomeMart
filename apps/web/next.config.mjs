/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';

// Prod-only CSP: Next's hydration bootstrap needs 'unsafe-inline' for scripts
// without a nonce-middleware, so this blunts external-script XSS rather than
// eliminating it. Dev skips CSP (react-refresh needs 'unsafe-eval').
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  poweredByHeader: false,

  async rewrites() {
    // Seed data references /placeholder/products/*.jpg which has no real file —
    // serve a generic placeholder instead of a broken image.
    return [{ source: '/placeholder/:path*', destination: '/images/placeholder.svg' }];
  },
  // Defense in depth — nginx also sets these; keep them at the app layer too.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          ...(isDev ? [] : [{ key: 'Content-Security-Policy', value: contentSecurityPolicy }]),
        ],
      },
    ];
  },
  images: {
    // Whitelist: content served by this app + known CDN hosts only. A wildcard
    // `https://**` would let any free-text URL field (product/brand/category
    // imageUrl) turn Next's image optimizer into a proxy for arbitrary hosts.
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: '*.amazonaws.com' },
      { protocol: 'https', hostname: '*.r2.dev' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
    formats: ['image/avif', 'image/webp'],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
