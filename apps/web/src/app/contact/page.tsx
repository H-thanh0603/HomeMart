import type { Metadata } from 'next';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Liên hệ',
  description: 'Liên hệ HomeMart — hotline, email hỗ trợ khách hàng 24/7.',
};

const CONTACTS = [
  {
    icon: Phone,
    title: 'Hotline',
    value: '1900 6868',
    note: '(8:00 – 21:00 tất cả các ngày)',
  },
  {
    icon: Mail,
    title: 'Email',
    value: 'hotro@homemart.vn',
    note: 'Phản hồi trong vòng 24 giờ',
  },
  {
    icon: MapPin,
    title: 'Văn phòng',
    value: 'Tầng 5, Tòa nhà Sông Đà, Mỹ Đình, Hà Nội',
    note: '',
  },
  {
    icon: Clock,
    title: 'Giờ làm việc',
    value: 'Thứ 2 – Chủ nhật: 8:00 – 21:00',
    note: '',
  },
];

export default function ContactPage() {
  return (
    <article className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Liên hệ với chúng tôi</h1>
      <p className="mb-6 text-sm text-slate-500">
        Bạn cần hỗ trợ về đơn hàng, sản phẩm hay hợp tác kinh doanh? Đội ngũ HomeMart luôn sẵn
        sàng giúp đỡ.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {CONTACTS.map(({ icon: Icon, title, value, note }) => (
          <div key={title} className="rounded-xl bg-white p-5 shadow-card ring-1 ring-slate-100">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
              <Icon className="h-5 w-5" />
            </span>
            <h2 className="mt-3 text-sm font-semibold text-slate-500">{title}</h2>
            <p className="mt-0.5 font-medium text-slate-800">{value}</p>
            {note && <p className="text-xs text-slate-400">{note}</p>}
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl bg-primary-50 p-5 text-sm leading-relaxed text-primary-900">
        <strong>Cần hỗ trợ đơn hàng?</strong> Hãy giữ số điện thoại đặt hàng và mã đơn hàng
        (VD: HM-20260101-000123) để chúng tôi tra cứu nhanh nhất.
      </div>
    </article>
  );
}
