'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  Camera,
  CheckCircle2,
  ChevronRight,
  Droplets,
  UtensilsCrossed,
  Cpu,
  Eye,
  Film,
  Flame,
  Home,
  Layers,
  Lightbulb,
  Moon,
  PackageCheck,
  Power,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sun,
  ThermometerSun,
  ToggleLeft,
  ToggleRight,
  Tv,
  Wifi,
  Zap,
} from 'lucide-react';
import { useCategories, useProducts, type ProductListParams } from '@/hooks/use-catalog';
import { ProductGrid } from '@/components/product/product-card';
import { ProductGridSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { MOTIFS } from '@/lib/category-themes';
import { cn } from '@/lib/utils';
import { toast } from '@/stores/toast-store';

const LIGHT_COLORS = [
  { id: 'warm', name: 'Ấm Áp 2700K', hex: '#fbbf24', bg: 'bg-amber-400', glow: 'shadow-[0_0_25px_rgba(251,191,36,0.5)]' },
  { id: 'cyan', name: 'Cyber Cyan 6500K', hex: '#22d3ee', bg: 'bg-cyan-400', glow: 'shadow-[0_0_25px_rgba(34,211,238,0.5)]' },
  { id: 'purple', name: 'Neon Violet', hex: '#c084fc', bg: 'bg-purple-400', glow: 'shadow-[0_0_25px_rgba(192,132,252,0.5)]' },
  { id: 'emerald', name: 'Aurora Green', hex: '#34d399', bg: 'bg-emerald-400', glow: 'shadow-[0_0_25px_rgba(52,211,153,0.5)]' },
];

const AUTOMATION_TRIGGERS = [
  { id: 'door-open', title: 'Cửa mở sau 18:00 (Cảm biến cửa)', icon: '🚪' },
  { id: 'motion-detected', title: 'Phát hiện có người bước vào (mmWave)', icon: '🚶' },
  { id: 'high-temp', title: 'Nhiệt độ phòng > 28°C (Cảm biến nhiệt)', icon: '🌡️' },
  { id: 'voice-night', title: 'Nói "Hey Google, chúc ngủ ngon"', icon: '🗣️' },
];

const AUTOMATION_ACTIONS = [
  { id: 'light-on', title: 'Bật đèn ấm 2700K 50% & Bật máy lọc khí', icon: '💡' },
  { id: 'ac-on', title: 'Bật điều hòa 25°C & Kéo rèm cửa', icon: '❄️' },
  { id: 'lock-camera', title: 'Khóa cửa vân tay & Kích hoạt camera an ninh', icon: '🔒' },
  { id: 'all-off', title: 'Tắt toàn bộ thiết bị & Chuyển đèn ngủ 3%', icon: '🌙' },
];

const ECOSYSTEMS = [
  { name: 'Apple HomeKit', icon: Smartphone, tag: 'Bảo mật Siri & Home App' },
  { name: 'Google Home', icon: Radio, tag: 'Điều khiển bằng Google Assistant' },
  { name: 'Xiaomi Mi Home', icon: Cpu, tag: 'Hệ sinh thái thiết bị phong phú' },
  { name: 'Matter & Zigbee 3.0', icon: Wifi, tag: 'Chuẩn mở kết nối không trễ <50ms' },
];

const SORT_TABS = [
  { value: 'best_selling', label: 'Bán chạy nhất' },
  { value: 'newest', label: 'Hàng mới về' },
  { value: 'rating', label: 'Đánh giá cao' },
  { value: 'price_asc', label: 'Giá thấp → cao' },
  { value: 'price_desc', label: 'Giá cao → thấp' },
] as const;

type SortValue = (typeof SORT_TABS)[number]['value'];

export function SmartHomeCategoryView({ slug = 'nha-thong-minh' }: { slug?: string }) {
  const { data: categories, isLoading: catLoading } = useCategories();
  const category = useMemo(
    () => (categories ?? []).find((c) => c.slug === slug),
    [categories, slug],
  );

  // Smart OS State
  const [livingLight, setLivingLight] = useState<boolean>(true);
  const [kitchenLight, setKitchenLight] = useState<boolean>(false);
  const [bedroomLight, setBedroomLight] = useState<boolean>(true);
  const [selectedColorIdx, setSelectedColorIdx] = useState<number>(1);
  const [brightness, setBrightness] = useState<number>(75);

  // Automation Flow Builder State
  const [selectedTrigger, setSelectedTrigger] = useState<string>(AUTOMATION_TRIGGERS[0].id);
  const [selectedAction, setSelectedAction] = useState<string>(AUTOMATION_ACTIONS[0].id);

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

  const currentColor = LIGHT_COLORS[selectedColorIdx];
  const triggerObj = AUTOMATION_TRIGGERS.find((t) => t.id === selectedTrigger) ?? AUTOMATION_TRIGGERS[0];
  const actionObj = AUTOMATION_ACTIONS.find((a) => a.id === selectedAction) ?? AUTOMATION_ACTIONS[0];

  const handleDeployAutomation = () => {
    toast.success(`Đã lưu kịch bản: [NẾU ${triggerObj.title}] ➔ [THÌ ${actionObj.title}]!`);
  };

  const changePage = (p: number) => {
    setPage(p);
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-12">
      {/* ─── 1. CYBER DARK SMART HOME HUB HERO ─── */}
      <section
        aria-label="Trung Tâm Nhà Thông Minh"
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 text-white shadow-elevated ring-1 ring-indigo-500/30"
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-30"
          style={{ backgroundImage: MOTIFS.circuit }}
        />
        <div
          aria-hidden
          className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl"
        />

        <div className="relative mx-auto max-w-7xl px-6 py-10 md:px-12 md:py-14">
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-xs text-indigo-300/80 font-medium">
            <Link href="/" className="transition-colors hover:text-white">
              Trang chủ
            </Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/products" className="transition-colors hover:text-white">
              Danh mục
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="font-bold text-white">Nhà Thông Minh</span>
          </nav>

          <div className="grid gap-8 lg:grid-cols-[1.3fr_0.9fr] lg:items-center">
            <div>
              <div className="mb-3.5 inline-flex items-center gap-2 rounded-full bg-cyan-500/20 px-4 py-1 text-xs font-bold uppercase tracking-wider text-cyan-300 backdrop-blur-md ring-1 ring-cyan-400/30">
                <Radio className="h-4 w-4 animate-pulse" /> Hệ Sinh Thái Smart Home 2026
              </div>

              <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl text-balance">
                Ngôi Nhà Thấu Hiểu & <br />
                <span className="text-cyan-300">Tự Động Hóa Trong 1 Chạm</span>
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-relaxed text-indigo-100/90 sm:text-base">
                Trải nghiệm <strong>Bảng Điều Khiển Smart Home OS</strong> và <strong>Bộ Kéo Nối Tự Động Hóa Logic</strong> — Trực tiếp bật/tắt đèn, đổi màu ánh sáng và lập trình kịch bản tự động cho tổ ấm tương lai.
              </p>

              <div className="mt-8 flex flex-wrap gap-3.5">
                <a
                  href="#smart-os-dashboard"
                  className="inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 px-6 text-sm font-black text-cyan-950 shadow-lg shadow-cyan-500/30 transition-all hover:scale-105 hover:shadow-xl"
                >
                  <Cpu className="h-4 w-4" /> Mở Bảng Điều Khiển OS
                </a>
                <a
                  href="#automation-builder"
                  className="inline-flex h-12 items-center rounded-xl border border-white/20 bg-white/10 px-6 text-sm font-bold text-white backdrop-blur-md hover:bg-white/20"
                >
                  Ghép Nối Kịch Bản Logic
                </a>
              </div>
            </div>

            {/* Smart Home Hub Spec Card */}
            <div className="rounded-3xl border border-indigo-400/30 bg-slate-900/80 p-6 backdrop-blur-md shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-indigo-500/20 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400 text-cyan-950 font-black">
                    <Activity className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Mạng Mesh Zigbee 3.0 & Matter</h3>
                    <p className="text-xs text-cyan-300">Phản hồi tức thì không cần Internet</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-300 ring-1 ring-emerald-400/30">
                  Online
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-2xl bg-white/5 p-3 border border-white/10">
                  <p className="text-indigo-200">Độ trễ phản hồi:</p>
                  <p className="text-base font-extrabold text-cyan-300 mt-0.5">&lt; 50 ms</p>
                  <p className="text-[10px] text-indigo-300">Chuẩn Matter Quốc Tế</p>
                </div>
                <div className="rounded-2xl bg-white/5 p-3 border border-white/10">
                  <p className="text-indigo-200">Bảo mật chuẩn Apple:</p>
                  <p className="text-base font-extrabold text-emerald-300 mt-0.5">End-to-End</p>
                  <p className="text-[10px] text-indigo-300">Mã hóa dữ liệu tại chỗ</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. DANH MỤC CON IOT ─── */}
      {(category?.children?.length ?? 0) > 0 && (
        <section aria-label="Nhóm thiết bị smart home" className="rounded-3xl bg-indigo-50/80 p-5 shadow-card ring-1 ring-indigo-200/70">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-900 mr-2 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-indigo-600" /> Thiết bị Smart Home:
            </span>
            {category!.children!.map((child) => (
              <Link
                key={child.id}
                href={`/products?categoryId=${child.id}`}
                className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-indigo-950 shadow-sm transition-all hover:bg-indigo-100 hover:-translate-y-0.5 hover:shadow ring-1 ring-indigo-200/50"
              >
                {child.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ─── 3. ĐỘT PHÁ 1: BẢNG ĐIỀU KHIỂN SMART HOME OS LIVE DASHBOARD ─── */}
      <section id="smart-os-dashboard" aria-label="Bảng điều khiển smart home OS" className="rounded-3xl bg-slate-900 text-white p-6 shadow-card ring-1 ring-indigo-500/30 md:p-8 space-y-8 border border-indigo-500/20">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-black uppercase tracking-wider text-cyan-300 mb-2 border border-cyan-500/30">
              <Activity className="h-3.5 w-3.5" /> Bảng Điều Khiển Cảm Ứng (Smart Hub OS)
            </div>
            <h2 className="text-2xl font-black text-white md:text-3xl">
              Bật/Tắt & Thay Đổi Ánh Sáng Căn Hộ Trực Tiếp
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Thử bấm các công tắc cảm ứng và chọn màu sắc LED để trải nghiệm khả năng điều khiển thời gian thực
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-2 rounded-2xl border border-slate-700 text-xs">
            <span className="flex items-center gap-1.5 text-cyan-300">
              <ThermometerSun className="h-4 w-4" /> 25.5°C
            </span>
            <span className="text-slate-600">|</span>
            <span className="flex items-center gap-1.5 text-emerald-300">
              <Droplets className="h-4 w-4" /> 58% RH
            </span>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Room Light Switches */}
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 block">
              💡 Công Tắc Cảm Ứng Từng Phòng:
            </span>

            {/* Living room switch */}
            <div
              onClick={() => setLivingLight(!livingLight)}
              className={cn(
                'flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer select-none',
                livingLight
                  ? 'bg-slate-800/90 border-cyan-400 ring-2 ring-cyan-400/30 shadow-md'
                  : 'bg-slate-900 border-slate-800 text-cyan-950',
              )}
            >
              <div className="flex items-center gap-3">
                <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', livingLight ? 'bg-cyan-400 text-cyan-950 font-black' : 'bg-slate-800 text-cyan-950')}>
                  <Lightbulb className="h-5 w-5" />
                </span>
                <div>
                  <h4 className="text-xs font-bold text-white">Đèn Phòng Khách</h4>
                  <p className="text-[10px] text-slate-400">{livingLight ? `Đang bật • ${brightness}%` : 'Đang tắt'}</p>
                </div>
              </div>
              <button type="button" className={cn('h-6 w-11 rounded-full transition-colors p-0.5 flex items-center', livingLight ? 'bg-cyan-400 justify-end' : 'bg-slate-700 justify-start')}>
                <span className="h-5 w-5 rounded-full bg-slate-950 block" />
              </button>
            </div>

            {/* Kitchen switch */}
            <div
              onClick={() => setKitchenLight(!kitchenLight)}
              className={cn(
                'flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer select-none',
                kitchenLight
                  ? 'bg-slate-800/90 border-cyan-400 ring-2 ring-cyan-400/30 shadow-md'
                  : 'bg-slate-900 border-slate-800 text-cyan-950',
              )}
            >
              <div className="flex items-center gap-3">
                <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', kitchenLight ? 'bg-cyan-400 text-cyan-950 font-black' : 'bg-slate-800 text-cyan-950')}>
                  <UtensilsCrossed className="h-5 w-5" />
                </span>
                <div>
                  <h4 className="text-xs font-bold text-white">Đèn Đảo Bếp</h4>
                  <p className="text-[10px] text-slate-400">{kitchenLight ? 'Đang bật • 100%' : 'Đang tắt'}</p>
                </div>
              </div>
              <button type="button" className={cn('h-6 w-11 rounded-full transition-colors p-0.5 flex items-center', kitchenLight ? 'bg-cyan-400 justify-end' : 'bg-slate-700 justify-start')}>
                <span className="h-5 w-5 rounded-full bg-slate-950 block" />
              </button>
            </div>

            {/* Bedroom switch */}
            <div
              onClick={() => setBedroomLight(!bedroomLight)}
              className={cn(
                'flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer select-none',
                bedroomLight
                  ? 'bg-slate-800/90 border-cyan-400 ring-2 ring-cyan-400/30 shadow-md'
                  : 'bg-slate-900 border-slate-800 text-cyan-950',
              )}
            >
              <div className="flex items-center gap-3">
                <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', bedroomLight ? 'bg-cyan-400 text-cyan-950 font-black' : 'bg-slate-800 text-cyan-950')}>
                  <Moon className="h-5 w-5" />
                </span>
                <div>
                  <h4 className="text-xs font-bold text-white">Đèn Ngủ Thư Giãn</h4>
                  <p className="text-[10px] text-slate-400">{bedroomLight ? 'Đang bật • 20%' : 'Đang tắt'}</p>
                </div>
              </div>
              <button type="button" className={cn('h-6 w-11 rounded-full transition-colors p-0.5 flex items-center', bedroomLight ? 'bg-cyan-400 justify-end' : 'bg-slate-700 justify-start')}>
                <span className="h-5 w-5 rounded-full bg-slate-950 block" />
              </button>
            </div>
          </div>

          {/* LED RGB Color & Brightness Controller */}
          <div className="rounded-3xl bg-slate-800/80 p-5 border border-slate-700 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-300 block">
              🎨 Điều Chỉnh Dải LED Neon RGB:
            </span>

            {/* Ambient visual bulb */}
            <div className={cn('h-24 rounded-2xl flex items-center justify-center transition-all duration-300 border border-white/20', currentColor.glow)} style={{ backgroundColor: currentColor.hex + '33' }}>
              <div className="text-center">
                <Lightbulb className="h-8 w-8 mx-auto" style={{ color: currentColor.hex }} />
                <span className="text-xs font-bold text-white mt-1 block">{currentColor.name}</span>
              </div>
            </div>

            {/* Color Swatch Selectors */}
            <div className="grid grid-cols-4 gap-2">
              {LIGHT_COLORS.map((col, idx) => (
                <button
                  key={col.id}
                  onClick={() => setSelectedColorIdx(idx)}
                  className={cn(
                    'h-9 rounded-xl border transition-all flex items-center justify-center',
                    selectedColorIdx === idx ? 'ring-2 ring-white scale-105' : 'opacity-70 hover:opacity-100',
                  )}
                  style={{ backgroundColor: col.hex }}
                  aria-label={col.name}
                >
                  {selectedColorIdx === idx && <CheckCircle2 className="h-4 w-4 text-cyan-950" />}
                </button>
              ))}
            </div>

            {/* Brightness Slider */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[11px] text-slate-400 font-bold">
                <span>Độ sáng:</span>
                <span className="text-cyan-300">{brightness}%</span>
              </div>
              <input
                type="range"
                min={5}
                max={100}
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                aria-label="Độ sáng đèn"
              />
            </div>
          </div>

          {/* Live Security Camera Simulator */}
          <div className="rounded-3xl bg-slate-800/80 p-5 border border-slate-700 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Camera className="h-4 w-4" /> Camera AI Phòng Khách
                </span>
                <span className="flex items-center gap-1 text-[10px] text-red-400 font-mono">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" /> LIVE 2K
                </span>
              </div>

              <div className="mt-3 relative h-28 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: MOTIFS.circuit }} />
                <div className="text-center z-10 space-y-1">
                  <ShieldCheck className="h-7 w-7 mx-auto text-emerald-400" />
                  <p className="text-[11px] text-slate-300 font-bold">Khu Vực An Toàn — 0 Đột Nhập</p>
                  <p className="text-[9px] text-cyan-950">Góc quét 360° • Nhận diện người AI</p>
                </div>
              </div>
            </div>

            <Link
              href="/products?q=camera"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 py-2.5 text-xs font-black text-cyan-950 hover:bg-cyan-300 shadow-md transition-all"
            >
              Xem Chi Tiết Camera AI <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── 4. ĐỘT PHÁ 2: BỘ XÂY DỰNG TỰ ĐỘNG HÓA LOGIC (NODE AUTOMATION BUILDER) ─── */}
      <section id="automation-builder" aria-label="Ghép nối kịch bản logic" className="rounded-3xl bg-slate-950 text-white p-6 shadow-card ring-1 ring-indigo-500/20 md:p-8 space-y-6 border border-zinc-800">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              ⚡ Logic Kéo Ghép Tự Động Hóa (IFTTT Engine)
            </span>
            <h2 className="text-2xl font-black text-white mt-1">
              Tự Tay Thiết Lập Kịch Bản Tự Động [NẾU ➔ THÌ]
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Chọn điều kiện kích hoạt và hành động tương ứng để lưu vào ứng dụng điện thoại
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_auto_1fr] items-center">
          {/* Triggers Column */}
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 block">
              1. Điều Kiện Kích Hoạt [NẾU / TRIGGER]:
            </span>
            <div className="space-y-2">
              {AUTOMATION_TRIGGERS.map((trig) => (
                <button
                  key={trig.id}
                  onClick={() => setSelectedTrigger(trig.id)}
                  className={cn(
                    'w-full text-left p-3.5 rounded-2xl border transition-all text-xs font-bold flex items-center gap-3',
                    selectedTrigger === trig.id
                      ? 'bg-indigo-900/90 border-cyan-400 text-white ring-2 ring-cyan-400/30 shadow-md scale-[1.01]'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800',
                  )}
                >
                  <span className="text-xl">{trig.icon}</span>
                  <span>{trig.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Logic Arrow */}
          <div className="flex flex-col items-center justify-center p-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400 text-cyan-950 font-black shadow-lg shadow-cyan-400/30">
              ➔
            </span>
          </div>

          {/* Actions Column */}
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-300 block">
              2. Hành Động Tự Động [THÌ / ACTION]:
            </span>
            <div className="space-y-2">
              {AUTOMATION_ACTIONS.map((act) => (
                <button
                  key={act.id}
                  onClick={() => setSelectedAction(act.id)}
                  className={cn(
                    'w-full text-left p-3.5 rounded-2xl border transition-all text-xs font-bold flex items-center gap-3',
                    selectedAction === act.id
                      ? 'bg-sky-900/90 border-sky-400 text-white ring-2 ring-purple-400/30 shadow-md scale-[1.01]'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800',
                  )}
                >
                  <span className="text-xl">{act.icon}</span>
                  <span>{act.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Deploy Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-sky-950 p-5 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-xs space-y-1">
            <p className="text-cyan-300 font-bold">Kịch bản đã thiết lập:</p>
            <p className="text-slate-200">
              Khi <strong>&quot;{triggerObj.title}&quot;</strong> ➔ Tự động <strong>&quot;{actionObj.title}&quot;</strong>
            </p>
          </div>

          <button
            onClick={handleDeployAutomation}
            className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 px-6 py-3 text-xs font-black text-cyan-950 hover:from-cyan-300 hover:to-indigo-400 shadow-lg shadow-cyan-400/20 active:scale-95 transition-all"
          >
            <Zap className="h-4 w-4" /> Kích Hoạt Kịch Bản Này
          </button>
        </div>
      </section>

      {/* ─── 5. LƯỚI SẢN PHẨM NHÀ THÔNG MINH ─── */}
      <section id="san-pham" aria-label="Sản phẩm nhà thông minh" className="scroll-mt-28 pt-4">
        <div ref={gridRef} className="scroll-mt-28" />

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2.5 text-xl font-black text-slate-900 md:text-2xl">
              <PackageCheck className="h-6 w-6 text-indigo-600" />
              Thiết Bị Nhà Thông Minh Bán Chạy Nhất
            </h2>
            {query.data?.meta && (
              <p className="mt-0.5 text-xs text-cyan-950">
                Hiển thị <strong>{query.data.meta.total.toLocaleString('vi-VN')}</strong> thiết bị IoT chính hãng
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
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 scale-105'
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
