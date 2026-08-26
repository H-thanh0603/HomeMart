import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Câu hỏi thường gặp',
  description: 'Giải đáp các thắc mắc phổ biến về mua hàng, giao nhận, đổi trả tại HomeMart.',
};

const FAQS = [
  {
    q: 'Làm thế nào để đặt hàng?',
    a: 'Bạn chỉ cần chọn sản phẩm, thêm vào giỏ hàng, nhập địa chỉ giao hàng và chọn phương thức thanh toán. HomeMart hỗ trợ COD, VNPay, MoMo, thẻ quốc tế và chuyển khoản ngân hàng.',
  },
  {
    q: 'Phí vận chuyển được tính như thế nào?',
    a: 'Phí vận chuyển phụ thuộc vào trọng lượng đơn hàng và phương thức bạn chọn. Đơn hàng đạt giá trị tối thiểu của phương thức Tiêu chuẩn sẽ được miễn phí giao hàng.',
  },
  {
    q: 'Khi nào tôi nhận được hàng?',
    a: 'Với khu vực nội thành lớn, hàng thường đến trong 1–3 ngày làm việc; khu vực khác 3–7 ngày tùy phương thức vận chuyển hiển thị khi thanh toán.',
  },
  {
    q: 'Tôi có thể huỷ đơn hàng không?',
    a: 'Bạn có thể tự huỷ đơn ở trạng thái "Chờ xác nhận", "Đã xác nhận", "Đang xử lý" hoặc "Đang đóng gói" trong trang Chi tiết đơn hàng. Sau khi hàng được gửi đi, vui lòng liên hệ hotline.',
  },
  {
    q: 'Chính sách đổi trả như thế nào?',
    a: 'HomeMart hỗ trợ đổi trả trong vòng 7 ngày kể từ khi nhận hàng nếu sản phẩm lỗi do nhà sản xuất hoặc không đúng mô tả. Xem chi tiết tại trang Chính sách.',
  },
  {
    q: 'Tôi quên mật khẩu thì làm sao?',
    a: 'Chọn "Quên mật khẩu?" ở trang đăng nhập và nhập email đã đăng ký — hệ thống sẽ gửi link đặt lại mật khẩu.',
  },
];

export default function FaqPage() {
  return (
    <article className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Câu hỏi thường gặp</h1>
      <div className="space-y-3">
        {FAQS.map((faq, i) => (
          <details
            key={i}
            className="group rounded-xl bg-white shadow-card ring-1 ring-slate-100 open:ring-primary-200"
          >
            <summary className="cursor-pointer list-none px-5 py-4 font-medium text-slate-800 transition-colors marker:hidden hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-600 rounded-xl">
              <span className="flex items-center justify-between gap-3">
                {faq.q}
                <span className="shrink-0 text-primary-600 transition-transform group-open:rotate-45" aria-hidden>
                  +
                </span>
              </span>
            </summary>
            <p className="px-5 pb-4 pt-0 text-sm leading-relaxed text-slate-600">{faq.a}</p>
          </details>
        ))}
      </div>
    </article>
  );
}
