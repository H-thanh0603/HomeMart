import type { Metadata } from 'next';
import Link from 'next/link';
import { Heart, Package, ShieldCheck, Sparkles, Truck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Giới thiệu về HomeMart',
  description:
    'HomeMart — siêu thị gia dụng trực tuyến hàng đầu Việt Nam mang đến hàng ngàn sản phẩm chính hãng cho tổ ấm của bạn.',
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-4xl space-y-8 py-4">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-800 via-primary-700 to-teal-800 p-8 text-white shadow-elevated">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300 mb-2">
          <Sparkles className="h-4 w-4" /> Về HomeMart
        </div>
        <h1 className="text-3xl font-black md:text-4xl">Câu Chuyện HomeMart</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-emerald-100 md:text-base">
          Kiến tạo không gian sống tiện nghi, sạch đẹp và ấm cúng cho hàng triệu tổ ấm gia đình Việt Nam.
        </p>
      </div>

      {/* Main Content */}
      <div className="space-y-6 rounded-3xl bg-white p-8 text-slate-600 shadow-card ring-1 ring-slate-100/90 leading-relaxed">
        <div>
          <h2 className="text-xl font-black text-slate-900 mb-3">Sứ Mệnh Của Chúng Tôi</h2>
          <p className="text-slate-700">
            <strong className="text-emerald-700 font-bold">HomeMart</strong> ra đời với mong muốn trở thành người bạn đồng hành tin cậy của mọi gia đình Việt trong việc chăm sóc và nâng tầm không gian sống. Chúng tôi tuyển chọn những sản phẩm đồ dùng nhà bếp, thiết bị điện máy, nội thất thông minh và tiện ích chất lượng từ các thương hiệu uy tín, giúp mỗi ngày tại nhà đều là một trải nghiệm thư thái và tiện lợi.
          </p>
        </div>

        <div className="border-t border-slate-100 pt-6">
          <h2 className="text-xl font-black text-slate-900 mb-4">4 Giá Trị Cốt Lõi Tại HomeMart</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex gap-3 rounded-2xl bg-emerald-50/60 p-4 ring-1 ring-emerald-100">
              <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">100% Chính Hãng</h3>
                <p className="text-xs text-slate-500 mt-0.5">Nguồn gốc rõ ràng, bảo hành đầy đủ theo tiêu chuẩn nhà sản xuất.</p>
              </div>
            </div>
            <div className="flex gap-3 rounded-2xl bg-amber-50/60 p-4 ring-1 ring-amber-100">
              <Sparkles className="h-6 w-6 text-amber-600 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Giá Tốt & Minh Bạch</h3>
                <p className="text-xs text-slate-500 mt-0.5">Giá bán minh bạch, nhiều ưu đãi Flash Sale và voucher hấp dẫn.</p>
              </div>
            </div>
            <div className="flex gap-3 rounded-2xl bg-sky-50/60 p-4 ring-1 ring-sky-100">
              <Truck className="h-6 w-6 text-sky-600 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Giao Hàng Hỏa Tốc</h3>
                <p className="text-xs text-slate-500 mt-0.5">Được kiểm tra hàng trước khi thanh toán (COD), an tâm tuyệt đối.</p>
              </div>
            </div>
            <div className="flex gap-3 rounded-2xl bg-purple-50/60 p-4 ring-1 ring-purple-100">
              <Heart className="h-6 w-6 text-purple-600 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Đổi Trả Dễ Dàng 7 Ngày</h3>
                <p className="text-xs text-slate-500 mt-0.5">Hỗ trợ đổi mới tận nhà nhanh chóng nếu có lỗi từ nhà sản xuất.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-6 flex items-center justify-between">
          <p className="text-xs text-slate-400">Trụ sở chính: Hà Nội & TP. Hồ Chí Minh, Việt Nam</p>
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-primary-700"
          >
            Khám phá sản phẩm <Package className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
