'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  BatteryCharging,
  Bed,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Flame,
  Gauge,
  Home,
  PackageCheck,
  PlugZap,
  Power,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Swords,
  ThermometerSun,
  Tv,
  Users,
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
import { cn, formatCurrency } from '@/lib/utils';

interface RoomAppliance {
  id: string;
  name: string;
  room: string;
  icon: React.ReactNode;
  activePower: number; // Watts
  inverterPower: number; // Watts
  desc: string;
  status: boolean;
}

interface SpecBattle {
  id: string;
  title: string;
  techA: {
    name: string;
    tag: string;
    power: string;
    noise: string;
    vitaminPreserve: string;
    efficiency: string;
    verdict: string;
  };
  techB: {
    name: string;
    tag: string;
    power: string;
    noise: string;
    vitaminPreserve: string;
    efficiency: string;
    verdict: string;
  };
}

const APPLIANCES: RoomAppliance[] = [
  { id: 'rice-cooker', name: 'Nồi Cơm Cao Tần IH 1.8L', room: 'Bếp', icon: <UtensilsCrossed className="h-4 w-4" />, activePower: 1300, inverterPower: 800, desc: 'Nấu cơm dẻo hạt, giữ ấm 24h', status: true },
  { id: 'air-fryer', name: 'Nồi Chiên Không Dầu Rapid Air 6.5L', room: 'Bếp', icon: <Flame className="h-4 w-4" />, activePower: 1800, inverterPower: 1200, desc: 'Tách 85% mỡ thừa gà nguyên con', status: true },
  { id: 'air-purifier', name: 'Máy Lọc Không Khí HEPA H13 Inverter', room: 'Khách', icon: <Wind className="h-4 w-4" />, activePower: 65, inverterPower: 28, desc: 'Lọc 99.97% bụi mịn PM2.5', status: true },
  { id: 'tower-fan', name: 'Quạt Cây DC Inverter Siêu Êm', room: 'Khách', icon: <Wind className="h-4 w-4" />, activePower: 55, inverterPower: 22, desc: 'Độ ồn chỉ 22dB, 12 cấp gió', status: true },
  { id: 'dehumidifier', name: 'Máy Hút Ẩm Ion Khử Mùi Phòng Ngủ', room: 'Ngủ', icon: <ThermometerSun className="h-4 w-4" />, activePower: 240, inverterPower: 140, desc: 'Duy trì độ ẩm lý tưởng 55%', status: true },
  { id: 'slow-juicer', name: 'Máy Ép Chậm Trục Vít 43 RPM', room: 'Bếp', icon: <Zap className="h-4 w-4" />, activePower: 250, inverterPower: 150, desc: 'Giữ 98% vitamin không tách nước', status: false },
];

