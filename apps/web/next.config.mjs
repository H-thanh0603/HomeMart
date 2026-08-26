/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async rewrites() {
    // Seed data references /placeholder/products/*.jpg which has no real file —
    // serve a generic placeholder instead of a broken image.
    return [{ source: '/placeholder/:path*', destination: '/images/placeholder.svg' }];
  },
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;
