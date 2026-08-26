import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Header, Footer } from '@/components/layout/header-footer';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://homemart.vn';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'HomeMart — Siêu thị gia dụng trực tuyến',
    template: '%s | HomeMart',
  },
  description:
    'HomeMart — mua sắm đồ dùng gia đình, nhà bếp, nội thất chất lượng với giá tốt nhất. Giao hàng nhanh toàn quốc.',
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    siteName: 'HomeMart',
    images: [{ url: '/images/placeholder.svg', width: 1200, height: 630, alt: 'HomeMart' }],
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <Providers>
          <Header />
          <main className="mx-auto min-h-[60vh] w-full max-w-7xl px-3 py-4 md:px-4">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
