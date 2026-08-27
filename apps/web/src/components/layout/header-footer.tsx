'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Heart, Home, LogOut, MapPin, Package, Search, ShoppingCart, User as UserIcon } from 'lucide-react';
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
    <form onSubmit={onSubmit} role="search" className="relative hidden flex-1 md:block">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Tìm kiếm sản phẩm, thương hiệu..."
        aria-label="Tìm kiếm sản phẩm"
        className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
      />
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </form>
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
    <div className="flex items-center gap-1 sm:gap-2">
      <Link
        href="/account/wishlist"
        aria-label="Sản phẩm yêu thích"
        className="hidden h-10 w-10 items-center justify-center rounded-xl text-white/90 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:flex"
      >
        <Heart className="h-5 w-5" />
      </Link>

      <Link
        href="/cart"
        aria-label={`Giỏ hàng${cartCount > 0 ? ` (${cartCount} sản phẩm)` : ''}`}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl text-white/90 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <ShoppingCart className="h-5 w-5" />
        {cartCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent-500 px-1 text-[11px] font-bold tabular-nums">
            {cartCount > 99 ? '99+' : cartCount}
          </span>
        )}
      </Link>

      {user ? (
        <div className="group relative">
          <button
            className="flex h-10 items-center gap-2 rounded-xl px-2 text-sm font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-haspopup="menu"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-500 text-xs font-bold">
              {user.fullName.charAt(0).toUpperCase()}
            </span>
            <span className="hidden max-w-[100px] truncate lg:inline">{user.fullName}</span>
          </button>
          <div
            role="menu"
            className="invisible absolute right-0 top-full z-50 w-48 translate-y-1 rounded-xl bg-white py-1 opacity-0 shadow-card-hover ring-1 ring-slate-100 transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
          >
            <Link href="/account" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
              <UserIcon className="h-4 w-4" /> Tài khoản của tôi
            </Link>
            <Link href="/account/orders" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
              <Package className="h-4 w-4" /> Đơn hàng của tôi
            </Link>
            <button
              role="menuitem"
              onClick={onLogout}
              disabled={logout.isPending}
              className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" /> Đăng xuất
            </button>
          </div>
        </div>
      ) : (
        <Link
          href="/auth/login"
          className="flex h-9 items-center rounded-xl bg-accent-500 px-3 text-sm font-semibold text-white transition-colors hover:bg-accent-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Đăng nhập
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
          className="flex h-10 w-10 items-center justify-center rounded-xl text-white/90 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <Search className="h-5 w-5" />
        </button>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setOpen(false);
            router.push(q.trim() ? `/products?q=${encodeURIComponent(q.trim())}` : '/products');
          }}
          className="flex flex-1 items-center gap-2"
        >
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm kiếm sản phẩm..."
            aria-label="Tìm kiếm sản phẩm"
            className="w-full rounded-xl bg-white py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-400"
          />
          <button type="button" onClick={() => setOpen(false)} className="px-1 text-sm text-white/90">
            Huỷ
          </button>
        </form>
      )}
    </div>
  );
}

function CategoryNav() {
  const { data: categories } = useCategories();
  const roots = (categories ?? []).slice(0, 8);

  return (
    <nav aria-label="Danh mục sản phẩm" className="hidden border-t border-white/10 lg:block">
      <ul className="mx-auto flex max-w-7xl items-center gap-1 px-4">
        <li>
          <Link
            href="/products"
            className="block px-3 py-2 text-sm font-medium text-white/90 transition-colors hover:text-white"
          >
            Tất cả sản phẩm
          </Link>
        </li>
        {roots.map((cat) => (
          <li key={cat.id}>
            <Link
              href={`/danh-muc/${cat.slug}`}
              className="block px-3 py-2 text-sm text-white/80 transition-colors hover:text-white"
            >
              {cat.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-primary-700 shadow-md">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-xl" aria-label="HomeMart — Trang chủ">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-500 text-lg font-black text-white">H</span>
          <span className="hidden text-lg font-bold tracking-tight text-white sm:block">HomeMart</span>
        </Link>

        <Suspense fallback={<div className="hidden flex-1 md:block" />}>
          <SearchBar />
        </Suspense>

        <div className="ml-auto flex items-center gap-1">
          <Suspense fallback={null}>
            <MobileSearch />
          </Suspense>
          <HeaderActions />
        </div>
      </div>
      <CategoryNav />
    </header>
  );
}

const BOTTOM_NAV_ITEMS = [
  { href: '/', label: 'Trang chủ', icon: null },
  { href: '/products', label: 'Tìm kiếm', icon: Search },
  { href: '/cart', label: 'Giỏ hàng', icon: ShoppingCart },
  { href: '/account', label: 'Cá nhân', icon: UserIcon },
];

export function MobileBottomNav() {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(15,23,42,0.06)] md:hidden"
    >
      {BOTTOM_NAV_ITEMS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]',
            pathname === href ? 'text-primary-700' : 'text-slate-500',
          )}
        >
          <BottomIcon href={href} label={label} />
          {label}
        </Link>
      ))}
    </nav>
  );
}

function BottomIcon({ href, label }: { href: string; label: string }) {
  if (href === '/') return <Home className="h-5 w-5" />;
  if (href === '/account') return <UserIcon className="h-5 w-5" />;
  if (label === 'Giỏ hàng') return <CartBadge />;
  return <Search className="h-5 w-5" />;
}

function CartBadge() {
  const count = useCartStore((s) => s.count);
  return (
    <span className="relative">
      <ShoppingCart className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent-500 px-0.5 text-[10px] font-bold text-white">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </span>
  );
}

export function Footer() {
  return (
    <>
      <footer className="mt-12 border-t border-slate-200 bg-slate-900 pb-20 text-slate-300 md:pb-0">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-500 text-lg font-black text-white">H</span>
              <span className="text-lg font-bold text-white">HomeMart</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Siêu thị gia dụng trực tuyến — đồ dùng gia đình chất lượng, giá tốt cho mọi ngôi nhà Việt.
            </p>
            <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-400">
              <MapPin className="h-4 w-4" /> Hà Nội, Việt Nam
            </p>
          </div>
          <FooterCol
            title="Về HomeMart"
            links={[
              { href: '/about', label: 'Giới thiệu' },
              { href: '/contact', label: 'Liên hệ' },
              { href: '/faq', label: 'Câu hỏi thường gặp' },
            ]}
          />
          <FooterCol
            title="Chính sách"
            links={[
              { href: '/policies', label: 'Chính sách đổi trả' },
              { href: '/policies#shipping', label: 'Chính sách giao hàng' },
              { href: '/policies#privacy', label: 'Bảo mật thông tin' },
            ]}
          />
          <FooterCol
            title="Tài khoản"
            links={[
              { href: '/auth/login', label: 'Đăng nhập' },
              { href: '/auth/register', label: 'Đăng ký' },
              { href: '/account/orders', label: 'Kiểm tra đơn hàng' },
            ]}
          />
        </div>
        <div className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} HomeMart. Bảo lưu mọi quyền.
        </div>
      </footer>
      <MobileBottomNav />
    </>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white">{title}</h3>
      <ul className="space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.label}>
            <Link href={l.href} className="transition-colors hover:text-white">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
