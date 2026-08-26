import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chính sách',
  description:
    'Chính sách đổi trả, vận chuyển và bảo mật thông tin của HomeMart.',
};

export default function PoliciesPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-4">
      <section id="return" className="rounded-xl bg-white p-6 shadow-card ring-1 ring-slate-100 scroll-mt-24">
        <h2 className="mb-3 text-lg font-bold text-slate-900">1. Chính sách đổi trả</h2>
        <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed text-slate-600">
          <li>Sản phẩm được đổi trả trong vòng <strong>7 ngày</strong> kể từ khi nhận hàng.</li>
          <li>Đổi trả áp dụng khi sản phẩm bị lỗi do nhà sản xuất, hư hỏng khi vận chuyển hoặc không đúng mô tả.</li>
          <li>Sản phẩm cần còn nguyên tem mác, phụ kiện và hóa đơn mua hàng.</li>
          <li>Với hàng điện máy/gia dụng, khách hàng được bảo hành chính hãng theo thời gian ghi trên website.</li>
        </ul>
      </section>

      <section id="shipping" className="rounded-xl bg-white p-6 shadow-card ring-1 ring-slate-100 scroll-mt-24">
        <h2 className="mb-3 text-lg font-bold text-slate-900">2. Chính sách giao hàng</h2>
        <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed text-slate-600">
          <li>HomeMart giao hàng toàn quốc qua các đối tác vận chuyển uy tín.</li>
          <li>Miễn phí giao hàng Tiêu chuẩn cho đơn hàng đạt giá trị tối thiểu của phương thức này.</li>
          <li>Khách hàng được kiểm tra hàng trước khi thanh toán với hình thức COD.</li>
          <li>Thời gian dự kiến giao hàng được hiển thị khi chọn phương thức vận chuyển ở bước thanh toán.</li>
        </ul>
      </section>

      <section id="warranty" className="rounded-xl bg-white p-6 shadow-card ring-1 ring-slate-100 scroll-mt-24">
        <h2 className="mb-3 text-lg font-bold text-slate-900">3. Bảo hành</h2>
        <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed text-slate-600">
          <li>Thời gian bảo hành ghi trên từng sản phẩm (12-24 tháng tùy hãng). Tem bảo hành phải còn nguyên vẹn.</li>
          <li>Tiếp nhận bảo hành tại trung tâm hãng hoặc qua HomeMart — hotline <strong>1900 636 836</strong>, email <strong>support@homemart.vn</strong>.</li>
          <li>Đổi mới trong 30 ngày đầu nếu lỗi nhà sản xuất (có biên bản kỹ thuật).</li>
        </ul>
      </section>

      <section id="vat" className="rounded-xl bg-white p-6 shadow-card ring-1 ring-slate-100 scroll-mt-24">
        <h2 className="mb-3 text-lg font-bold text-slate-900">4. Giá &amp; Hóa đơn VAT</h2>
        <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed text-slate-600">
          <li>Giá hiển thị đã bao gồm VAT 10% (trừ khi ghi chú khác). Doanh nghiệp cần hóa đơn VAT vui lòng điền MST khi đặt hàng — hóa đơn điện tử gửi trong 24h.</li>
          <li>Thuế 8% áp dụng cho rổ hàng theo cấu hình hệ thống (<code>TAX_RATE</code>), hiển thị rõ ở bước thanh toán.</li>
        </ul>
      </section>

      <section id="privacy" className="rounded-xl bg-white p-6 shadow-card ring-1 ring-slate-100 scroll-mt-24">
        <h2 className="mb-3 text-lg font-bold text-slate-900">5. Bảo mật thông tin</h2>
        <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed text-slate-600">
          <li>HomeMart cam kết bảo vệ thông tin cá nhân của khách hàng theo quy định pháp luật Việt Nam.</li>
          <li>Thông tin thanh toán được mã hoá và xử lý bởi cổng thanh toán uy tín (VNPay, MoMo, Stripe) — HomeMart không lưu trữ dữ liệu thẻ.</li>
          <li>Thông tin cá nhân chỉ được sử dụng cho mục đích xử lý đơn hàng và chăm sóc khách hàng.</li>
          <li>Bạn có thể yêu cầu xoá tài khoản bất cứ lúc nào qua hotline hoặc email hỗ trợ.</li>
        </ul>
      </section>
    </article>
  );
}