const BATTLES: SpecBattle[] = [
  {
    id: 'rice',
    title: 'Nồi Cơm Cao Tần IH vs Nồi Cơm Cơ Truyền Thống',
    techA: {
      name: 'Cao Tần IH (Induction Heating)',
      tag: 'Công Nghệ Đỉnh Cao',
      power: '1300W Biến Tần',
      noise: '< 28 dB Siêu Êm',
      vitaminPreserve: '96% Dưỡng chất gạo',
      efficiency: 'Tiết kiệm 35% điện',
      verdict: 'Nấu hạt gạo chín đều từ lõi, thơm dẻo không bị nát hay khô dù để qua đêm.',
    },
    techB: {
      name: 'Nồi Cơ Mâm Nhiệt Đáy',
      tag: 'Truyền Thống',
      power: '700W Trực Tiếp',
      noise: '< 30 dB',
      vitaminPreserve: '78% Dưỡng chất',
      efficiency: 'Tiêu chuẩn',
      verdict: 'Chỉ truyền nhiệt từ đáy, dễ bị cháy xém đáy nồi hoặc nhão phần trên.',
    },
  },
  {
    id: 'airfryer',
    title: 'Nồi Chiên Không Dầu Rapid Air vs Lò Nướng Thùng',
    techA: {
      name: 'Nồi Chiên Rapid Air 360°',
      tag: 'Tách Mỡ Tốt Nhất',
      power: '1800W Inverter',
      noise: '< 42 dB',
      vitaminPreserve: '92% Vitamin',
      efficiency: 'Nhanh hơn 50%',
      verdict: 'Khí nóng xoáy 360° làm chín vàng giòn rụm trong 15 phút, tách 85% mỡ thừa.',
    },
    techB: {
      name: 'Lò Nướng Thanh Nhiệt Thùng',
      tag: 'Dung Tích Lớn',
      power: '2200W',
      noise: '< 45 dB',
      vitaminPreserve: '80% Vitamin',
      efficiency: 'Cần làm nóng 10p',
      verdict: 'Tốn thời gian làm nóng lò, tiêu thụ nhiều điện năng hơn khi nấu lượng thức ăn nhỏ.',
    },
  },
  {
    id: 'juicer',
    title: 'Máy Ép Chậm Trục Vít vs Máy Ép Nhanh Ly Tâm',
    techA: {
      name: 'Máy Ép Chậm Trục Vít 43 RPM',
      tag: 'Giữ Trọn Enzyme',
      power: '200W Động cơ DC',
      noise: '< 35 dB Êm ái',
      vitaminPreserve: '98% Vitamin & Khoáng',
      efficiency: 'Bã khô kiệt 95%',
      verdict: 'Nghiền lạnh không sinh nhiệt, nước ép sánh mịn không bị tách nước hay sủi bọt.',
    },
    techB: {
      name: 'Máy Ép Nhanh Ly Tâm Dao Cắt',
      tag: 'Tốc Độ Nhanh',
      power: '800W Dao xoay',
      noise: '> 75 dB Ồn ào',
      vitaminPreserve: '60% (Bị oxy hóa)',
      efficiency: 'Bã còn nhiều nước',
      verdict: 'Ma sát dao quay nhanh sinh nhiệt làm mất vitamin tự nhiên và nước ép nhanh đổi màu.',
    },
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

export function AppliancesCategoryView({ slug = 'dien-gia-dung' }: { slug?: string }) {
  const { data: categories, isLoading: catLoading } = useCategories();
  const category = useMemo(
    () => (categories ?? []).find((c) => c.slug === slug),
    [categories, slug],
  );

  const [activeRoom, setActiveRoom] = useState<string>('Tất cả');
  const [deviceStatuses, setDeviceStatuses] = useState<Record<string, boolean>>(
    APPLIANCES.reduce((acc, dev) => ({ ...acc, [dev.id]: dev.status }), {}),
  );
  const [activeBattle, setActiveBattle] = useState<string>(BATTLES[0].id);
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

  const currentBattle = BATTLES.find((b) => b.id === activeBattle) ?? BATTLES[0];

  const toggleDevice = (id: string) => {
    setDeviceStatuses((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Tính tổng công suất thường và công suất inverter
  const totalNormalPower = APPLIANCES.filter((d) => deviceStatuses[d.id]).reduce((sum, d) => sum + d.activePower, 0);
  const totalInverterPower = APPLIANCES.filter((d) => deviceStatuses[d.id]).reduce((sum, d) => sum + d.inverterPower, 0);
  const powerSaved = totalNormalPower - totalInverterPower;

  const filteredAppliances = activeRoom === 'Tất cả'
    ? APPLIANCES
    : APPLIANCES.filter((d) => d.room === activeRoom);

  const changePage = (p: number) => {
    setPage(p);
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-12">
      {/* ─── 1. HIGH-TECH APPLIANCE LAB HERO ─── */}
      <section
        aria-label="Điện Gia Dụng Thông Thái"
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-sky-950 to-cyan-900 text-white shadow-elevated"
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: MOTIFS.waves }}
        />
        <div
          aria-hidden
          className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-sky-500/25 blur-3xl"
        />

        <div className="relative mx-auto max-w-7xl px-6 py-10 md:px-12 md:py-14">
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-xs text-sky-200/80 font-medium">
            <Link href="/" className="transition-colors hover:text-white">
              Trang chủ
            </Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/products" className="transition-colors hover:text-white">
              Danh mục
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="font-bold text-white">Điện Gia Dụng</span>
          </nav>

          <div className="grid gap-8 lg:grid-cols-[1.3fr_0.9fr] lg:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-sky-500/20 px-4 py-1 text-xs font-bold uppercase tracking-wider text-sky-300 backdrop-blur-md ring-1 ring-sky-400/30">
                <PlugZap className="h-4 w-4" /> Chuẩn Tiết Kiệm Năng Lượng 5 Sao
              </div>

              <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl text-balance">
                Thiết Bị Điện Thông Thái <br />
                <span className="text-sky-300">Giải Phóng Sức Lao Động Gia Đình</span>
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-relaxed text-sky-100/90 sm:text-base">
                Trải nghiệm <strong>Sơ Đồ Căn Hộ Năng Lượng</strong> và <strong>Đấu Trường So Sánh Specs</strong> — Trực quan hóa công suất tiêu thụ và chọn chính xác thiết bị điện gia dụng đạt chuẩn Inverter bền bỉ nhất.
              </p>

              <div className="mt-8 flex flex-wrap gap-3.5">
                <a
                  href="#so-do-can-ho"
                  className="inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-sky-400 to-cyan-400 px-6 text-sm font-black text-sky-950 shadow-lg shadow-sky-500/30 transition-all hover:scale-105 hover:shadow-xl"
                >
                  <Zap className="h-4 w-4" /> Bật Sơ Đồ Năng Lượng
                </a>
                <a
                  href="#dau-truong-specs"
                  className="inline-flex h-12 items-center rounded-xl border border-white/30 bg-white/10 px-6 text-sm font-bold text-white backdrop-blur-md hover:bg-white/20"
                >
                  Đấu Trường So Găng
                </a>
              </div>
            </div>

            {/* Smart Inverter Dashboard Card */}
            <div className="rounded-3xl border border-sky-400/30 bg-slate-900/80 p-6 backdrop-blur-md shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-sky-500/20 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-400 text-sky-950 font-black">
                    <Cpu className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Digital Inverter 2026</h3>
                    <p className="text-xs text-sky-300">Công nghệ biến tần điều khiển kép</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-300 ring-1 ring-emerald-400/30">
                  A+++ 5 Sao
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-2xl bg-white/5 p-3 border border-white/10">
                  <p className="text-slate-400">Độ ồn hoạt động:</p>
                  <p className="text-base font-extrabold text-sky-300 mt-0.5">&lt; 35 dB</p>
                  <p className="text-[10px] text-slate-400">Êm ái như tiếng thì thầm</p>
                </div>
                <div className="rounded-2xl bg-white/5 p-3 border border-white/10">
                  <p className="text-slate-400">Bảo hành động cơ:</p>
                  <p className="text-base font-extrabold text-emerald-300 mt-0.5">5 Năm</p>
                  <p className="text-[10px] text-slate-400">1 đổi 1 trong 30 ngày</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. DANH MỤC CON ĐIỆN MÁY ─── */}
      {(category?.children?.length ?? 0) > 0 && (
        <section aria-label="Nhóm thiết bị điện" className="rounded-3xl bg-sky-50/80 p-5 shadow-card ring-1 ring-sky-200/70">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-black uppercase tracking-wider text-sky-900 mr-2 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-sky-600" /> Ngành hàng điện máy:
            </span>
            {category!.children!.map((child) => (
              <Link
                key={child.id}
                href={`/products?categoryId=${child.id}`}
                className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-sky-950 shadow-sm transition-all hover:bg-sky-100 hover:-translate-y-0.5 hover:shadow ring-1 ring-sky-200/50"
              >
                {child.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ─── 3. ĐỘT PHÁ 1: SƠ ĐỒ CĂN HỘ NĂNG LƯỢNG (APARTMENT ENERGY FLOORPLAN) ─── */}
      <section id="so-do-can-ho" aria-label="Sơ đồ năng lượng căn hộ" className="rounded-3xl bg-white p-6 shadow-card ring-1 ring-sky-100 md:p-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-sky-800 mb-2">
              <Home className="h-3.5 w-3.5 text-sky-600" /> Sơ Đồ Căn Hộ Năng Lượng Thông Minh
            </div>
            <h2 className="text-2xl font-black text-slate-900 md:text-3xl">
              Bật/Tắt Thiết Bị Để Đo Lường Công Suất Toàn Nhà
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Nhấp vào công tắc từng thiết bị để xem đồng hồ tổng tải điện và mức tiết kiệm của chuẩn Inverter
            </p>
          </div>

          {/* Room Filter Pills */}
          <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-2xl">
            {['Tất cả', 'Bếp', 'Khách', 'Ngủ'].map((room) => (
              <button
                key={room}
                onClick={() => setActiveRoom(room)}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all',
                  activeRoom === room ? 'bg-sky-600 text-white shadow-sm' : 'text-sky-950 hover:text-sky-900',
                )}
              >
                {room === 'Tất cả' ? 'Toàn Căn Hộ' : `Phòng ${room}`}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          {/* Interactive Device Grid */}
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredAppliances.map((device) => {
              const isOn = deviceStatuses[device.id] ?? false;

              return (
                <div
                  key={device.id}
                  onClick={() => toggleDevice(device.id)}
                  className={cn(
                    'flex flex-col justify-between p-4 rounded-2xl border transition-all duration-300 cursor-pointer select-none',
                    isOn
                      ? 'bg-sky-50/70 border-sky-300 ring-2 ring-sky-400/30 shadow-md scale-[1.01]'
                      : 'bg-slate-50/60 border-slate-200 text-slate-400 opacity-70 hover:opacity-100',
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={cn('flex h-8 w-8 items-center justify-center rounded-xl', isOn ? 'bg-sky-600 text-white' : 'bg-slate-200 text-sky-950')}>
                          {device.icon}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                          {device.room}
                        </span>
                      </div>

                      {/* Power Switch Button */}
                      <button
                        type="button"
                        className={cn(
                          'h-6 w-12 rounded-full transition-colors p-0.5 flex items-center',
                          isOn ? 'bg-sky-600 justify-end' : 'bg-slate-300 justify-start',
                        )}
                      >
                        <span className="h-5 w-5 rounded-full bg-white shadow-sm block" />
                      </button>
                    </div>

                    <h4 className={cn('text-xs font-bold line-clamp-1', isOn ? 'text-slate-900' : 'text-slate-500')}>
                      {device.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">{device.desc}</p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Công suất:</span>
                    <div className="flex items-center gap-1.5">
                      <span className={cn('font-bold', isOn ? 'text-sky-700' : 'text-slate-400')}>{device.inverterPower}W</span>
                      <span className="text-[10px] text-slate-400 line-through">({device.activePower}W)</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live Energy Consumption Meter */}
          <div className="rounded-3xl bg-slate-900 text-white p-6 shadow-xl space-y-5 flex flex-col justify-between border border-sky-500/20">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                  <Activity className="h-4 w-4" /> Đồng Hồ Tổng Tải Điện
                </span>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                  Realtime
                </span>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <span className="text-xs text-slate-400 block">Tổng công suất đang bật (Inverter):</span>
                  <p className="text-3xl font-black text-sky-300 mt-1">{totalInverterPower.toLocaleString('vi-VN')} Watts</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Nếu dùng thiết bị thường: <span className="line-through">{totalNormalPower.toLocaleString('vi-VN')} Watts</span>
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-800/90 p-4 border border-slate-700 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Mức giảm tải công suất:</span>
                    <span className="font-bold text-emerald-400">-{powerSaved} Watts</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Tiền điện tiết kiệm / tháng:</span>
                    <span className="font-bold text-emerald-400">~{formatCurrency(Math.round(powerSaved * 4 * 30 * 2.6))}</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-800 pt-3">
              💡 100% thiết bị điện gia dụng tại HomeMart đều tích hợp cảm biến thông minh tự ngắt khi quá nhiệt và biến tần Digital Inverter.
            </p>
          </div>
        </div>
      </section>

      {/* ─── 4. ĐỘT PHÁ 2: ĐẤU TRƯỜNG SO GĂNG SPECS (SPEC BATTLE ARENA) ─── */}
      <section id="dau-truong-specs" aria-label="Đấu trường so găng thông số" className="rounded-3xl bg-slate-900 text-white p-6 shadow-elevated md:p-8 space-y-6 border border-sky-500/20">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <Swords className="h-4 w-4" /> Đấu Trường Công Nghệ Điện Máy
            </span>
            <h2 className="text-2xl font-black text-white mt-1">
              So Găng Thông Số Công Nghệ Trực Diện
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Khám phá sự khác biệt vượt trội giữa thế hệ máy mới và công nghệ truyền thống
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {BATTLES.map((b) => (
              <button
                key={b.id}
                onClick={() => setActiveBattle(b.id)}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all',
                  activeBattle === b.id
                    ? 'bg-sky-400 text-sky-950 shadow-md scale-105'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700',
                )}
              >
                {b.title.split(' vs ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Spec Comparison Dual Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Tech A: Modern */}
          <div className="rounded-3xl bg-gradient-to-br from-sky-950/90 to-slate-900 border border-sky-400/40 p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="rounded-full bg-sky-400/20 px-3 py-0.5 text-xs font-extrabold text-sky-300 border border-sky-400/30">
                {currentBattle.techA.tag}
              </span>
              <span className="text-xs font-bold text-emerald-400">★ Khuyên Dùng</span>
            </div>

            <h3 className="text-lg font-black text-sky-200">{currentBattle.techA.name}</h3>

            <div className="space-y-2.5 text-xs border-t border-slate-800 pt-3">
              <div className="flex justify-between text-slate-300">
                <span>Công suất:</span>
                <span className="font-bold text-white">{currentBattle.techA.power}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Độ ồn hoạt động:</span>
                <span className="font-bold text-white">{currentBattle.techA.noise}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Bảo toàn vitamin:</span>
                <span className="font-bold text-emerald-400">{currentBattle.techA.vitaminPreserve}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Hiệu suất năng lượng:</span>
                <span className="font-bold text-sky-300">{currentBattle.techA.efficiency}</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed border-t border-slate-800 pt-3 italic">
              &quot;{currentBattle.techA.verdict}&quot;
            </p>
          </div>

          {/* Tech B: Traditional */}
          <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-6 space-y-4 opacity-80">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="rounded-full bg-slate-800 px-3 py-0.5 text-xs font-semibold text-slate-400">
                {currentBattle.techB.tag}
              </span>
              <span className="text-xs text-slate-500">Thế Hệ Cũ</span>
            </div>

            <h3 className="text-lg font-bold text-slate-300">{currentBattle.techB.name}</h3>

            <div className="space-y-2.5 text-xs border-t border-slate-800 pt-3">
              <div className="flex justify-between text-slate-400">
                <span>Công suất:</span>
                <span className="font-semibold text-slate-300">{currentBattle.techB.power}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Độ ồn hoạt động:</span>
                <span className="font-semibold text-slate-300">{currentBattle.techB.noise}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Bảo toàn vitamin:</span>
                <span className="font-semibold text-slate-300">{currentBattle.techB.vitaminPreserve}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Hiệu suất năng lượng:</span>
                <span className="font-semibold text-slate-300">{currentBattle.techB.efficiency}</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-800 pt-3 italic">
              &quot;{currentBattle.techB.verdict}&quot;
            </p>
          </div>
        </div>
      </section>

      {/* ─── 5. LƯỚI SẢN PHẨM ĐIỆN GIA DỤNG ─── */}
      <section id="san-pham" aria-label="Sản phẩm điện máy" className="scroll-mt-28 pt-4">
        <div ref={gridRef} className="scroll-mt-28" />

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2.5 text-xl font-black text-slate-900 md:text-2xl">
              <PackageCheck className="h-6 w-6 text-sky-600" />
              Thiết Bị Điện Gia Dụng Chính Hãng
            </h2>
            {query.data?.meta && (
              <p className="mt-0.5 text-xs text-slate-500">
                Hiển thị <strong>{query.data.meta.total.toLocaleString('vi-VN')}</strong> sản phẩm bảo hành điện tử chính hãng
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
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20 scale-105'
                      : 'bg-white text-sky-950 hover:bg-slate-50 border border-slate-200',
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
