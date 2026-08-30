'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  Bed,
  CheckCircle2,
  ChevronRight,
  Droplets,
  HelpCircle,
  Home,
  PackageCheck,
  Radio,
  Recycle,
  ShieldCheck,
  ShowerHead,
  Sparkles,
  SprayCan,
  Tv,
  UtensilsCrossed,
  Wind,
  Zap,
} from 'lucide-react';
import { useCategories, useProducts, type ProductListParams } from '@/hooks/use-catalog';
import { ProductGrid } from '@/components/product/product-card';
import { ProductGridSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { MOTIFS } from '@/lib/category-themes';
import { cn } from '@/lib/utils';

const PARTICLES = [
  { size: '10 µm', name: 'Bụi Cát & Lông Thú Thô', filterRate: '100% Lọc sạch', desc: 'Màng lọc thô kim loại bắt giữ toàn bộ.', color: 'bg-emerald-500' },
  { size: '2.5 µm', name: 'Bụi Mịn PM2.5 & Khói Bếp', filterRate: '99.99% Lọc sạch', desc: 'Màng than hoạt tính khử sạch mùi và khói độc.', color: 'bg-teal-500' },
  { size: '0.3 µm', name: 'Vi Khuẩn, Phấn Hoa & Virus', filterRate: '99.97% Lọc sạch', desc: 'Màng HEPA H13 chuẩn y tế bắt giữ các hạt siêu nhỏ.', color: 'bg-sky-500' },
];

const SORT_TABS = [
  { value: 'best_selling', label: 'Bán chạy nhất' },
  { value: 'newest', label: 'Hàng mới về' },
  { value: 'rating', label: 'Đánh giá cao' },
  { value: 'price_asc', label: 'Giá thấp → cao' },
  { value: 'price_desc', label: 'Giá cao → thấp' },
] as const;

type SortValue = (typeof SORT_TABS)[number]['value'];

export function CleaningCategoryView({ slug = 've-sinh-nha-cua' }: { slug?: string }) {
  const { data: categories, isLoading: catLoading } = useCategories();
  const category = useMemo(
    () => (categories ?? []).find((c) => c.slug === slug),
    [categories, slug],
  );

  // Quiz state
  const [hasPet, setHasPet] = useState<boolean>(true);
  const [nearStreet, setNearStreet] = useState<boolean>(true);
  const [floorType, setFloorType] = useState<'wood' | 'tile'>('wood');
  const [selectedParticleIdx, setSelectedParticleIdx] = useState<number>(1);
  const [sort, setSort] = useState<SortValue>('best_selling');
  const [page, setPage] = useState(1);
  const gridRef = useRef<HTMLDivElement>(null);

  const params: ProductListParams = {
    ...(category ? { categoryId: category.id } : {}),
    sort,
    page,
    limit: 12,
  };
  const ready = !catLoading;
  const query = useProducts(params, ready);
  const products = query.data?.data ?? [];
  const totalPages = query.data?.meta?.totalPages ?? 1;

  // Tính điểm rủi ro ô nhiễm
  let pollutionScore = 40;
  if (hasPet) pollutionScore += 25;
  if (nearStreet) pollutionScore += 25;
  if (floorType === 'wood') pollutionScore += 10;

  const currentParticle = PARTICLES[selectedParticleIdx];

  const changePage = (p: number) => {
    setPage(p);
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-12">
      {/* ─── 1. FRESH SANCTUARY HERO ─── */}
      <section
        aria-label="Vệ Sinh Nhà Cửa Tinh Tươm"
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-950 via-teal-900 to-emerald-800 text-white shadow-elevated"
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: MOTIFS.bubbles }}
        />
        <div
          aria-hidden
          className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-teal-400/20 blur-3xl"
        />

        <div className="relative mx-auto max-w-7xl px-6 py-10 md:px-12 md:py-14">
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-xs text-teal-200/80 font-medium">
            <Link href="/" className="transition-colors hover:text-white">
              Trang chủ
            </Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/products" className="transition-colors hover:text-white">
              Danh mục
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="font-bold text-white">Vệ Sinh Nhà Cửa</span>
          </nav>

          <div className="grid gap-8 lg:grid-cols-[1.3fr_0.9fr] lg:items-center">
            <div>
              <div className="mb-3.5 inline-flex items-center gap-2 rounded-full bg-teal-500/20 px-4 py-1 text-xs font-bold uppercase tracking-wider text-teal-300 backdrop-blur-md ring-1 ring-teal-400/30">
                <Sparkles className="h-4 w-4" /> Chuẩn Kháng Khuẩn 99.9%
              </div>

              <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl text-balance">
                Ngôi Nhà Sạch Lấp Lánh & <br />
                <span className="text-teal-300">Không Khí Trong Lành Mỗi Ngày</span>
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-relaxed text-teal-100/90 sm:text-base">
                Trải nghiệm <strong>Trắc Nghiệm Đo Điểm Sạch Sẽ</strong> và <strong>Phòng Thí Nghiệm Màng Lọc HEPA H13</strong> — Tự động thiết lập liệu trình làm sạch khoa học tùy biến cho ngôi nhà bạn.
              </p>

              <div className="mt-8 flex flex-wrap gap-3.5">
                <a
                  href="#do-chi-so-sach"
                  className="inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 px-6 text-sm font-black text-teal-950 shadow-lg shadow-teal-500/30 transition-all hover:scale-105 hover:shadow-xl"
                >
                  <Activity className="h-4 w-4" /> Làm Trắc Nghiệm Sạch Sẽ
                </a>
                <a
                  href="#thi-nghiem-hepa"
                  className="inline-flex h-12 items-center rounded-xl border border-white/30 bg-white/10 px-6 text-sm font-bold text-white backdrop-blur-md hover:bg-white/20"
                >
                  Thí Nghiệm Lọc Bụi Mịn
                </a>
              </div>
            </div>

            {/* Antibacterial HEPA Standard Card */}
            <div className="rounded-3xl border border-teal-400/30 bg-teal-950/60 p-6 backdrop-blur-md shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-teal-500/20 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-400 text-teal-950 font-black">
                    <Wind className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Tiêu Chuẩn Lọc HEPA H13</h3>
                    <p className="text-xs text-teal-200">Chuẩn y tế phòng phẫu thuật</p>
                  </div>
                </div>
                <span className="rounded-full bg-teal-400/20 px-2.5 py-1 text-xs font-bold text-teal-300 ring-1 ring-teal-400/30">
                  99.97%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-2xl bg-white/5 p-3 border border-white/10">
                  <p className="text-teal-200">Diệt khuẩn bằng tia UV:</p>
                  <p className="text-base font-extrabold text-teal-300 mt-0.5">Kháng Khuẩn</p>
                  <p className="text-[10px] text-teal-200/70">An toàn tuyệt đối cho bé</p>
                </div>
                <div className="rounded-2xl bg-white/5 p-3 border border-white/10">
                  <p className="text-teal-200">Nhựa nguyên sinh & Tái chế:</p>
                  <p className="text-base font-extrabold text-emerald-300 mt-0.5">Eco-Friendly</p>
                  <p className="text-[10px] text-teal-200/70">Thân thiện môi trường</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. DANH MỤC CON VỆ SINH ─── */}
      {(category?.children?.length ?? 0) > 0 && (
        <section aria-label="Nhóm vệ sinh" className="rounded-3xl bg-teal-50/80 p-5 shadow-card ring-1 ring-teal-200/70">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-black uppercase tracking-wider text-teal-950 mr-2 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-teal-600" /> Ngành hàng vệ sinh:
            </span>
            {category!.children!.map((child) => (
              <Link
                key={child.id}
                href={`/products?categoryId=${child.id}`}
                className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-teal-950 shadow-sm transition-all hover:bg-teal-100 hover:-translate-y-0.5 hover:shadow ring-1 ring-teal-200/50"
              >
                {child.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ─── 3. ĐỘT PHÁ 1: TRẮC NGHIỆM ĐO ĐIỂM SẠCH SẼ CĂN HỘ ─── */}
      <section id="do-chi-so-sach" aria-label="Trắc nghiệm sạch sẽ" className="rounded-3xl bg-white p-6 shadow-card ring-1 ring-teal-100 md:p-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-teal-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-teal-800 mb-2">
              <HelpCircle className="h-3.5 w-3.5 text-teal-600" /> Trắc Nghiệm Môi Trường Sống
            </div>
            <h2 className="text-2xl font-black text-slate-900 md:text-3xl">
              Chẩn Đoán Mức Độ Ô Nhiễm & Liệu Trình Làm Sạch
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Chọn đặc điểm ngôi nhà của bạn để nhận kế hoạch làm sạch và thiết bị tối ưu nhất
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-4">
            {/* Question 1: Pet */}
            <div className="rounded-2xl bg-teal-50/50 p-4 border border-teal-100 space-y-2">
              <span className="text-xs font-bold text-slate-900 block">1. Nhà bạn có nuôi thú cưng (chó/mèo) không?</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setHasPet(true)}
                  className={cn('px-4 py-2 rounded-xl text-xs font-bold transition-all', hasPet ? 'bg-teal-600 text-white shadow-sm' : 'bg-white text-teal-950 border border-teal-200')}
                >
                  🐶 Có nuôi thú cưng
                </button>
                <button
                  type="button"
                  onClick={() => setHasPet(false)}
                  className={cn('px-4 py-2 rounded-xl text-xs font-bold transition-all', !hasPet ? 'bg-teal-600 text-white shadow-sm' : 'bg-white text-teal-950 border border-teal-200')}
                >
                  🚫 Không nuôi
                </button>
              </div>
            </div>

            {/* Question 2: Location */}
            <div className="rounded-2xl bg-teal-50/50 p-4 border border-teal-100 space-y-2">
              <span className="text-xs font-bold text-slate-900 block">2. Vị trí nhà có gần mặt đường lớn / công trình không?</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNearStreet(true)}
                  className={cn('px-4 py-2 rounded-xl text-xs font-bold transition-all', nearStreet ? 'bg-teal-600 text-white shadow-sm' : 'bg-white text-teal-950 border border-teal-200')}
                >
                  🏙️ Gần đường / Bụi nhiều
                </button>
                <button
                  type="button"
                  onClick={() => setNearStreet(false)}
                  className={cn('px-4 py-2 rounded-xl text-xs font-bold transition-all', !nearStreet ? 'bg-teal-600 text-white shadow-sm' : 'bg-white text-teal-950 border border-teal-200')}
                >
                  🌿 Khu yên tĩnh / Chung cư cao tầng
                </button>
              </div>
            </div>

            {/* Question 3: Floor Type */}
            <div className="rounded-2xl bg-teal-50/50 p-4 border border-teal-100 space-y-2">
              <span className="text-xs font-bold text-slate-900 block">3. Loại mặt sàn chính trong nhà:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFloorType('wood')}
                  className={cn('px-4 py-2 rounded-xl text-xs font-bold transition-all', floorType === 'wood' ? 'bg-teal-600 text-white shadow-sm' : 'bg-white text-teal-950 border border-teal-200')}
                >
                  🪵 Sàn Gỗ / Thảm Trải
                </button>
                <button
                  type="button"
                  onClick={() => setFloorType('tile')}
                  className={cn('px-4 py-2 rounded-xl text-xs font-bold transition-all', floorType === 'tile' ? 'bg-teal-600 text-white shadow-sm' : 'bg-white text-teal-950 border border-teal-200')}
                >
                  🏛️ Gạch Men / Đá Bóng
                </button>
              </div>
            </div>
          </div>

          {/* Diagnosis Result Card */}
          <div className="rounded-3xl bg-slate-900 text-white p-6 shadow-xl space-y-5 border border-teal-500/20">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-400">Kết quả chẩn đoán căn hộ:</span>
              <span className="rounded-full bg-teal-500/20 px-2.5 py-0.5 text-xs font-bold text-teal-300">
                Chỉ số tích bụi: {pollutionScore}%
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-teal-200 font-bold">📋 Liệu trình 3 bước khuyên dùng cho bạn:</p>
              <ul className="space-y-2 text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
                  <span>{hasPet ? 'Hút lông thú cưng bằng đầu hút chống rối chuyên dụng' : 'Hút bụi sàn nhà tự động mỗi ngày 1 lần'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
                  <span>{nearStreet ? 'Bật máy lọc không khí HEPA H13 liên tục để giữ chỉ số PM2.5 < 15' : 'Lọc không khí ban đêm chế độ êm dịu 22dB'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
                  <span>{floorType === 'wood' ? 'Lau sàn bằng khăn microfiber vắt kiệt để bảo vệ vân gỗ' : 'Lau sàn khử khuẩn bằng ion bạc tạo độ bóng gương'}</span>
                </li>
              </ul>
            </div>

            <Link
              href="/products?q=robot"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-400 py-3 text-xs font-black text-teal-950 hover:bg-teal-300 shadow-md transition-all"
            >
              Xem Thiết Bị Cho Căn Hộ Của Bạn <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── 4. ĐỘT PHÁ 2: PHÒNG THÍ NGHIỆM MÀNG LỌC HEPA H13 ─── */}
      <section id="thi-nghiem-hepa" aria-label="Thí nghiệm màng lọc HEPA" className="rounded-3xl bg-slate-900 text-white p-6 shadow-card ring-1 ring-teal-500/20 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
              🔬 Mô phỏng vi mô
            </span>
            <h2 className="text-2xl font-black text-white mt-1">
              Khả Năng Bắt Giữ Hạt Bụi Của Màng Lọc HEPA H13
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Chọn kích thước vi hạt để xem cơ chế màng lọc giữ lại 99.97% tác nhân gây dị ứng
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {PARTICLES.map((p, idx) => (
              <button
                key={p.size}
                onClick={() => setSelectedParticleIdx(idx)}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all',
                  selectedParticleIdx === idx
                    ? 'bg-teal-400 text-teal-950 shadow-md scale-105'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700',
                )}
              >
                {p.size} ({p.name.split(' ')[0]} {p.name.split(' ')[1]})
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-800/90 p-6 border border-slate-700 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase text-teal-300 bg-teal-500/20 px-2.5 py-0.5 rounded-md border border-teal-500/30">
              Kích thước hạt: {currentParticle.size}
            </span>
            <h3 className="text-lg font-black text-white mt-1">{currentParticle.name}</h3>
            <p className="text-xs text-slate-300 leading-relaxed max-w-xl">{currentParticle.desc}</p>
          </div>

          <div className="rounded-2xl bg-slate-900 p-5 border border-slate-700 text-center shrink-0 space-y-1">
            <span className="text-xs text-slate-400">Hiệu suất lọc thực tế:</span>
            <p className="text-3xl font-black text-emerald-400">{currentParticle.filterRate}</p>
            <p className="text-[10px] text-teal-200">Đạt chuẩn y tế EN 1822</p>
          </div>
        </div>
      </section>

      {/* ─── 5. LƯỚI SẢN PHẨM VỆ SINH NHÀ CỬA ─── */}
      <section id="san-pham" aria-label="Sản phẩm vệ sinh" className="scroll-mt-28 pt-4">
        <div ref={gridRef} className="scroll-mt-28" />

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2.5 text-xl font-black text-slate-900 md:text-2xl">
              <PackageCheck className="h-6 w-6 text-teal-600" />
              Sản Phẩm Vệ Sinh Nhà Cửa Tuyển Chọn
            </h2>
            {query.data?.meta && (
              <p className="mt-0.5 text-xs text-slate-500">
                Hiển thị <strong>{query.data.meta.total.toLocaleString('vi-VN')}</strong> sản phẩm chăm sóc nhà cửa
              </p>
            )}
          </div>

          {/* Sort Tabs */}
          <div role="tablist" aria-label="Sắp xếp" className="flex flex-wrap gap-2">
            {SORT_TABS.map((tab) => {
              const active = sort === tab.value;
              return (
                <button
                  key={tab.value}
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setSort(tab.value);
                    setPage(1);
                  }}
                  className={cn(
                    'rounded-xl px-4 py-2 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2',
                    active
                      ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20 scale-105'
                      : 'bg-white text-teal-950 hover:bg-slate-50 border border-teal-200',
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {!ready || query.isLoading ? (
          <ProductGridSkeleton count={12} />
        ) : query.isError ? (
          <ErrorState onRetry={() => query.refetch()} />
        ) : products.length === 0 ? (
          <EmptyState
            title="Chưa có sản phẩm trong mục này"
            description="Sản phẩm đang được cập nhật thêm — bạn có thể khám phá ở trang tất cả sản phẩm."
            actionLabel="Xem tất cả sản phẩm"
            href="/products"
          />
        ) : (
          <>
            <ProductGrid products={products} />
            <Pagination page={page} totalPages={totalPages} onChange={changePage} />
          </>
        )}
      </section>
    </div>
  );
}
