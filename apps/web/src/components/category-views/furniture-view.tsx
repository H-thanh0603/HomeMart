'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Armchair,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Eye,
  Home,
  Layers,
  Maximize2,
  Minimize2,
  PackageCheck,
  RotateCcw,
  Ruler,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { useCategories, useProducts, type ProductListParams } from '@/hooks/use-catalog';
import { ProductGrid } from '@/components/product/product-card';
import { ProductGridSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { MOTIFS } from '@/lib/category-themes';
import { cn } from '@/lib/utils';

const WOOD_SWATCHES = [
  {
    id: 'oak',
    name: 'Gỗ Sồi Tự Nhiên (Natural Oak)',
    style: 'Japandi Tối Giản',
    desc: 'Tông màu sáng tự nhiên, đường vân mềm mại, mang lại cảm giác thoáng đãng và thư thái cho phòng nhỏ.',
    hex: '#d4a373',
    cardBg: 'bg-[#faf0ca]/60 border-[#d4a373]',
    textColor: 'text-amber-950',
  },
  {
    id: 'walnut',
    name: 'Gỗ Óc Chó Trầm (Walnut)',
    style: 'Bắc Âu (Scandinavian)',
    desc: 'Tông màu nâu trầm sang trọng, vân gỗ núi đậm nét, tạo chiều sâu thị giác và sự ấm cúng lịch thiệp.',
    hex: '#582f0e',
    cardBg: 'bg-[#7f4f24]/20 border-[#582f0e]',
    textColor: 'text-amber-950',
  },
  {
    id: 'ash',
    name: 'Gỗ Tần Bì Trắng (White Ash)',
    style: 'Hiện Đại (Modern Clean)',
    desc: 'Màu gỗ sáng tinh tế, bề mặt phủ Melamine chống trầy xước và kháng nước, rất dễ lau chùi.',
    hex: '#e9d8a6',
    cardBg: 'bg-[#e9d8a6]/40 border-[#bb9457]',
    textColor: 'text-amber-950',
  },
  {
    id: 'black',
    name: 'Khung Thép Sơn Đen Mờ (Loft)',
    style: 'Industrial Loft',
    desc: 'Khung thép hộp chịu lực sơn tĩnh điện chống rỉ sét, kết hợp đợt gỗ tạo điểm nhấn cá tính mạnh mẽ.',
    hex: '#2b2d42',
    cardBg: 'bg-[#2b2d42]/10 border-[#2b2d42]',
    textColor: 'text-slate-900',
  },
];

const FIT_PRESETS = [
  { widthRange: '15cm – 25cm', heightRange: '80cm – 120cm', label: 'Khe hẹp cạnh tủ lạnh & máy giặt', suggest: 'Kệ khe co giãn 4 tầng có bánh xe kéo trượt', query: 'kệ khe' },
  { widthRange: '30cm – 45cm', heightRange: '60cm – 90cm', label: 'Góc tường đầu giường & phòng ngủ', suggest: 'Tủ tab đầu giường 2 ngăn kéo gỗ MDF', query: 'tủ đầu giường' },
  { widthRange: '50cm – 80cm', heightRange: '140cm – 180cm', label: 'Góc tường phòng khách & góc làm việc', suggest: 'Kệ sách góc chữ L đa tầng chịu lực 30kg', query: 'kệ sách' },
];

const SORT_TABS = [
  { value: 'best_selling', label: 'Bán chạy nhất' },
  { value: 'newest', label: 'Hàng mới về' },
  { value: 'rating', label: 'Đánh giá cao' },
  { value: 'price_asc', label: 'Giá thấp → cao' },
  { value: 'price_desc', label: 'Giá cao → thấp' },
] as const;

type SortValue = (typeof SORT_TABS)[number]['value'];

export function FurnitureCategoryView({ slug = 'noi-that-nho' }: { slug?: string }) {
  const { data: categories, isLoading: catLoading } = useCategories();
  const category = useMemo(
    () => (categories ?? []).find((c) => c.slug === slug),
    [categories, slug],
  );

  const [selectedWidth, setSelectedWidth] = useState<number>(35); // 35 cm
  const [selectedHeight, setSelectedHeight] = useState<number>(100); // 100 cm
  const [selectedSwatchIdx, setSelectedSwatchIdx] = useState<number>(0);
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

  const currentSwatch = WOOD_SWATCHES[selectedSwatchIdx];

  const matchedPreset = FIT_PRESETS.find((p) => {
    if (selectedWidth <= 28) return p.label.includes('tủ lạnh');
    if (selectedWidth <= 50) return p.label.includes('đầu giường');
    return p.label.includes('phòng khách');
  }) ?? FIT_PRESETS[1];

  const changePage = (p: number) => {
    setPage(p);
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-12">
      {/* ─── 1. JAPANDI & SCANDINAVIAN STUDIO HERO ─── */}
      <section
        aria-label="Studio Nội Thất Nhỏ"
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-950 via-stone-900 to-amber-900 text-white shadow-elevated"
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: MOTIFS.grain }}
        />
        <div
          aria-hidden
          className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-amber-500/20 blur-3xl"
        />

        <div className="relative mx-auto max-w-7xl px-6 py-10 md:px-12 md:py-14">
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-xs text-amber-200/80 font-medium">
            <Link href="/" className="transition-colors hover:text-white">
              Trang chủ
            </Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/products" className="transition-colors hover:text-white">
              Danh mục
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="font-bold text-white">Nội Thất Nhỏ</span>
          </nav>

          <div className="grid gap-8 lg:grid-cols-[1.3fr_0.9fr] lg:items-center">
            <div>
              <div className="mb-3.5 inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-4 py-1 text-xs font-bold uppercase tracking-wider text-amber-300 backdrop-blur-md ring-1 ring-amber-400/30">
                <Armchair className="h-4 w-4" /> Nghệ Thuật Tối Ưu Diện Tích Căn Hộ
              </div>

              <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl text-balance">
                Mỗi Mét Vuông Tổ Ấm Đều <br />
                <span className="text-amber-300">Gọn Gàng & Giàu Thẩm Mỹ</span>
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-relaxed text-amber-100/90 sm:text-base">
                Trải nghiệm <strong>Bộ Đo Kích Thước Góc Phòng (Room Fit)</strong> và <strong>Studio Đổi Màu Gỗ Tức Thì</strong> — Biến từng góc hẹp thành không gian lưu trữ tiện nghi chuẩn phong cách Bắc Âu.
              </p>

              <div className="mt-8 flex flex-wrap gap-3.5">
                <a
                  href="#bo-do-kich-thuoc"
                  className="inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-6 text-sm font-black text-amber-950 shadow-lg shadow-amber-500/30 transition-all hover:scale-105 hover:shadow-xl"
                >
                  <Ruler className="h-4 w-4" /> Thử Kích Thước Góc Phòng
                </a>
                <a
                  href="#doi-mau-go"
                  className="inline-flex h-12 items-center rounded-xl border border-white/30 bg-white/10 px-6 text-sm font-bold text-white backdrop-blur-md hover:bg-white/20"
                >
                  Studio Đổi Màu Gỗ
                </a>
              </div>
            </div>

            {/* Load Capacity Standard Card */}
            <div className="rounded-3xl border border-amber-400/30 bg-stone-900/80 p-6 backdrop-blur-md shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400 text-amber-950 font-black">
                    <Layers className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Khung Thép & Gỗ MDF</h3>
                    <p className="text-xs text-amber-300">Chống ẩm mốc & chịu tải vượt trội</p>
                  </div>
                </div>
                <span className="rounded-full bg-amber-400/20 px-2.5 py-1 text-xs font-bold text-amber-300 ring-1 ring-amber-400/30">
                  +50% Lưu Trữ
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-2xl bg-white/5 p-3 border border-white/10">
                  <p className="text-stone-300">Chịu tải mỗi tầng:</p>
                  <p className="text-base font-extrabold text-amber-300 mt-0.5">30 Kg</p>
                  <p className="text-[10px] text-stone-400">Không võng méo biến dạng</p>
                </div>
                <div className="rounded-2xl bg-white/5 p-3 border border-white/10">
                  <p className="text-stone-300">Lắp ráp tại nhà:</p>
                  <p className="text-base font-extrabold text-emerald-300 mt-0.5">15 Phút</p>
                  <p className="text-[10px] text-stone-400">Kèm đầy đủ dụng cụ</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. DANH MỤC CON NỘI THẤT ─── */}
      {(category?.children?.length ?? 0) > 0 && (
        <section aria-label="Nhóm nội thất nhỏ" className="rounded-3xl bg-amber-50/80 p-5 shadow-card ring-1 ring-amber-200/70">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-black uppercase tracking-wider text-amber-900 mr-2 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-amber-600" /> Ngành hàng nội thất:
            </span>
            {category!.children!.map((child) => (
              <Link
                key={child.id}
                href={`/products?categoryId=${child.id}`}
                className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-amber-950 shadow-sm transition-all hover:bg-amber-100 hover:-translate-y-0.5 hover:shadow ring-1 ring-amber-200/50"
              >
                {child.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ─── 3. ĐỘT PHÁ 1: BỘ ĐO KÍCH THƯỚC GÓC HẸP CĂN HỘ (ROOM FIT SIMULATOR) ─── */}
      <section id="bo-do-kich-thuoc" aria-label="Bộ đo kích thước góc phòng" className="rounded-3xl bg-white p-6 shadow-card ring-1 ring-amber-200/80 md:p-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-800 mb-2">
              <Ruler className="h-3.5 w-3.5 text-amber-600" /> Bộ Đo Kích Thước Góc Phòng (Room Fit)
            </div>
            <h2 className="text-2xl font-black text-slate-900 md:text-3xl">
              Nhập Kích Thước Khoảng Trống — Tìm Mẫu Kệ Vừa Khít 100%
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Kéo thanh trượt kích thước góc hẹp trong nhà bạn để hệ thống tự động tìm kiếm sản phẩm phù hợp
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 lg:items-center">
          <div className="space-y-5">
            <div>
              <div className="flex justify-between items-center text-sm font-bold text-slate-800 mb-2">
                <span>Chiều rộng khoảng trống góc phòng:</span>
                <span className="rounded-lg bg-amber-100 px-3 py-1 text-amber-900 font-extrabold">
                  {selectedWidth} cm
                </span>
              </div>
              <input
                type="range"
                min={15}
                max={100}
                step={5}
                value={selectedWidth}
                onChange={(e) => setSelectedWidth(Number(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                aria-label="Chiều rộng góc phòng"
              />
              <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                <span>15 cm (Khe siêu hẹp)</span>
                <span>50 cm (Trung bình)</span>
                <span>100 cm (Góc lớn)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center text-sm font-bold text-slate-800 mb-2">
                <span>Chiều cao mong muốn:</span>
                <span className="rounded-lg bg-amber-100 px-3 py-1 text-amber-900 font-extrabold">
                  {selectedHeight} cm
                </span>
              </div>
              <input
                type="range"
                min={60}
                max={180}
                step={10}
                value={selectedHeight}
                onChange={(e) => setSelectedHeight(Number(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                aria-label="Chiều cao kệ"
              />
              <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                <span>60 cm (Thấp/Tab đầu giường)</span>
                <span>120 cm (3-4 tầng)</span>
                <span>180 cm (Kịch trần)</span>
              </div>
            </div>
          </div>

          {/* Matched Recommendation Card */}
          <div className="rounded-3xl bg-amber-950 text-white p-6 shadow-xl space-y-4 border border-amber-500/30">
            <div className="flex items-center justify-between border-b border-amber-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300">Vị trí phù hợp nhất:</span>
              <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 text-xs font-bold text-amber-300">
                Khớp {selectedWidth}cm × {selectedHeight}cm
              </span>
            </div>

            <div className="space-y-2">
              <h4 className="text-base font-black text-amber-300">{matchedPreset.label}</h4>
              <p className="text-xs text-amber-100 leading-relaxed">
                👉 Gợi ý tối ưu: <strong className="text-white">{matchedPreset.suggest}</strong>
              </p>
            </div>

            <Link
              href={`/products?q=${encodeURIComponent(matchedPreset.query)}`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-3 text-xs font-black text-amber-950 hover:bg-amber-300 shadow-md transition-all mt-2"
            >
              Xem Các Mẫu Kệ Kích Thước Này <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── 4. ĐỘT PHÁ 2: STUDIO ĐỔI MÀU GỖ TỨC THÌ (WOOD SWATCH STUDIO) ─── */}
      <section id="doi-mau-go" aria-label="Studio đổi màu gỗ" className="rounded-3xl bg-stone-900 text-white p-6 shadow-card ring-1 ring-stone-800 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-stone-800 pb-5">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              🎨 Phối màu nội thất
            </span>
            <h2 className="text-2xl font-black text-white mt-1">
              Studio Đổi Chất Liệu & Màu Sắc Gỗ Tức Thì
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Chọn tông màu gỗ để xem trước phong cách bài trí tương ứng cho căn hộ của bạn
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {WOOD_SWATCHES.map((swatch, idx) => (
              <button
                key={swatch.id}
                onClick={() => setSelectedSwatchIdx(idx)}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border',
                  selectedSwatchIdx === idx
                    ? 'bg-amber-400 text-amber-950 border-amber-400 shadow-md scale-105'
                    : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700',
                )}
              >
                <span className="h-3.5 w-3.5 rounded-full border border-black/30" style={{ backgroundColor: swatch.hex }} />
                {swatch.name.split(' ')[0]} {swatch.name.split(' ')[1]}
              </button>
            ))}
          </div>
        </div>

        {/* Live Swatch Preview Box */}
        <div className="rounded-2xl bg-stone-800/80 p-6 border border-stone-700 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="h-5 w-5 rounded-full border-2 border-white/40 shadow-sm" style={{ backgroundColor: currentSwatch.hex }} />
              <h3 className="text-lg font-black text-amber-300">{currentSwatch.name}</h3>
              <span className="text-xs font-bold text-stone-400 bg-stone-900 px-2 py-0.5 rounded-md border border-stone-700">
                {currentSwatch.style}
              </span>
            </div>
            <p className="text-xs text-stone-300 leading-relaxed max-w-xl">{currentSwatch.desc}</p>
          </div>

          <div className="rounded-xl bg-stone-900 p-4 border border-stone-700 text-xs shrink-0 space-y-1 text-center">
            <p className="text-stone-400">Bảo vệ bề mặt:</p>
            <p className="font-bold text-emerald-400 text-sm">Phủ Melamine 2 mặt</p>
            <p className="text-[10px] text-stone-500">Chống nước, chống trầy, dễ lau chùi</p>
          </div>
        </div>
      </section>

      {/* ─── 5. LƯỚI SẢN PHẨM NỘI THẤT NHỎ ─── */}
      <section id="san-pham" aria-label="Sản phẩm nội thất nhỏ" className="scroll-mt-28 pt-4">
        <div ref={gridRef} className="scroll-mt-28" />

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2.5 text-xl font-black text-slate-900 md:text-2xl">
              <PackageCheck className="h-6 w-6 text-amber-700" />
              Sản Phẩm Nội Thất Nhỏ Bán Chạy Nhất
            </h2>
            {query.data?.meta && (
              <p className="mt-0.5 text-xs text-slate-500">
                Hiển thị <strong>{query.data.meta.total.toLocaleString('vi-VN')}</strong> sản phẩm nội thất thông minh
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
                      ? 'bg-amber-800 text-white shadow-md shadow-amber-800/20 scale-105'
                      : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200',
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
