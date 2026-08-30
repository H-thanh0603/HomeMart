import type { Metadata } from 'next';
import { HelpCircle, Sparkles } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Câu hỏi thường gặp — HomeMart',
  description: 'Giải đáp các thắc mắc phổ biến về mua hàng, giao nhận, đổi trả tại HomeMart.',
};

const FAQS = [
  {
    q: 'Làm thế nào để đặt hàng trên HomeMart?',
    a: 'Bạn chỉ cần chọn sản phẩm ưng ý, thêm vào giỏ hàng, nhập địa chỉ nhận hàng và lựa chọn phương thức thanh toán phù hợp (COD nhận hàng trả tiền, ví điện tử VNPay/MoMo hoặc thẻ ngân hàng). Hệ thống sẽ xác nhận và giao hàng nhanh chóng.',
  },
  {
    q: 'Chính sách miễn phí vận chuyển được áp dụng như thế nào?',
    a: 'HomeMart miễn phí vận chuyển toàn quốc cho mọi đơn hàng có giá trị từ 299.000₫ trở lên. Với đơn hàng dưới mức này, phí vận chuyển tiêu chuẩn chỉ từ 20.000₫ – 35.000₫ tùy khu vực.',
  },
  {
    q: 'Bao lâu thì tôi nhận được hàng?',
    a: 'Tại khu vực nội thành Hà Nội & TP.HCM, bạn sẽ nhận được hàng trong vòng 1–2 ngày làm việc. Các tỉnh thành khác thời gian giao hàng từ 2–4 ngày làm việc.',
  },
  {
    q: 'Tôi có được kiểm tra hàng trước khi thanh toán không?',
    a: 'Có! HomeMart luôn khuyến khích khách hàng đồng kiểm (mở hộp kiểm tra ngoại quan sản phẩm) cùng nhân viên giao hàng trước khi thanh toán để đảm bảo quyền lợi tối đa.',
  },
  {
    q: 'Quy trình đổi trả 7 ngày diễn ra như thế nào?',
    a: 'Nếu sản phẩm có lỗi từ nhà sản xuất hoặc giao sai mẫu mã, bạn chỉ cần liên hệ hotline 1900 8888 hoặc tạo yêu cầu trong trang đơn hàng. HomeMart sẽ điều phối bưu tá đến tận nhà thu hồi và đổi sản phẩm mới hoàn toàn miễn phí.',
  },
  {
    q: 'Làm thế nào để áp dụng mã giảm giá / voucher?',
    a: 'Tại trang Thanh toán, bạn chỉ cần nhập mã giảm giá vào ô "Mã giảm giá" và bấm "Áp dụng". Số tiền giảm giá sẽ được trừ trực tiếp vào tổng thanh toán của đơn hàng.',
  },
];

export default function FaqPage() {
  return (
    <article className="mx-auto max-w-4xl space-y-8 py-4">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-800 via-primary-700 to-teal-800 p-8 text-white shadow-elevated">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300 mb-2">
          <Sparkles className="h-4 w-4" /> Trung tâm trợ giúp
        </div>
        <h1 className="text-3xl font-black md:text-4xl">Câu Hỏi Thường Gặp (FAQ)</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-emerald-100 md:text-base">
          Tổng hợp những giải đáp chi tiết cho những câu hỏi thường gặp nhất khi mua sắm tại HomeMart.
        </p>
      </div>

      {/* Accordion FAQs */}
      <div className="space-y-3.5">
        {FAQS.map((faq, i) => (
          <details
            key={i}
            className="group rounded-3xl bg-white shadow-card ring-1 ring-slate-100/90 transition-all duration-200 open:ring-2 open:ring-emerald-500/30 overflow-hidden"
          >
            <summary className="cursor-pointer list-none px-6 py-5 font-bold text-slate-800 transition-colors marker:hidden hover:text-emerald-700 focus-visible:outline-none flex items-center justify-between gap-4">
              <span className="flex items-center gap-3 text-sm md:text-base">
                <HelpCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                {faq.q}
              </span>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition-transform duration-200 group-open:rotate-45 group-open:bg-slate-200 group-open:text-slate-900" aria-hidden>
                +
              </span>
            </summary>
            <p className="border-t border-slate-50 px-6 pb-6 pt-3 text-sm leading-relaxed text-slate-700">
              {faq.a}
            </p>
          </details>
        ))}
      </div>
    </article>
  );
}
