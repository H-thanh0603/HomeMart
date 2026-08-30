import type { Metadata } from 'next';
import { FileText, RotateCcw, ShieldCheck, Sparkles, Truck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Chính sách & Quy định — HomeMart',
  description:
    'Chính sách đổi trả 7 ngày, bảo hành chính hãng, giao hàng và bảo mật thông tin tại HomeMart.',
};

export default function PoliciesPage() {
  return (
    <article className="mx-auto max-w-4xl space-y-8 py-4">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-800 via-primary-700 to-teal-800 p-8 text-white shadow-elevated">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300 mb-2">
          <Sparkles className="h-4 w-4" /> Cam kết quyền lợi
        </div>
        <h1 className="text-3xl font-black md:text-4xl">Chính Sách & Quy Định Mua Sắm</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-emerald-100 md:text-base">
          HomeMart cam kết mang đến trải nghiệm mua sắm minh bạch, an tâm và bảo vệ tối đa quyền lợi của khách hàng.
        </p>
      </div>

      <div className="space-y-6">
        <section id="return" className="rounded-3xl bg-white p-7 shadow-card ring-1 ring-slate-100/90 scroll-mt-28">
          <h2 className="mb-4 text-lg font-black text-slate-900 flex items-center gap-2.5">
            <RotateCcw className="h-5 w-5 text-emerald-600" /> 1. Chính sách đổi trả trong vòng 7 ngày
          </h2>
          <ul className="list-inside list-disc space-y-2.5 text-sm leading-relaxed text-slate-600 pl-1">
            <li>Sản phẩm được đổi mới hoàn toàn miễn phí trong vòng <strong>7 ngày</strong> kể từ khi quý khách nhận hàng.</li>
            <li>Áp dụng cho các sản phẩm có lỗi kỹ thuật từ nhà sản xuất, hư hỏng trong quá trình vận chuyển hoặc không đúng với mô tả trên website.</li>
            <li>Sản phẩm đổi trả cần giữ nguyên tem mác, bao bì nguyên vẹn và phụ kiện đi kèm.</li>
            <li>HomeMart hỗ trợ nhân viên đến tận nhà thu hồi và đổi sản phẩm mới, quý khách không cần mang đi gửi bưu điện.</li>
          </ul>
        </section>

        <section id="shipping" className="rounded-3xl bg-white p-7 shadow-card ring-1 ring-slate-100/90 scroll-mt-28">
          <h2 className="mb-4 text-lg font-black text-slate-900 flex items-center gap-2.5">
            <Truck className="h-5 w-5 text-emerald-600" /> 2. Chính sách giao hàng & Kiểm tra hàng (Đồng kiểm)
          </h2>
          <ul className="list-inside list-disc space-y-2.5 text-sm leading-relaxed text-slate-600 pl-1">
            <li>HomeMart giao hàng toàn quốc thông qua các đối tác vận chuyển hỏa tốc và tiêu chuẩn hàng đầu.</li>
            <li><strong>Miễn phí vận chuyển</strong> toàn quốc cho mọi đơn hàng có giá trị từ 299.000₫.</li>
            <li>Khách hàng được quyền <strong>mở hộp kiểm tra hàng</strong> trước khi thanh toán tiền cho nhân viên giao hàng (COD).</li>
            <li>Thời gian giao hàng: Nội thành 1–2 ngày làm việc; các tỉnh thành khác 2–4 ngày làm việc.</li>
          </ul>
        </section>

        <section id="warranty" className="rounded-3xl bg-white p-7 shadow-card ring-1 ring-slate-100/90 scroll-mt-28">
          <h2 className="mb-4 text-lg font-black text-slate-900 flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-emerald-600" /> 3. Chính sách bảo hành chính hãng
          </h2>
          <ul className="list-inside list-disc space-y-2.5 text-sm leading-relaxed text-slate-600 pl-1">
            <li>100% sản phẩm điện gia dụng và thiết bị thông minh tại HomeMart được bảo hành chính hãng từ 12 đến 24 tháng.</li>
            <li>Bảo hành điện tử thuận tiện thông qua số điện thoại hoặc mã đơn hàng đã đặt.</li>
            <li>Hỗ trợ gửi bảo hành trực tiếp tại các trung tâm bảo hành của hãng hoặc gửi qua HomeMart để được đại diện xử lý.</li>
          </ul>
        </section>

        <section id="privacy" className="rounded-3xl bg-white p-7 shadow-card ring-1 ring-slate-100/90 scroll-mt-28">
          <h2 className="mb-4 text-lg font-black text-slate-900 flex items-center gap-2.5">
            <FileText className="h-5 w-5 text-emerald-600" /> 4. Bảo mật thông tin & Hóa đơn VAT
          </h2>
          <ul className="list-inside list-disc space-y-2.5 text-sm leading-relaxed text-slate-600 pl-1">
            <li>HomeMart cam kết bảo mật tuyệt đối mọi thông tin cá nhân và dữ liệu thanh toán của quý khách theo chuẩn quốc tế SSL.</li>
            <li>Tất cả giá bán trên website đã bao gồm thuế VAT. Doanh nghiệp cần xuất hóa đơn VAT chỉ cần để lại mã số thuế và thông tin xuất hóa đơn tại bước thanh toán.</li>
          </ul>
        </section>
      </div>
    </article>
  );
}
