'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChefHat,
  ChevronRight,
  Eye,
  Flame,
  Layers,
  LayoutGrid,
  PackageCheck,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  ThermometerSun,
  Timer,
  Utensils,
  UtensilsCrossed,
} from 'lucide-react';
import { useCategories, useProducts, type ProductListParams } from '@/hooks/use-catalog';
import { ProductGrid } from '@/components/product/product-card';
import { ProductGridSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { MOTIFS } from '@/lib/category-themes';
import { cn, formatCurrency } from '@/lib/utils';
import { toast } from '@/stores/toast-store';
import { useCartStore } from '@/stores/cart-store';

interface RecipeCooktop {
  id: string;
  name: string;
  category: string;
  cookTime: string;
  temp: string;
  tagline: string;
  badge: string;
  cooktopImage: string;
  requiredTools: {
    name: string;
    role: string;
    material: string;
    price: number;
  }[];
  chefSecret: string;
  keywords: string;
}

const RECIPES: RecipeCooktop[] = [
  {
    id: 'ca-kho-to',
    name: 'Cá Bống Kho Tộ & Canh Cua Mồng Tơi',
    category: 'Món Kho Gia Truyền',
    cookTime: '45 phút',
    temp: 'Lửa liu riu 120°C',
    tagline: 'Món ăn đậm đà đưa cơm của mọi bữa cơm gia đình Việt',
    badge: 'Món Ăn Dân Dã',
    cooktopImage: '🍲',
    requiredTools: [
      { name: 'Nồi Sứ Tráng Men Kho Tộ Chịu Nhiệt', role: 'Kho cá đượm vị, giữ nóng lâu', material: 'Gốm nung cao cấp', price: 320000 },
      { name: 'Chảo Vân Đá Maifan Phi Hành Tỏi', role: 'Phi thơm gia vị không dính', material: 'Hợp kim nhôm đúc', price: 290000 },
      { name: 'Thớt Gỗ Teak Tự Nhiên Chống Mốc', role: 'Thái lát ớt, hành, thịt ba chỉ', material: 'Gỗ Teak nguyên khối', price: 250000 },
      { name: 'Bộ Dao Rèn Thép Không Gỉ Sắc Bén', role: 'Đánh vảy và mổ cá ngọt lịm', material: 'Thép Đức 50Cr15MoV', price: 380000 },
    ],
    chefSecret: 'Kho cá bằng nồi tộ đáy dày với nước hàng tự thắng giúp thịt cá chắc nịch, ngấm đượm màu cánh gián mà không bị nát.',
    keywords: 'nồi sứ',
  },
  {
    id: 'bo-bit-tet',
    name: 'Bò Bít Tết Sốt Tiêu & Măng Tây Áp Chảo',
    category: 'Món Âu Hiện Đại',
    cookTime: '15 phút',
    temp: 'Nhiệt độ cao 220°C',
    tagline: 'Thịt bò mềm mọng nước chuẩn nhà hàng 5 sao tại gia',
    badge: 'Nhà Hàng Tại Gia',
    cooktopImage: '🥩',
    requiredTools: [
      { name: 'Chảo Gang Đúc Nguyên Khối Giữ Nhiệt', role: 'Tạo lớp vỏ xém vàng giòn rụm', material: 'Gang đúc tự nhiên', price: 450000 },
      { name: 'Kẹp Gắp Thịt Inox 304 Khóa An Toàn', role: 'Lật thịt không làm rách thớ', material: 'Inox 304 dày 1.5mm', price: 95000 },
      { name: 'Nồi Inox 304 Nấu Sốt Tiêu Đen', role: 'Nấu sốt mịn sánh không cháy', material: 'Đáy 3 lớp Tri-Ply', price: 280000 },
    ],
    chefSecret: 'Chảo gang đúc giữ nhiệt cực cao giúp khóa chặt nước ngọt bên trong miếng thịt ngay từ giây đầu tiên áp chảo.',
    keywords: 'chảo gang',
  },
  {
    id: 'banh-xeo',
    name: 'Bánh Xèo Giòn Rụm & Nem Rán Hà Nội',
    category: 'Món Chiên Rán Giòn',
    cookTime: '30 phút',
    temp: 'Nhiệt đều 180°C',
    tagline: 'Vỏ bánh mỏng tang vàng ươm, ít ngấm dầu mỡ',
    badge: 'Chiên Rán Ít Dầu',
    cooktopImage: '🥞',
    requiredTools: [
      { name: 'Chảo Sâu Lòng Chống Dính Vân Đá 28cm', role: 'Láng bột mỏng và lật bánh giòn tan', material: 'Vân đá khoáng Maifan', price: 350000 },
      { name: 'Vỉ Gác Ráo Dầu Bán Nguyệt Inox', role: 'Giữ bánh nóng giòn không đọng mỡ', material: 'Inox 304', price: 85000 },
      { name: 'Bộ Cọ Quét Dầu Silicon Chịu Nhiệt', role: 'Quét dầu mỏng đều mặt chảo', material: 'Silicon thực phẩm 230°C', price: 45000 },
    ],
    chefSecret: 'Chảo vân đá maifan truyền nhiệt đều từ đáy lên thành chảo giúp vành bánh xèo bung giòn tự nhiên mà không cần nhiều dầu.',
    keywords: 'chảo chống dính',
  },
  {
    id: 'pho-bo',
    name: 'Phở Bò Gia Truyền & Nước Dùng Hầm Xương',
    category: 'Món Canh & Hầm Dài Lâu',
    cookTime: '3 - 6 tiếng',
    temp: 'Nhiệt độ ổn định 95°C',
    tagline: 'Nước dùng trong vắt, ngọt thanh từ tủy xương hầm',
    badge: 'Hầm Xương Đậm Vị',
    cooktopImage: '🍲',
    requiredTools: [
      { name: 'Nồi Hầm Inox 304 Dung Tích Lớn 10L', role: 'Hầm xương ống nước trong ngọt lịm', material: 'Inox 304 đúc 3 lớp', price: 890000 },
      { name: 'Vá Lọc Bọt & Túi Lưới Thảo Mộc', role: 'Lọc sạch váng mỡ và giữ hoa hồi', material: 'Lưới inox siêu mịn', price: 75000 },
      { name: 'Muôi Múc Nước Dùng Inox Cán Dài', role: 'Chan nước dùng nóng hổi tiện lợi', material: 'Inox 304 đúc liền khối', price: 110000 },
    ],
    chefSecret: 'Nồi hầm inox 3 lớp đáy đúc giữ nhiệt liên tục ở mức sôi lăn tăn, giúp tủy xương tiết hết chất ngọt mà nước dùng không bị đục.',
    keywords: 'nồi inox',
  },
  {
    id: 'lam-banh',
    name: 'Bánh Bông Lan & Tráng Miệng Cuối Tuần',
    category: 'Làm Bánh & Tráng Miệng',
    cookTime: '40 phút',
    temp: 'Lò nướng 165°C',
    tagline: 'Cốt bánh nở phồng xốp mềm, thơm lừng hương bơ',
    badge: 'Tiệm Bánh Tại Gia',
    cooktopImage: '🍰',
    requiredTools: [
      { name: 'Âu Trộn Bột Thủy Tinh Chịu Nhiệt 2.5L', role: 'Đánh bông lòng trắng trứng dễ quan sát', material: 'Thủy tinh Borosilicate', price: 180000 },
      { name: 'Phới Lồng Đánh Trứng Inox Cầm Tay', role: 'Trộn bột fold nhẹ tay không vỡ bọt khí', material: 'Thép không gỉ 304', price: 65000 },
      { name: 'Khuôn Nướng Bánh Chống Dính Đáy Rời', role: 'Lấy bánh nguyên khối không dính thành', material: 'Thép carbon tráng chống dính', price: 140000 },
    ],
    chefSecret: 'Dùng âu thủy tinh đã làm mát để đánh bông lòng trắng trứng giúp bọt khí cứng mịn, cốt bánh nở cao xốp mềm.',
    keywords: 'hộp thủy tinh',
  },
];

const MATERIALS = [
  {
    name: 'Inox 304 Tri-Ply 3 Lớp',
    tag: 'Bền Vĩnh Cửu',
    desc: 'Cấu trúc 3 lớp nguyên khối (Inox 304 - Lõi Nhôm - Inox 430 bắt từ). Không tróc lớp phủ, an toàn tuyệt đối trọn đời.',
    heatSpeed: 98,
    heatRetention: 95,
    durability: 100,
    nonStick: 75,
  },
  {
    name: 'Vân Đá Maifan Tự Nhiên',
    tag: 'Chiên Rán Không Dầu',
    desc: 'Bề mặt phủ 5 lớp tinh thể khoáng đá Maifan tự nhiên. Chống trầy xước gấp 4 lần chống dính Teflon thông thường.',
    heatSpeed: 92,
    heatRetention: 88,
    durability: 90,
    nonStick: 99,
  },
  {
    name: 'Gang Đúc (Cast Iron)',
    tag: 'Áp Chảo Đỉnh Cao',
    desc: 'Giữ nhiệt lượng khổng lồ, tạo lớp chống dính tự nhiên nhờ tôi dầu (seasoning). Dùng được trên lửa củi, lò nướng và bếp từ.',
    heatSpeed: 80,
    heatRetention: 100,
    durability: 100,
    nonStick: 85,
  },
  {
    name: 'Gốm Sứ Chịu Nhiệt Cao Cấp',
    tag: 'Kho Nấu Đậm Vị',
    desc: 'Đất sét tự nhiên nung ở 1300°C tráng men bóng. Giữ nhiệt trên bàn ăn tới 45 phút, không phản ứng với muối mặn & axit.',
    heatSpeed: 85,
    heatRetention: 98,
    durability: 92,
    nonStick: 90,
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

export function KitchenCategoryView({ slug = 'nha-bep' }: { slug?: string }) {
  const { data: categories, isLoading: catLoading } = useCategories();
  const category = useMemo(
    () => (categories ?? []).find((c) => c.slug === slug),
    [categories, slug],
  );

  const [activeRecipe, setActiveRecipe] = useState<string>(RECIPES[0].id);
  const [selectedMaterial, setSelectedMaterial] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'studio' | 'catalog'>('studio');
  const [sort, setSort] = useState<SortValue>('best_selling');
  const [page, setPage] = useState(1);
  const gridRef = useRef<HTMLDivElement>(null);
  const setCartCount = useCartStore((s) => s.setCount);
  const cartCount = useCartStore((s) => s.count);

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

  const currentRecipe = RECIPES.find((r) => r.id === activeRecipe) ?? RECIPES[0];
  const bundleTotal = currentRecipe.requiredTools.reduce((s, t) => s + t.price, 0);
  const bundleDiscounted = Math.round(bundleTotal * 0.85);

  const handleAddBundle = () => {
    setCartCount(cartCount + currentRecipe.requiredTools.length);
    toast.success(`Đã thêm combo ${currentRecipe.requiredTools.length} dụng cụ cho món "${currentRecipe.name}" vào giỏ hàng!`);
  };

  const changePage = (p: number) => {
    setPage(p);
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-12">
      {/* ─── 1. KITCHEN STUDIO HERO & VIEW SWITCHER ─── */}
      <section
        aria-label="Studio Bếp HomeMart"
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-950 via-amber-900 to-orange-800 text-white shadow-elevated"
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-15"
          style={{ backgroundImage: MOTIFS.tiles }}
        />
        <div
          aria-hidden
          className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-amber-500/25 blur-3xl"
        />

        <div className="relative mx-auto max-w-7xl px-6 py-10 md:px-12 md:py-14">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-amber-200/90 font-medium">
              <Link href="/" className="transition-colors hover:text-white">
                Trang chủ
              </Link>
              <ChevronRight className="h-3 w-3" />
              <Link href="/products" className="transition-colors hover:text-white">
                Danh mục
              </Link>
              <ChevronRight className="h-3 w-3" />
              <span className="font-bold text-white">Nhà Bếp</span>
            </nav>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1.5 rounded-2xl bg-black/30 p-1 backdrop-blur-md border border-white/15">
              <button
                onClick={() => setViewMode('studio')}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all',
                  viewMode === 'studio'
                    ? 'bg-amber-400 text-amber-950 shadow-md'
                    : 'text-amber-100 hover:text-white',
                )}
              >
                <ChefHat className="h-3.5 w-3.5" /> Bàn Bếp Ảo Studio
              </button>
              <button
                onClick={() => setViewMode('catalog')}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all',
                  viewMode === 'catalog'
                    ? 'bg-amber-400 text-amber-950 shadow-md'
                    : 'text-amber-100 hover:text-white',
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Lưới Sản Phẩm
              </button>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.3fr_0.9fr] lg:items-center">
            <div>
              <div className="mb-3.5 inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-4 py-1 text-xs font-bold uppercase tracking-wider text-amber-300 backdrop-blur-md ring-1 ring-amber-400/30">
                <ChefHat className="h-4 w-4" /> Studio Ẩm Thực Bếp Việt
              </div>

              <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl text-balance">
                Không Gian Bếp Của Những <br />
                <span className="text-amber-300">Bữa Cơm Đượm Vị Yêu Thương</span>
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-relaxed text-amber-100/90 sm:text-base">
                Trải nghiệm <strong>Bàn Bếp Ảo Tương Tác</strong> — Chọn món ăn yêu thích của bạn, hệ thống sẽ tự động ghép nối và gợi ý bộ nồi chảo, dao kéo chuẩn bị sẵn sàng cho bữa cơm ngon nhất.
              </p>

              <div className="mt-8 flex flex-wrap gap-3.5">
                <a
                  href="#ban-bep-ao"
                  className="inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 px-6 text-sm font-black text-amber-950 shadow-lg shadow-amber-500/30 transition-all hover:scale-105 hover:shadow-xl"
                >
                  <Utensils className="h-4 w-4" /> Bật Bàn Bếp Nấu Ăn
                </a>
                <a
                  href="#so-sanh-chat-lieu"
                  className="inline-flex h-12 items-center rounded-xl border border-white/30 bg-white/10 px-6 text-sm font-bold text-white backdrop-blur-md hover:bg-white/20"
                >
                  So Sánh Chất Liệu Nồi Chảo
                </a>
              </div>
            </div>

            {/* Chef's Trust Guarantee Card */}
            <div className="rounded-3xl border border-amber-300/30 bg-amber-950/50 p-6 backdrop-blur-md shadow-2xl space-y-4">
              <div className="flex items-center gap-3 border-b border-amber-500/20 pb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400 text-amber-950 font-black">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Tiêu Chuẩn Đồ Bếp HomeMart</h3>
                  <p className="text-xs text-amber-200">100% An toàn thực phẩm y tế</p>
                </div>
              </div>

              <ul className="space-y-2.5 text-xs text-amber-100">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>Inox 304 đúc 3 lớp, không thôi nhiễm chất độc hại vào thức ăn</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>Chống dính Maifan tự nhiên tuyệt đối không chứa PFOA/PTFE/Chì</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>Đáy từ nguyên khối — Bắt nhiệt siêu nhanh trên mọi loại bếp gas và từ</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. NHÓM ĐỒ BẾP NHANH ─── */}
      {(category?.children?.length ?? 0) > 0 && (
        <section aria-label="Nhóm đồ bếp" className="rounded-3xl bg-amber-50/80 p-5 shadow-card ring-1 ring-amber-200/70">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-black uppercase tracking-wider text-amber-900 mr-2 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-amber-600" /> Nhóm đồ bếp:
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

      {/* ─── 3. ĐỘT PHÁ: BÀN BẾP ẢO TƯƠNG TÁC (INTERACTIVE COOKTOP CANVAS) ─── */}
      <section id="ban-bep-ao" aria-label="Bàn bếp ảo tương tác" className="rounded-3xl bg-white p-6 shadow-card ring-1 ring-amber-200/80 md:p-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-800 mb-2">
              <BookOpen className="h-3.5 w-3.5 text-amber-600" /> Sổ Công Thức & Dụng Cụ Bếp Việt
            </div>
            <h2 className="text-2xl font-black text-slate-900 md:text-3xl">
              Chọn Món Ăn — Bàn Bếp Tự Động Lắp Ráp Dụng Cụ
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Bấm vào từng món ăn để xem mô phỏng bộ dụng cụ cần có và công thức nấu chuẩn vị
            </p>
          </div>
        </div>

        {/* Recipe Selector Horizontal Strip */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {RECIPES.map((recipe) => {
            const isSelected = activeRecipe === recipe.id;

            return (
              <button
                key={recipe.id}
                onClick={() => setActiveRecipe(recipe.id)}
                className={cn(
                  'flex flex-col text-left p-4 rounded-2xl transition-all duration-300 border relative overflow-hidden',
                  isSelected
                    ? 'bg-gradient-to-br from-amber-900 to-orange-950 text-white border-amber-500 shadow-xl ring-2 ring-amber-400 scale-[1.03]'
                    : 'bg-amber-50/40 text-amber-950 border-amber-200/60 hover:bg-amber-50 hover:border-amber-300',
                )}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <span className="text-2xl">{recipe.cooktopImage}</span>
                  {isSelected && <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />}
                </div>
                <span className={cn('text-[10px] font-extrabold uppercase tracking-wider block', isSelected ? 'text-amber-300' : 'text-amber-700')}>
                  {recipe.badge}
                </span>
                <h3 className={cn('text-xs font-bold line-clamp-2 mt-1 leading-snug', isSelected ? 'text-white' : 'text-slate-900')}>
                  {recipe.name}
                </h3>
              </button>
            );
          })}
        </div>

        {/* Virtual Cooktop Studio Canvas */}
        <div className="rounded-3xl bg-slate-900 text-white p-6 md:p-8 shadow-2xl space-y-6 relative overflow-hidden border border-amber-500/20">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{currentRecipe.cooktopImage}</span>
                <div>
                  <h3 className="text-xl font-black text-amber-300">{currentRecipe.name}</h3>
                  <p className="text-xs text-slate-400">{currentRecipe.tagline}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-3 py-1.5 text-amber-200 border border-slate-700">
                <Timer className="h-4 w-4 text-amber-400" /> Thời gian: {currentRecipe.cookTime}
              </span>
              <span className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-3 py-1.5 text-orange-200 border border-slate-700">
                <Flame className="h-4 w-4 text-orange-400" /> {currentRecipe.temp}
              </span>
            </div>
          </div>

          {/* Cooking Tools Grid on Cooktop */}
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block">
              Bộ Dụng Cụ Bếp Cần Dùng Cho Món Này ({currentRecipe.requiredTools.length} món):
            </span>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {currentRecipe.requiredTools.map((tool, idx) => (
                <div
                  key={idx}
                  className="flex flex-col justify-between rounded-2xl bg-slate-800/90 p-4 border border-slate-700/80 hover:border-amber-400 transition-all group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300 font-bold text-xs">
                        #{idx + 1}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md">
                        {tool.material}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                      {tool.name}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{tool.role}</p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-700/60 flex items-center justify-between">
                    <span className="text-xs font-extrabold text-amber-400">{formatCurrency(tool.price)}</span>
                    <Link
                      href={`/products?q=${encodeURIComponent(tool.name.split(' ')[0] + ' ' + tool.name.split(' ')[1])}`}
                      className="text-[10px] font-bold text-amber-200 hover:text-white flex items-center gap-0.5"
                    >
                      Xem <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chef Secret Advice & Combo Add to Cart */}
          <div className="rounded-2xl bg-gradient-to-r from-amber-950/80 via-slate-800/80 to-amber-950/80 p-5 border border-amber-400/30 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-amber-950 font-black text-lg">
                👨‍🍳
              </span>
              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-amber-300">Bí Quyết Đầu Bếp:</h5>
                <p className="text-xs text-amber-100 mt-0.5 leading-relaxed max-w-xl">{currentRecipe.chefSecret}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 line-through block">{formatCurrency(bundleTotal)}</span>
                <span className="text-base font-black text-amber-300">{formatCurrency(bundleDiscounted)}</span>
              </div>
              <button
                onClick={handleAddBundle}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 px-5 py-2.5 text-xs font-black text-amber-950 shadow-lg shadow-amber-500/25 hover:from-amber-500 hover:to-orange-500 active:scale-95 transition-all"
              >
                <ShoppingCart className="h-4 w-4" /> Mua Trọn Bộ Combo (Giảm 15%)
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4. BẢNG SO SÁNH CHẤT LIỆU NỒI CHẢO ─── */}
      <section id="so-sanh-chat-lieu" aria-label="So sánh chất liệu" className="rounded-3xl bg-amber-50/80 p-6 shadow-card ring-1 ring-amber-200/70 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-amber-200/60 pb-5">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
              🔬 Khoa học nhà bếp
            </span>
            <h2 className="text-2xl font-black text-amber-950 mt-1">
              Bảng Đối Chiếu Chất Liệu Nồi Chảo Chuyên Sâu
            </h2>
            <p className="text-xs text-amber-800 mt-0.5">
              Chọn chất liệu để so sánh đặc tính truyền nhiệt, giữ nóng và độ bền thực tế
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {MATERIALS.map((mat, idx) => (
              <button
                key={mat.name}
                onClick={() => setSelectedMaterial(idx)}
                className={cn(
                  'px-4 py-2 rounded-xl text-xs font-bold transition-all',
                  selectedMaterial === idx
                    ? 'bg-amber-900 text-white shadow-md scale-105'
                    : 'bg-white text-amber-950 hover:bg-amber-100 border border-amber-200',
                )}
              >
                {mat.name.split(' ')[0]} {mat.name.split(' ')[1]}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Material Card */}
        <div className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-amber-200/60 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <span className="text-xs font-extrabold uppercase text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                {MATERIALS[selectedMaterial].tag}
              </span>
              <h3 className="text-lg font-black text-slate-900 mt-1.5">{MATERIALS[selectedMaterial].name}</h3>
              <p className="text-xs text-slate-600 mt-1">{MATERIALS[selectedMaterial].desc}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-4 pt-2">
            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
              <span className="text-[11px] text-slate-500 block mb-1">Tốc độ bắt nhiệt:</span>
              <div className="flex items-center justify-between">
                <div className="h-2 flex-1 bg-slate-200 rounded-full overflow-hidden mr-2">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${MATERIALS[selectedMaterial].heatSpeed}%` }} />
                </div>
                <span className="text-xs font-bold text-slate-900">{MATERIALS[selectedMaterial].heatSpeed}%</span>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
              <span className="text-[11px] text-slate-500 block mb-1">Khả năng giữ nhiệt:</span>
              <div className="flex items-center justify-between">
                <div className="h-2 flex-1 bg-slate-200 rounded-full overflow-hidden mr-2">
                  <div className="h-full bg-orange-500 rounded-full" style={{ width: `${MATERIALS[selectedMaterial].heatRetention}%` }} />
                </div>
                <span className="text-xs font-bold text-slate-900">{MATERIALS[selectedMaterial].heatRetention}%</span>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
              <span className="text-[11px] text-slate-500 block mb-1">Độ bền chống trầy:</span>
              <div className="flex items-center justify-between">
                <div className="h-2 flex-1 bg-slate-200 rounded-full overflow-hidden mr-2">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${MATERIALS[selectedMaterial].durability}%` }} />
                </div>
                <span className="text-xs font-bold text-slate-900">{MATERIALS[selectedMaterial].durability}%</span>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
              <span className="text-[11px] text-slate-500 block mb-1">Hiệu quả chống dính:</span>
              <div className="flex items-center justify-between">
                <div className="h-2 flex-1 bg-slate-200 rounded-full overflow-hidden mr-2">
                  <div className="h-full bg-sky-500 rounded-full" style={{ width: `${MATERIALS[selectedMaterial].nonStick}%` }} />
                </div>
                <span className="text-xs font-bold text-slate-900">{MATERIALS[selectedMaterial].nonStick}%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 5. LƯỚI SẢN PHẨM NHÀ BẾP ─── */}
      <section id="san-pham" aria-label="Sản phẩm nhà bếp" className="scroll-mt-28 pt-4">
        <div ref={gridRef} className="scroll-mt-28" />

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2.5 text-xl font-black text-slate-900 md:text-2xl">
              <PackageCheck className="h-6 w-6 text-amber-700" />
              Sản Phẩm Đồ Bếp Chính Hãng Tuyển Chọn
            </h2>
            {query.data?.meta && (
              <p className="mt-0.5 text-xs text-slate-500">
                Hiển thị <strong>{query.data.meta.total.toLocaleString('vi-VN')}</strong> sản phẩm chất lượng cao
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
                      : 'bg-white text-amber-950 hover:bg-slate-50 border border-slate-200',
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
