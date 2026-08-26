import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Giới thiệu',
  description:
    'HomeMart — siêu thị gia dụng trực tuyến Việt Nam với hàng ngàn sản phẩm chính hãng cho ngôi nhà của bạn.',
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Về HomeMart</h1>
      <div className="space-y-4 rounded-xl bg-white p-6 text-slate-600 shadow-card ring-1 ring-slate-100">
        <p>
          <strong className="text-slate-800">HomeMart</strong> là siêu thị gia dụng trực tuyến
          dành riêng cho các gia đình Việt. Chúng tôi mang đến hàng ngàn sản phẩm chính hãng — từ
          đồ dùng nhà bếp, thiết bị gia dụng đến nội thất và trang trí — với giá cả hợp lý và dịch
          vụ giao hàng nhanh chóng trên toàn quốc.
        </p>
        <h2 className="pt-2 text-lg font-semibold text-slate-800">Tại sao chọn HomeMart?</h2>
        <ul className="list-inside list-disc space-y-2">
          <li><strong>100% hàng chính hãng</strong> — nguồn gốc rõ ràng, đầy đủ bảo hành.</li>
          <li><strong>Giá tốt mỗi ngày</strong> — flash sale, voucher và ưu đãi thành viên.</li>
          <li><strong>Giao nhanh</strong> — kiểm tra hàng trước khi thanh toán (COD).</li>
          <li><strong>Đổi trả dễ dàng</strong> — trong vòng 7 ngày với mọi sản phẩm.</li>
        </ul>
        <h2 className="pt-2 text-lg font-semibold text-slate-800">Sứ mệnh</h2>
        <p>
          Giúp mọi ngôi nhà Việt trở nên tiện nghi, ấm cúng hơn với những sản phẩm chất lượng với
          chi phí hợp lý nhất.
        </p>
        <p className="pt-2">
          <Link href="/products" className="font-medium text-primary-700 hover:underline">
            Khám phá sản phẩm ngay →
          </Link>
        </p>
      </div>
    </article>
  );
}
