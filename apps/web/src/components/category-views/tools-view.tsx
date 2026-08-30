'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  Battery,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Droplet,
  Flame,
  Hammer,
  Layers,
  Lightbulb,
  Maximize2,
  Package,
  PackageCheck,
  Power,
  RotateCcw,
  Ruler,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Wrench,
  Zap,
} from 'lucide-react';
import { useCategories, useProducts, type ProductListParams } from '@/hooks/use-catalog';
import { ProductGrid } from '@/components/product/product-card';
import { ProductGridSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { MOTIFS } from '@/lib/category-themes';
import { cn } from '@/lib/utils';

interface PegboardTool {
  id: string;
  slot: string;
  name: string;
  icon: string;
  specs: {
    material: string;
    metric: string;
    strength: string;
  };
  desc: string;
  searchKey: string;
}

const PEGBOARD_TOOLS: PegboardTool[] = [
  {
    id: 'drill',
    slot: 'A1 - Treo Giữa',
    name: 'Máy Khoan Pin Búa 21V Không Chổi Than',
    icon: '⚡',
    specs: {
      material: 'Động cơ lõi đồng 100%',
      metric: 'Lực xoắn 80 N.m • 2000 RPM',
      strength: 'Khoan bê tông, gỗ, sắt',
    },
    desc: 'Động cơ Brushless thế hệ mới vận hành êm, bền bỉ gấp 3 lần động cơ chổi than truyền thống.',
    searchKey: 'khoan',
  },
  {
    id: 'screwdriver',
    slot: 'A2 - Khay Vít',
    name: 'Bộ Tua Vít Cách Điện 1000V VDE (32 Món)',
    icon: '🪛',
    specs: {
      material: 'Thép Chrome Vanadium (CR-V)',
      metric: 'Cách điện 1000V Chuẩn Đức',
      strength: 'Đầu nam châm từ tính mạnh',
    },
    desc: 'Đầy đủ đầu vít hoa thị, lục giác, pake mở được từ thiết bị điện tử siêu nhỏ đến ổ cắm gia đình.',
    searchKey: 'tua vít',
  },
  {
    id: 'wrench',
    slot: 'B1 - Hàng Cờ Lê',
    name: 'Bộ Cờ Lê Vòng Miệng Tự Động 72 Răng',
    icon: '🔧',
    specs: {
      material: 'Thép mạ Satin chống gỉ',
      metric: 'Góc xoay cực nhỏ chỉ 5 độ',
      strength: 'Siết ốc góc hẹp không cần nhấc',
    },
    desc: 'Cơ chế bánh cóc tự động 72 răng đảo chiều linh hoạt, thao tác nhanh gấp 4 lần cờ lê thường.',
    searchKey: 'cờ lê',
  },
  {
    id: 'plier',
    slot: 'B2 - Móc Treo Kìm',
    name: 'Kìm Mỏ Quạ Nước Tự Động Bấm Nút',
    icon: '🗜️',
    specs: {
      material: 'Răng tôi cứng cảm ứng 61 HRC',
      metric: 'Độ mở ngàm cực đại 50mm',
      strength: 'Khóa chặt không trượt ren',
    },
    desc: 'Tự động khóa ngàm vào ống nước, bu lông chỉ với 1 nút bấm — chống trượt tay gây thương tích.',
    searchKey: 'kìm',
  },
  {
    id: 'laser',
    slot: 'C1 - Kệ Đo Đạc',
    name: 'Thước Đo Khoảng Cách Laser 40M & Nivo',
    icon: '📏',
    specs: {
      material: 'Vỏ ABS bọc cao su chống sốc',
      metric: 'Sai số < 1.5mm • Đo 0.1s',
      strength: 'Chống nước & bụi IP54',
    },
    desc: 'Đo diện tích phòng, tính thể tích và cộng dồn khoảng cách chỉ với 1 nút bấm tiện lợi.',
    searchKey: 'thước',
  },
  {
    id: 'toolbox',
    slot: 'C2 - Khay Đáy',
    name: 'Vali Đồ Nghề Gia Đình 68 Chi Tiết',
    icon: '🧰',
    specs: {
      material: 'Hộp nhựa kỹ thuật PP nguyên sinh',
      metric: 'Chịu tải rơi từ 2 mét',
      strength: 'Ngăn định hình chuyên biệt',
    },
    desc: 'Đầy đủ kìm, búa, thước, băng tan, mỏ lết, bút thử điện — xếp gọn gàng gầm giường hoặc cốp xe.',
    searchKey: 'bộ đồ nghề',
  },
];

const EXPLODED_PARTS = [
  {
    id: 'motor',
    name: 'Động Cơ Brushless Không Chổi Than',
    desc: 'Cuộn dây đồng 100% nguyên chất, nam châm vĩnh cửu NdFeB chịu nhiệt 180°C.',
    icon: <Cpu className="h-4 w-4 text-amber-400" />,
  },
  {
    id: 'gearbox',
    name: 'Hộp Số 2 Cấp Bằng Thép Hợp Kim',
    desc: 'Bánh răng gia công CNC chuẩn xác, truyền động lực xoắn 80 N.m không trượt tải.',
    icon: <Wrench className="h-4 w-4 text-amber-400" />,
  },
  {
    id: 'chuck',
    name: 'Đầu Kẹp Kim Loại Khóa Tự Động 13mm',
    desc: 'Kẹp mũi khoan chắc chắn không bị rung lắc hay tuột mũi khi khoan tải nặng.',
    icon: <ShieldCheck className="h-4 w-4 text-amber-400" />,
  },
  {
    id: 'battery',
    name: 'Khối Pin Lithium-Ion 10-Cell Chuẩn BMS',
    desc: 'Tích hợp bo mạch bảo vệ chống quá tải, đoản mạch và tự ngắt khi nhiệt độ cao.',
    icon: <Battery className="h-4 w-4 text-emerald-400" />,
  },
];

const SORT_TABS = [
  { value: 'best_selling', label: 'Bán chạy nhất' },
  { value: 'newest', label: 'Hàng mới về' },
  { value: 'rating', label: 'Đánh giá cao' },
  { value: 'price_asc', label: 'Giá thấp → cao' },
  { value: 'price_desc', label: 'Giá cao → thấp' },
] as const;

type SortValue = (typeof SORT_TABS)[number]['value'];

export function ToolsCategoryView({ slug = 'dung-cu-sua-chua' }: { slug?: string }) {
  const { data: categories, isLoading: catLoading } = useCategories();
  const category = useMemo(
    () => (categories ?? []).find((c) => c.slug === slug),
    [categories, slug],
  );

  const [selectedToolId, setSelectedToolId] = useState<string>(PEGBOARD_TOOLS[0].id);
  const [selectedPartId, setSelectedPartId] = useState<string>(EXPLODED_PARTS[0].id);
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

  const currentTool = PEGBOARD_TOOLS.find((t) => t.id === selectedToolId) ?? PEGBOARD_TOOLS[0];
  const currentPart = EXPLODED_PARTS.find((p) => p.id === selectedPartId) ?? EXPLODED_PARTS[0];

  const changePage = (p: number) => {
    setPage(p);
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-12">
      {/* ─── 1. INDUSTRIAL WORKSHOP HERO ─── */}
      <section
        aria-label="Xưởng Cơ Khí & Sửa Chữa"
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-amber-950 text-white shadow-elevated ring-1 ring-amber-500/20"
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-25"
          style={{ backgroundImage: MOTIFS.stripes }}
        />
        <div
          aria-hidden
          className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-amber-500/15 blur-3xl"
        />

        <div className="relative mx-auto max-w-7xl px-6 py-10 md:px-12 md:py-14">
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-xs text-amber-300/80 font-medium">
            <Link href="/" className="transition-colors hover:text-white">
              Trang chủ
            </Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/products" className="transition-colors hover:text-white">
              Danh mục
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="font-bold text-white">Dụng Cụ Sửa Chữa</span>
          </nav>

          <div className="grid gap-8 lg:grid-cols-[1.3fr_0.9fr] lg:items-center">
            <div>
              <div className="mb-3.5 inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-4 py-1 text-xs font-bold uppercase tracking-wider text-amber-400 backdrop-blur-md ring-1 ring-amber-400/30">
                <Wrench className="h-4 w-4" /> Trạm Cơ Khí & DIY Chuẩn Chuyên Nghiệp
              </div>

              <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl text-balance">
                Bảng Đồ Nghề Thép CR-V — <br />
                <span className="text-amber-400">Tự Tay Làm Chủ Mọi Góc Nhà</span>
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-300 sm:text-base">
                Trải nghiệm <strong>Bảng Treo Dụng Cụ Pegboard</strong> và <strong>Mô Phỏng Tách Lớp 3D</strong> — Khám phá cấu tạo chi tiết của từng thiết bị cơ khí, máy khoan búa và cờ lê trước khi chọn mua.
              </p>

              <div className="mt-8 flex flex-wrap gap-3.5">
                <a
                  href="#bang-pegboard"
                  className="inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-6 text-sm font-black text-amber-950 shadow-lg shadow-amber-500/30 transition-all hover:scale-105 hover:shadow-xl"
                >
                  <Hammer className="h-4 w-4" /> Mở Bảng Pegboard Đồ Nghề
                </a>
                <a
                  href="#mo-phong-tach-lop"
                  className="inline-flex h-12 items-center rounded-xl border border-white/20 bg-white/5 px-6 text-sm font-bold text-white backdrop-blur-md hover:bg-white/15"
                >
                  Mô Phỏng Tách Lớp 3D
                </a>
              </div>
            </div>

            {/* Heavy-Duty Steel Standard Card */}
            <div className="rounded-3xl border border-amber-500/30 bg-zinc-900/80 p-6 backdrop-blur-md shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-amber-950 font-black">
                    <ShieldCheck className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Tiêu Chuẩn Thép CR-V 60 HRC</h3>
                    <p className="text-xs text-amber-400">Độ bền chuẩn cơ khí công nghiệp Đức</p>
                  </div>
                </div>
                <span className="rounded-full bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-300 ring-1 ring-amber-400/30">
                  Heavy-Duty
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-2xl bg-black/40 p-3 border border-zinc-800">
                  <p className="text-zinc-400">Lực xoắn tối đa:</p>
                  <p className="text-base font-extrabold text-amber-400 mt-0.5">80 N.m</p>
                  <p className="text-[10px] text-zinc-400">Khoan gỗ, sắt, tường bê tông</p>
                </div>
                <div className="rounded-2xl bg-black/40 p-3 border border-zinc-800">
                  <p className="text-zinc-400">Thả rơi chống sốc:</p>
                  <p className="text-base font-extrabold text-emerald-400 mt-0.5">2.5 Mét</p>
                  <p className="text-[10px] text-zinc-400">Vỏ nhựa ABS chịu va đập</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. DANH MỤC CON ĐỒ CƠ KHÍ ─── */}
      {(category?.children?.length ?? 0) > 0 && (
        <section aria-label="Nhóm đồ nghề" className="rounded-3xl bg-zinc-100 p-5 shadow-card ring-1 ring-zinc-300">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-black uppercase tracking-wider text-amber-950 mr-2 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-amber-600" /> Nhóm đồ cơ khí:
            </span>
            {category!.children!.map((child) => (
              <Link
                key={child.id}
                href={`/products?categoryId=${child.id}`}
                className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-amber-950 shadow-sm transition-all hover:bg-amber-100 hover:-translate-y-0.5 hover:shadow ring-1 ring-zinc-200"
              >
                {child.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ─── 3. ĐỘT PHÁ 1: BẢNG TREO ĐỒ NGHỀ PEGBOARD TRỰC QUAN ─── */}
      <section id="bang-pegboard" aria-label="Bảng treo đồ nghề pegboard" className="rounded-3xl bg-zinc-900 text-white p-6 shadow-card ring-1 ring-amber-500/30 md:p-8 space-y-8 border border-amber-500/20">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-zinc-800 pb-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-400 mb-2 border border-amber-500/30">
              <Hammer className="h-3.5 w-3.5" /> Bảng Pegboard Xưởng Cơ Khí
            </div>
            <h2 className="text-2xl font-black text-white md:text-3xl">
              Chọn Vị Trí Trên Bảng Treo Để Xem Chi Tiết Dụng Cụ
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Mỗi món đồ nghề đều được chuẩn hóa theo vị trí xưởng DIY chuyên nghiệp
            </p>
          </div>
        </div>

        {/* Pegboard Canvas Visualizer */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PEGBOARD_TOOLS.map((tool) => {
            const isSelected = selectedToolId === tool.id;

            return (
              <div
                key={tool.id}
                onClick={() => setSelectedToolId(tool.id)}
                className={cn(
                  'rounded-3xl p-5 border transition-all duration-300 cursor-pointer flex flex-col justify-between select-none relative overflow-hidden',
                  isSelected
                    ? 'bg-zinc-800/90 border-amber-500 ring-2 ring-amber-500/40 shadow-xl scale-[1.02]'
                    : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/40',
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-lg border border-amber-400/20">
                      {tool.slot}
                    </span>
                    <span className="text-2xl">{tool.icon}</span>
                  </div>

                  <h3 className="text-sm font-bold text-white line-clamp-1">{tool.name}</h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{tool.desc}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800/80 space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-zinc-300">
                    <span>Vật liệu:</span>
                    <span className="font-bold text-amber-400">{tool.specs.material}</span>
                  </div>
                  <div className="flex justify-between text-zinc-300">
                    <span>Thông số:</span>
                    <span className="font-bold text-white">{tool.specs.metric}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Tool Quick Action */}
        <div className="rounded-2xl bg-gradient-to-r from-zinc-800 via-zinc-850 to-zinc-800 p-5 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{currentTool.icon}</span>
            <div>
              <h4 className="text-sm font-bold text-amber-300">Đang chọn: {currentTool.name}</h4>
              <p className="text-xs text-zinc-300 mt-0.5">{currentTool.specs.strength}</p>
            </div>
          </div>

          <Link
            href={`/products?q=${encodeURIComponent(currentTool.searchKey)}`}
            className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-black text-amber-950 hover:bg-amber-400 shadow-md transition-all"
          >
            Tìm Món Này Trong Kho <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ─── 4. ĐỘT PHÁ 2: MÔ PHỎNG TÁCH LỚP 3D (EXPLODED VIEW) ─── */}
      <section id="mo-phong-tach-lop" aria-label="Mô phỏng tách lớp" className="rounded-3xl bg-zinc-950 text-white p-6 shadow-card ring-1 ring-zinc-800 md:p-8 space-y-6 border border-zinc-800">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-zinc-800 pb-5">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              🔬 Công nghệ cơ khí chính xác
            </span>
            <h2 className="text-2xl font-black text-white mt-1">
              Mô Phỏng Tách Lớp Máy Khoan Không Chổi Than
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Bấm chọn từng linh kiện để xem cấu tạo và vật liệu chế tạo bên trong
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {EXPLODED_PARTS.map((part) => (
              <button
                key={part.id}
                onClick={() => setSelectedPartId(part.id)}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all',
                  selectedPartId === part.id
                    ? 'bg-amber-500 text-amber-950 shadow-md scale-105'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700',
                )}
              >
                {part.name.split(' ')[0]} {part.name.split(' ')[1]}
              </button>
            ))}
          </div>
        </div>

        {/* Exploded View Detail Card */}
        <div className="rounded-2xl bg-zinc-900 p-6 border border-zinc-800 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-zinc-800 border border-zinc-700">{currentPart.icon}</span>
              <h3 className="text-lg font-black text-amber-300">{currentPart.name}</h3>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed max-w-2xl">{currentPart.desc}</p>
          </div>

          <div className="rounded-xl bg-black/50 p-4 border border-zinc-800 text-xs shrink-0 space-y-1">
            <p className="text-zinc-400">Tiêu chuẩn kiểm nghiệm:</p>
            <p className="font-extrabold text-emerald-400 text-sm">ISO 9001 / CE / GS</p>
            <p className="text-[10px] text-zinc-500">Được kiểm tra 100% trước khi xuất xưởng</p>
          </div>
        </div>
      </section>

      {/* ─── 5. LƯỚI SẢN PHẨM DỤNG CỤ SỬA CHỮA ─── */}
      <section id="san-pham" aria-label="Sản phẩm cơ khí" className="scroll-mt-28 pt-4">
        <div ref={gridRef} className="scroll-mt-28" />

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2.5 text-xl font-black text-slate-900 md:text-2xl">
              <PackageCheck className="h-6 w-6 text-amber-600" />
              Dụng Cụ Sửa Chữa Tuyển Chọn
            </h2>
            {query.data?.meta && (
              <p className="mt-0.5 text-xs text-slate-500">
                Hiển thị <strong>{query.data.meta.total.toLocaleString('vi-VN')}</strong> sản phẩm độ bền chuẩn chuyên nghiệp
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
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20 scale-105'
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
