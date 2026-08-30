'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Flame,
  Sparkles,
  Star,
  Truck,
} from 'lucide-react';
import { useCategories, useProducts } from '@/hooks/use-catalog';
import { ProductGrid } from '@/components/product/product-card';
import { ProductGridSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { getCategoryTheme, MOTIFS } from '@/lib/category-themes';
import { cn } from '@/lib/utils';

function SectionHeader({
  title,
  subtitle,
  href,
  icon,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 pb-4">
      <div>
        <h2 className="flex items-center gap-2.5 text-xl font-black tracking-tight text-slate-900 md:text-2xl">
          {icon}
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-xs text-slate-400 md:text-sm">{subtitle}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="group inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800"
        >
          Xem tất cả <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}

function ProductSection({
  title,
  subtitle,
  sort,
  limit = 8,
  icon,
  href,
  categoryId,
}: {
  title: string;
  subtitle?: string;
  sort: 'best_selling' | 'newest' | 'rating' | 'price_asc';
  limit?: number;
  icon?: React.ReactNode;
  href?: string;
  categoryId?: string;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useProducts({ sort, limit, page, categoryId });
  const products = data?.data ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;

  const changePage = (p: number) => {
    setPage(p);
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section ref={sectionRef} aria-label={title} className="mt-12 scroll-mt-24">
      <SectionHeader icon={icon} title={title} subtitle={subtitle} href={href ?? `/products?sort=${sort}`} />
      {isLoading ? (
        <ProductGridSkeleton count={limit} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : products.length === 0 ? (
        <EmptyState title="Chưa có sản phẩm" description="Sản phẩm sẽ sớm được cập nhật trong mục này." />
      ) : (
        <>
          <ProductGrid products={products} />
          <Pagination page={page} totalPages={totalPages} onChange={changePage} />
        </>
      )}
    </section>
  );
}

function CategoryGrid() {
  const { data, isLoading, isError, refetch } = useCategories();

  return (
    <section aria-label="Danh mục không gian sống" className="mt-12">
      <SectionHeader
        title="Khám phá theo không gian & thế giới gia dụng"
        subtitle="Mỗi gian hàng là một thiết kế và trải nghiệm chuyên biệt cho tổ ấm của bạn"
        href="/products"
        icon={<Sparkles className="h-5 w-5 text-emerald-600" />}
      />
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-3xl bg-slate-200/70" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState title="Chưa có danh mục nào" />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {(data ?? []).slice(0, 6).map((cat) => {
            const catTheme = getCategoryTheme(cat.slug);
            const CatIcon = catTheme.icon;

            return (
              <Link
                key={cat.id}
                href={cat.parentId == null ? `/danh-muc/${cat.slug}` : `/products?categoryId=${cat.id}`}
                className="group flex flex-col justify-between rounded-3xl bg-white p-4 shadow-card ring-1 ring-slate-100/90 transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                <div>
                  <div
                    className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl text-white shadow-md transition-transform duration-300 group-hover:scale-110"
                    style={{
                      background: `linear-gradient(135deg, ${catTheme.heroGradient[0]}, ${catTheme.heroGradient[1]})`,
                    }}
                  >
                    <CatIcon className="h-7 w-7" />
                  </div>
                  <div className="mt-3">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider block" style={{ color: catTheme.accent }}>
                      {catTheme.kicker}
                    </span>
                    <h3 className="line-clamp-1 text-sm font-bold text-slate-800 transition-colors group-hover:text-emerald-700 mt-0.5">
                      {cat.name}
                    </h3>
                  </div>
                </div>

                <div className="mt-3 border-t border-slate-50 pt-2 flex items-center justify-between text-[11px] font-bold" style={{ color: catTheme.accentDeep }}>
                  <span>Khám phá</span>
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

const FEATURED_SLUG = process.env.NEXT_PUBLIC_FEATURED_CATEGORY ?? 'nha-bep';

export default function HomePage() {
  const { data: categories } = useCategories();
  const theme = getCategoryTheme(FEATURED_SLUG);
  const Icon = theme.icon;

  return (
    <div className="space-y-4">
      {/* ─── Hero Section ─── */}
      <section
        aria-label="HomeMart — Tổ ấm tiện nghi"
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-800 via-primary-700 to-teal-900 text-white shadow-elevated"
      >
        <div aria-hidden className="absolute inset-0 opacity-15" style={{ backgroundImage: MOTIFS.tiles }} />
        
        <div className="relative z-10 grid gap-8 px-6 py-12 sm:px-10 md:grid-cols-[1.3fr_0.9fr] md:py-16 lg:px-14">
          <div className="flex flex-col justify-center">
            <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3.5 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse-subtle" />
              Siêu thị gia dụng trực tuyến hiện đại
            </div>
            
            <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl text-balance">
              Tổ Ấm Tiện Nghi, <br className="hidden sm:inline" />
              Trọn Vẹn <span className="text-amber-300">Yêu Thương</span>
            </h1>
            
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-emerald-50/90 sm:text-base">
              Khám phá hơn 1.000+ sản phẩm đồ dùng nhà bếp, điện máy thông minh, dụng cụ sửa chữa và tiện ích gia đình chính hãng với giá tốt nhất mỗi ngày.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <Link
                href={`/danh-muc/${FEATURED_SLUG}`}
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-accent-500 to-amber-500 px-6 text-sm font-bold text-white shadow-lg shadow-accent-500/30 transition-all duration-200 hover:from-accent-600 hover:to-amber-600 hover:shadow-xl hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Khám phá {theme.name} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/products"
                className="inline-flex h-12 items-center rounded-xl border border-white/30 bg-white/10 px-6 text-sm font-bold text-white backdrop-blur-md transition-all duration-200 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Tất cả sản phẩm
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4 text-xs font-semibold text-emerald-100">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" /> Miễn phí giao từ 299K
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" /> Đổi trả 7 ngày
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" /> 100% Chính hãng
              </span>
            </div>
          </div>

          {/* Hero Feature Highlight Box */}
          <div className="flex flex-col justify-center">
            <div className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-md shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/15 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400 text-amber-950 font-black shadow-md">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-200">Chủ đề nổi bật</span>
                    <h3 className="text-base font-bold text-white">{theme.name}</h3>
                  </div>
                </div>
                <Link
                  href={`/danh-muc/${FEATURED_SLUG}`}
                  className="rounded-xl bg-white/20 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/30"
                >
                  Xem ngay
                </Link>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-white/80">{theme.tagline}</p>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                {theme.highlights.slice(0, 2).map((h) => {
                  const HIcon = h.icon;
                  return (
                    <div key={h.title} className="rounded-xl bg-white/10 p-3">
                      <HIcon className="h-4 w-4 text-amber-300 mb-1" />
                      <p className="font-bold text-white text-[11px]">{h.title}</p>
                      <p className="text-[10px] text-white/70 truncate">{h.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Ambient Blur Orbs */}
        <div aria-hidden className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div aria-hidden className="absolute -bottom-20 right-40 h-80 w-80 rounded-full bg-amber-400/15 blur-3xl" />
      </section>

      {/* ─── Highlights 3-Pillars ─── */}
      <section aria-label="Cam kết chất lượng" className="grid gap-3 sm:grid-cols-3 pt-2">
        {theme.highlights.map((h) => {
          const HIcon = h.icon;
          return (
            <div
              key={h.title}
              className="flex items-start gap-3.5 rounded-2xl bg-white p-4 shadow-card ring-1 ring-slate-100 transition-all hover:shadow-card-hover"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <HIcon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{h.title}</h3>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{h.text}</p>
              </div>
            </div>
          );
        })}
      </section>

      {/* ─── Flash Sale Section ─── */}
      <section aria-label="Flash sale hôm nay" className="mt-10 overflow-hidden rounded-3xl bg-gradient-to-r from-red-600 via-accent-500 to-amber-500 p-0.5 shadow-lg shadow-accent-500/15">
        <div className="rounded-[23px] bg-white p-5 md:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-accent-500 to-red-500 text-white shadow-md shadow-red-500/30">
                <Flame className="h-6 w-6 animate-pulse-subtle" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black tracking-tight text-slate-900 md:text-xl">
                    FLASH SALE GIÁ SỐC
                  </h2>
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-extrabold text-red-600">
                    HÔM NAY
                  </span>
                </div>
                <p className="text-xs text-slate-400">Ưu đãi có hạn • Đang diễn ra</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Clock className="h-4 w-4 text-accent-500" />
              <span>Kết thúc sau:</span>
              <span className="rounded-lg bg-slate-900 px-2 py-1 font-mono text-white">02</span>
              <span>:</span>
              <span className="rounded-lg bg-slate-900 px-2 py-1 font-mono text-white">45</span>
              <span>:</span>
              <span className="rounded-lg bg-slate-900 px-2 py-1 font-mono text-white">18</span>
            </div>
          </div>

          <FlashSaleProducts />
        </div>
      </section>

      {/* ─── Danh mục nổi bật ─── */}
      <CategoryGrid />

      {/* ─── Sản phẩm bán chạy ─── */}
      <ProductSection
        title="Sản phẩm bán chạy nhất"
        subtitle="Những sản phẩm được hàng ngàn gia đình yêu thích và tin dùng"
        sort="best_selling"
        limit={8}
        icon={<Flame className="h-5 w-5 text-accent-500" />}
        href="/products?sort=best_selling"
      />

      {/* ─── Hàng mới về ─── */}
      <ProductSection
        title="Hàng mới về cho tổ ấm"
        subtitle="Cập nhật những tiện ích và thiết bị gia dụng mới nhất"
        sort="newest"
        limit={8}
        icon={<Sparkles className="h-5 w-5 text-emerald-600" />}
        href="/products?sort=newest"
      />

      {/* ─── Đánh giá cao ─── */}
      <ProductSection
        title="Được đánh giá cao từ khách hàng"
        subtitle="Sản phẩm đạt từ 4.5 sao trở lên với nhiều phản hồi tích cực"
        sort="rating"
        limit={8}
        icon={<Star className="h-5 w-5 text-amber-500 fill-amber-500" />}
        href="/products?sort=rating"
      />
    </div>
  );
}

function FlashSaleProducts() {
  const { data, isLoading, isError, refetch } = useProducts({
    sort: 'best_selling',
    limit: 6,
  });
  const products = (data?.data ?? []).filter(
    (p) => p.compareAtPrice && p.compareAtPrice > p.price,
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-44 animate-pulse rounded-2xl bg-slate-200/70" />
        ))}
      </div>
    );
  }

  if (isError) return <ErrorState onRetry={() => refetch()} />;

  if (products.length === 0)
    return <EmptyState title="Chưa có ưu đãi nào" description="Quay lại sau nhé!" />;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
      {products.slice(0, 6).map((p) => {
        const image = p.images?.find((img) => img.isPrimary) ?? p.images?.[0];
        const percent = Math.round(((p.compareAtPrice! - p.price) / p.compareAtPrice!) * 100);
        return (
          <Link
            key={p.id}
            href={`/products/${p.slug}`}
            className="group flex flex-col rounded-2xl bg-slate-50/70 p-2.5 transition-all hover:bg-emerald-50/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            aria-label={`${p.name} — giảm ${percent}%`}
          >
            <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-white shadow-sm">
              {image && (
                <Image
                  src={image.url}
                  alt={p.name}
                  fill
                  sizes="140px"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              )}
              <span className="absolute left-1.5 top-1.5 rounded-lg bg-gradient-to-r from-red-600 to-accent-500 px-1.5 py-0.5 text-[10px] font-extrabold text-white shadow-sm">
                -{percent}%
              </span>
            </div>
            <p className="mt-2 line-clamp-1 text-xs font-semibold text-slate-800 group-hover:text-emerald-700">
              {p.name}
            </p>
            <div className="mt-1">
              <p className="text-sm font-extrabold text-accent-600">
                {new Intl.NumberFormat('vi-VN').format(p.price)}₫
              </p>
              <p className="text-[10px] text-slate-400 line-through">
                {new Intl.NumberFormat('vi-VN').format(p.compareAtPrice!)}₫
              </p>
            </div>
            <div className="mt-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-gradient-to-r from-accent-500 to-red-500" style={{ width: '75%' }} />
              </div>
              <span className="mt-0.5 block text-[10px] font-semibold text-slate-500">Đã bán 75%</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
