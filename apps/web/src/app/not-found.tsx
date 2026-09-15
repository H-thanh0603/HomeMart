import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white/80 px-6 py-20 text-center shadow-sm">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-3xl font-black text-emerald-600">
        404
      </div>
      <h1 className="text-lg font-bold text-slate-800">Không tìm thấy trang</h1>
      <p className="max-w-sm text-sm text-slate-500">
        Trang bạn tìm không tồn tại hoặc đã bị di chuyển. Thử khám phá danh mục sản phẩm nhé!
      </p>
      <div className="mt-2 flex gap-2">
        <Link
          href="/"
          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          Về trang chủ
        </Link>
        <Link
          href="/products"
          className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Xem sản phẩm
        </Link>
      </div>
    </div>
  );
}
