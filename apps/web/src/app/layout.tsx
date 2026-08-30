import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Header, Footer } from '@/components/layout/header-footer';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://homemart.vn';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'HomeMart — Siêu thị gia dụng trực tuyến hiện đại cho gia đình Việt',
    template: '%s | HomeMart',
  },
  description:
    'HomeMart — mua sắm đồ dùng gia đình, nhà bếp, điện máy và tiện ích tổ ấm thông minh, chính hãng với giá tốt nhất. Giao hàng nhanh toàn quốc.',
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    siteName: 'HomeMart',
    images: [{ url: '/og-image.svg', width: 1200, height: 630, alt: 'HomeMart — Siêu thị gia dụng trực tuyến' }],
  },
  twitter: { card: 'summary_large_image', images: ['/og-image.svg'] },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className="scroll-smooth">
      <body className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-800 antialiased">
        {/* <!--
          THESIS: Fresh, warm & modern Vietnamese home goods e-commerce refusing sterile corporate grids in favor of vibrant emerald warmth and cozy living spaces.
          OWN-WORLD: Emerald Mint (#059669) botanical freshness with warm amber (#f97316) energy, generous rounded-2xl containers, breathable rhythm and tactile micro-interactions.
          STORY: Vietnamese families discover trustworthy, practical, beautifully designed home essentials with zero cognitive friction and pure delight.
          FIRST VIEWPORT: Welcoming gradient hero with lifestyle proof, trusted guarantees, and intuitive room-by-room category shortcuts.
          FORM: Modern Vietnamese Living Store, Code-first direction.
          FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
        --> */}
        <Providers>
          <Header />
          <main className="mx-auto min-h-[65vh] w-full max-w-7xl px-3 py-6 md:px-6">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
