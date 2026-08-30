import type { Metadata } from 'next';
import { Clock, Mail, MapPin, Phone, Sparkles } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Liên hệ với HomeMart',
  description: 'Liên hệ HomeMart — hotline, email hỗ trợ khách hàng và văn phòng làm việc.',
};

const CONTACTS = [
  {
    icon: Phone,
    title: 'Tổng đài Hotline',
    value: '1900 8888',
    note: '(8:00 – 21:00 tất cả các ngày trong tuần)',
    accent: 'bg-emerald-50 text-emerald-700',
  },
  {
    icon: Mail,
    title: 'Hộp thư điện tử (Email)',
    value: 'hotro@homemart.vn',
    note: 'Phản hồi trong vòng 24 giờ làm việc',
    accent: 'bg-amber-50 text-amber-700',
  },
  {
    icon: MapPin,
    title: 'Trụ sở văn phòng',
    value: 'Tầng 5, Tòa nhà Sông Đà, Mỹ Đình, Hà Nội',
    note: 'Chi nhánh: Quận 1, TP. Hồ Chí Minh',
    accent: 'bg-sky-50 text-sky-700',
  },
  {
    icon: Clock,
    title: 'Thời gian phục vụ',
    value: 'Thứ 2 – Chủ nhật: 8:00 – 21:00',
    note: 'Kênh chat trực tuyến hỗ trợ 24/7',
    accent: 'bg-purple-50 text-purple-700',
  },
];

export default function ContactPage() {
  return (
    <article className="mx-auto max-w-4xl space-y-8 py-4">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-800 via-primary-700 to-teal-800 p-8 text-white shadow-elevated">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300 mb-2">
          <Sparkles className="h-4 w-4" /> Hỗ trợ khách hàng
        </div>
        <h1 className="text-3xl font-black md:text-4xl">Liên Hệ Với HomeMart</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-emerald-100 md:text-base">
          Bạn cần hỗ trợ về đơn hàng, thông tin sản phẩm hay hợp tác kinh doanh? Đội ngũ chăm sóc khách hàng luôn sẵn sàng phục vụ bạn.
        </p>
      </div>

      {/* Grid of contact cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {CONTACTS.map(({ icon: Icon, title, value, note, accent }) => (
          <div key={title} className="rounded-3xl bg-white p-6 shadow-card ring-1 ring-slate-100/90 flex items-start gap-4">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${accent}`}>
              <Icon className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</h2>
              <p className="mt-1 text-base font-extrabold text-slate-900">{value}</p>
              {note && <p className="mt-0.5 text-xs text-slate-500">{note}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Quick notice box */}
      <div className="rounded-2xl bg-emerald-50/80 p-6 text-sm leading-relaxed text-emerald-950 ring-1 ring-emerald-200">
        <strong className="font-bold text-emerald-900">💡 Mẹo tra cứu nhanh:</strong> Khi liên hệ về đơn hàng, bạn vui lòng chuẩn bị sẵn số điện thoại đặt hàng hoặc mã đơn hàng (Ví dụ: HM-20260101-000123) để chúng tôi kiểm tra và hỗ trợ bạn nhanh nhất.
      </div>
    </article>
  );
}
