'use client';

import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import {
  Flame,
  Heart,
  Home,
  LogOut,
  MapPin,
  Package,
  Phone,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Truck,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useCategories } from '@/hooks/use-catalog';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { useLogout } from '@/hooks/use-auth';
import { toast } from '@/stores/toast-store';
import { cn } from '@/lib/utils';

function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState('');

  useEffect(() => {
    setQ(searchParams.get('q') ?? '');
  }, [searchParams]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/products?q=${encodeURIComponent(query)}` : '/products');
  };

  return (
    <div className="relative hidden flex-1 max-w-xl md:block">
      <form onSubmit={onSubmit} role="search" className="relative">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm kiếm dụng cụ nhà bếp, thiết bị điện máy, đồ gia dụng..."
          aria-label="Tìm kiếm sản phẩm"
          className="w-full rounded-2xl border border-emerald-100 bg-white py-2.5 pl-11 pr-10 text-sm text-emerald-950 placeholder:text-emerald-800/60 shadow-inner transition-all duration-200 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-500/15"
        />
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-700" />
        {q && (
          <button
            type="button"
            onClick={() => setQ('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-emerald-700 hover:bg-emerald-100"
            aria-label="Xóa từ khóa"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </form>
    </div>
  );
}

function HeaderActions() {
  const user = useAuthStore((s) => s.user);
  const cartCount = useCartStore((s) => s.count);
  const logout = useLogout();

  const onLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => toast.success('Đã đăng xuất'),
      onError: () => toast.error('Đăng xuất thất bại'),
    });
  };

  return (
    <div className="flex items-center gap-1.5 sm:gap-3">
      <Link
        href="/account/wishlist"
        aria-label="Sản phẩm yêu thích"
        className="hidden h-10 w-10 items-center justify-center rounded-xl text-slate-700 transition-colors hover:bg-slate-100 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 sm:flex"
      >
        <Heart className="h-5 w-5" />
      </Link>

      <Link
        href="/cart"
        aria-label={`Giỏ hàng${cartCount > 0 ? ` (${cartCount} sản phẩm)` : ''}`}
        className="group relative flex h-10 items-center gap-2 rounded-xl px-2.5 text-slate-700 transition-colors hover:bg-slate-100 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
      >
        <div className="relative">
          <ShoppingCart className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
          {cartCount > 0 && (
            <span className="absolute -right-2 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gradient-to-r from-accent-500 to-amber-500 px-1 text-[11px] font-bold text-white shadow-sm shadow-accent-500/40 animate-pulse-subtle">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
        </div>
        <span className="hidden text-sm font-semibold text-slate-800 lg:inline">Giỏ hàng</span>
      </Link>

      {user ? (
        <div className="group relative">
          <button
            className="flex h-10 items-center gap-2 rounded-xl px-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100 hover:text-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
            aria-haspopup="menu"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-primary-600 to-emerald-500 text-xs font-bold text-white shadow-sm">
              {user.fullName.charAt(0).toUpperCase()}
            </span>
            <span className="hidden max-w-[120px] truncate md:inline">{user.fullName}</span>
          </button>
          <div
            role="menu"
            className="invisible absolute right-0 top-full z-50 w-52 translate-y-2 rounded-2xl bg-white p-1.5 opacity-0 shadow-elevated ring-1 ring-slate-100 transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
          >
            <div className="border-b border-slate-100 px-3 py-2">
              <p className="text-xs text-slate-400">Đăng nhập bởi</p>
              <p className="truncate text-sm font-semibold text-slate-800">{user.email}</p>
            </div>
            <Link
              href="/account"
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-emerald-800"
            >
              <UserIcon className="h-4 w-4" /> Tài khoản của tôi
            </Link>
            <Link
              href="/account/orders"
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-emerald-800"
            >
              <Package className="h-4 w-4" /> Đơn hàng của tôi
            </Link>
            <Link
              href="/account/wishlist"
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-emerald-800"
            >
              <Heart className="h-4 w-4" /> Yêu thích
            </Link>
            <button
              role="menuitem"
              onClick={onLogout}
              disabled={logout.isPending}
              className="flex w-full items-center gap-2.5 rounded-xl border-t border-slate-100 px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" /> Đăng xuất
            </button>
          </div>
        </div>
      ) : (
        <Link
          href="/auth/login"
          className="flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary-600 to-emerald-600 px-4 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 transition-all duration-200 hover:from-primary-700 hover:to-emerald-700 hover:shadow-md active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
        >
          <UserIcon className="h-4 w-4" />
          <span>Đăng nhập</span>
        </Link>
      )}
    </div>
  );
}

function MobileSearch() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [q, setQ] = useState('');

  return (
    <div className="md:hidden">
      {!open ? (
        <button
          aria-label="Mở tìm kiếm"
          onClick={() => setOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
        >
          <Search className="h-5 w-5" />
        </button>
      ) : (
        <div className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white p-3 shadow-md">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setOpen(false);
              router.push(q.trim() ? `/products?q=${encodeURIComponent(q.trim())}` : '/products');
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tìm sản phẩm gia dụng..."
                aria-label="Tìm kiếm sản phẩm"
                className="w-full rounded-xl border border-emerald-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
            >
              Đóng
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function CategoryNav() {
  const { data: categories } = useCategories();
  const roots = (categories ?? []).slice(0, 8);
  const pathname = usePathname();

  return (
    <nav aria-label="Danh mục sản phẩm" className="hidden border-t border-slate-100 bg-white/95 backdrop-blur-md md:block">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4">
        <ul className="flex items-center gap-1 overflow-x-auto py-1.5 scrollbar-none">
          <li>
            <Link
              href="/products"
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors',
                pathname === '/products'
                  ? 'bg-primary-50 text-emerald-800'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
              )}
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
              Tất cả sản phẩm
            </Link>
          </li>
          {roots.map((cat) => {
            const isActive = pathname === `/danh-muc/${cat.slug}`;
            return (
              <li key={cat.id}>
                <Link
                  href={`/danh-muc/${cat.slug}`}
                  className={cn(
                    'block whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors',
                    isActive
                      ? 'bg-primary-50 text-emerald-800'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                  )}
                >
                  {cat.name}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="hidden lg:flex items-center gap-4 text-xs font-semibold text-slate-500">
          <span className="flex items-center gap-1 text-accent-600">
            <Flame className="h-3.5 w-3.5" /> Flash Sale Mỗi Ngày
          </span>
          <span className="text-slate-300">|</span>
          <span className="flex items-center gap-1 text-emerald-700">
            <Truck className="h-3.5 w-3.5" /> Freeship từ 299K
          </span>
        </div>
      </div>
    </nav>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 shadow-sm backdrop-blur-md">
      {/* Top Banner Ribbon */}
      <div className="bg-gradient-to-r from-emerald-800 via-primary-700 to-teal-800 text-white text-[11px] font-medium py-1.5 px-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-500 px-2 py-0.2 text-[10px] font-bold uppercase tracking-wider">
              HOT
            </span>
            <span className="hidden sm:inline">Siêu thị gia dụng trực tuyến số 1 cho gia đình Việt</span>
            <span className="sm:hidden">Miễn phí vận chuyển từ 299K</span>
          </div>
          <div className="flex items-center gap-4 text-white/90">
            <span className="hidden md:flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" /> 100% Chính Hãng
            </span>
            <span className="hidden md:flex items-center gap-1">
              <Phone className="h-3.5 w-3.5 text-amber-300" /> Hotline: 1900 8888
            </span>
          </div>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
          aria-label="HomeMart — Trang chủ"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary-600 via-emerald-500 to-teal-400 text-xl font-black text-white shadow-md shadow-emerald-600/25">
            H
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight text-slate-900 leading-tight flex items-center gap-1">
              Home<span className="text-emerald-600">Mart</span>
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 leading-none">
              Tổ ấm tiện nghi
            </span>
          </div>
        </Link>

        {/* Omnipresent Search Bar */}
        <Suspense fallback={<div className="hidden flex-1 md:block" />}>
          <SearchBar />
        </Suspense>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Suspense fallback={null}>
            <MobileSearch />
          </Suspense>
          <HeaderActions />
        </div>
      </div>

      {/* Category Nav */}
      <CategoryNav />
    </header>
  );
}

const BOTTOM_NAV_ITEMS = [
  { href: '/', label: 'Trang chủ', icon: Home },
  { href: '/products', label: 'Khám phá', icon: Search },
  { href: '/cart', label: 'Giỏ hàng', icon: ShoppingCart },
  { href: '/account', label: 'Cá nhân', icon: UserIcon },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const cartCount = useCartStore((s) => s.count);

  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg shadow-[0_-4px_16px_rgba(15,23,42,0.06)] md:hidden"
    >
      {BOTTOM_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
        const isCart = href === '/cart';

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-semibold transition-colors',
              active ? 'text-primary-700' : 'text-slate-400 hover:text-slate-600',
            )}
          >
            <div className="relative">
              <Icon className={cn('h-5 w-5', active && 'stroke-[2.5px]')} />
              {isCart && cartCount > 0 && (
                <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white shadow-sm">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </div>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Footer() {
  return (
    <>
      <footer className="mt-16 border-t border-slate-200 bg-slate-900 pb-20 text-slate-300 md:pb-0">
        {/* Value Prop Banner inside footer */}
        <div className="border-b border-slate-800/80 bg-slate-950/40">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
                <Truck className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Giao hàng toàn quốc</h4>
                <p className="text-xs text-slate-400">Miễn phí cho đơn từ 299.000₫</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">100% Chính hãng</h4>
                <p className="text-xs text-slate-400">Bảo hành chính hãng uy tín</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-400">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Đổi trả 7 ngày</h4>
                <p className="text-xs text-slate-400">Kiểm tra hàng trước khi nhận</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400">
                <Phone className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Tư vấn tận tâm</h4>
                <p className="text-xs text-slate-400">Hỗ trợ khách hàng 24/7</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Footer Links */}
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary-600 to-emerald-500 text-xl font-black text-white">
                H
              </div>
              <span className="text-xl font-black tracking-tight text-white">HomeMart</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              Siêu thị gia dụng trực tuyến hàng đầu dành cho mọi gia đình Việt. Mang đến không gian sống tiện nghi, ấm cúng và trọn vẹn yêu thương.
            </p>
            <p className="mt-4 flex items-center gap-2 text-sm text-slate-400">
              <MapPin className="h-4 w-4 text-emerald-400" /> Hà Nội & TP. Hồ Chí Minh, Việt Nam
            </p>
            <p className="mt-1.5 flex items-center gap-2 text-sm text-slate-400">
              <Phone className="h-4 w-4 text-amber-400" /> 1900 8888 (8h00 - 21h00)
            </p>
          </div>

          <FooterCol
            title="Về HomeMart"
            links={[
              { href: '/about', label: 'Câu chuyện thương hiệu' },
              { href: '/contact', label: 'Liên hệ & Góp ý' },
              { href: '/faq', label: 'Câu hỏi thường gặp (FAQ)' },
              { href: '/products', label: 'Tất cả sản phẩm' },
            ]}
          />

          <FooterCol
            title="Chính sách & Hỗ trợ"
            links={[
              { href: '/policies#return', label: 'Chính sách đổi trả 7 ngày' },
              { href: '/policies#warranty', label: 'Chính sách bảo hành' },
              { href: '/policies#vat', label: 'Giá & Hóa đơn VAT' },
              { href: '/policies#privacy', label: 'Chính sách bảo mật thông tin' },
            ]}
          />

          <div>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-white">Nhận bản tin khuyến mãi</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Đăng ký để nhận voucher 50.000₫ cho đơn hàng đầu tiên và cập nhật flash sale sớm nhất.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Email của bạn..."
                aria-label="Email nhận bản tin"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-primary-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => toast.success('Cảm ơn bạn đã đăng ký nhận tin!')}
                className="rounded-xl bg-gradient-to-r from-accent-500 to-amber-500 px-3.5 py-2 text-xs font-bold text-white hover:from-accent-600 hover:to-amber-600"
              >
                Gửi
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} HomeMart. Bản quyền thuộc về HomeMart Việt Nam.
        </div>
      </footer>
      <MobileBottomNav />
    </>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-white">{title}</h3>
      <ul className="space-y-2.5 text-sm">
        {links.map((l) => (
          <li key={l.label}>
            <Link href={l.href} className="text-slate-400 transition-colors hover:text-white hover:underline">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
