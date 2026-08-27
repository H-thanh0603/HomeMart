import type { LucideIcon } from 'lucide-react';
import {
  Armchair,
  Camera,
  ChefHat,
  HeartHandshake,
  Home,
  Lightbulb,
  Package,
  PlugZap,
  Recycle,
  Ruler,
  ShieldCheck,
  Sparkles,
  SprayCan,
  Truck,
  Wind,
  Wifi,
  Wrench,
  Zap,
} from 'lucide-react';

export interface CategoryHighlight {
  icon: LucideIcon;
  title: string;
  text: string;
}

export interface CategoryTheme {
  /** Tên danh mục gốc trong DB */
  name: string;
  icon: LucideIcon;
  kicker: string;
  title: string;
  tagline: string;
  description: string;

  /** Gradient hero: từ → qua → đến */
  heroGradient: [string, string, string];
  /** Màu nhấn chính của trang (nút, link, chip active) */
  accent: string;
  /** Màu nhấn đậm hơn cho hover/text */
  accentDeep: string;
  /** Nền nhẹ của vùng nội dung */
  wash: string;
  /** Chip phụ_category */
  chipBg: string;
  chipText: string;

  /** Hoạ tiết nền hero: 'tiles' | 'waves' | 'stripes' | 'bubbles' | 'grain' | 'circuit' */
  motif: 'tiles' | 'waves' | 'stripes' | 'bubbles' | 'grain' | 'circuit';
  /** Hero nền tối (text trắng) hay sáng */
  darkHero?: boolean;

  highlights: CategoryHighlight[];
}

const MOTIF_SVGS: Record<CategoryTheme['motif'], string> = {
  // Ô men gạch bếp
  tiles:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56'%3E%3Cg fill='none' stroke='%23ffffff' stroke-opacity='0.14' stroke-width='1.5'%3E%3Crect x='1' y='1' width='26' height='26' rx='6'/%3E%3Crect x='29' y='29' width='26' height='26' rx='6'/%3E%3C/g%3E%3C/svg%3E\")",
  // Sóng gió mát
  waves:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='32'%3E%3Cg fill='none' stroke='%23ffffff' stroke-opacity='0.16' stroke-width='2'%3E%3Cpath d='M0 16 Q 20 0 40 16 T 80 16'/%3E%3Cpath d='M-40 16 Q -20 32 0 16' opacity='0.5'/%3E%3C/g%3E%3C/svg%3E\")",
  // Sọc chéo công nghiệp
  stripes:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Cpath d='M-6 18 L18 -6 M0 30 L30 0 M6 30 L30 6' stroke='%23ffffff' stroke-opacity='0.09' stroke-width='5'/%3E%3C/svg%3E\")",
  // Bọt xà phòng
  bubbles:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='72' height='72'%3E%3Cg fill='none' stroke='%23ffffff' stroke-opacity='0.15' stroke-width='2'%3E%3Ccircle cx='14' cy='14' r='9'/%3E%3Ccircle cx='50' cy='42' r='13'/%3E%3Ccircle cx='30' cy='60' r='5'/%3E%3C/g%3E%3C/svg%3E\")",
  // Vân gỗ
  grain:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='36'%3E%3Cg fill='none' stroke='%23ffffff' stroke-opacity='0.12' stroke-width='1.6'%3E%3Cpath d='M0 8 Q 30 2 60 8 T 120 8'/%3E%3Cpath d='M0 20 Q 30 26 60 20 T 120 20'/%3E%3Cpath d='M0 32 Q 30 27 60 32 T 120 32'/%3E%3C/g%3E%3C/svg%3E\")",
  // Mạch điện tử
  circuit:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E%3Cg fill='none' stroke='%2322d3ee' stroke-opacity='0.25' stroke-width='1.5'%3E%3Cpath d='M8 8 H40 V40 H8 Z'/%3E%3Ccircle cx='40' cy='40' r='3'/%3E%3Cpath d='M56 88 V56 H88'/%3E%3Ccircle cx='56' cy='56' r='3'/%3E%3C/g%3E%3Ccircle cx='72' cy='24' r='2.5' fill='%2334d399' fill-opacity='0.35'/%3E%3C/svg%3E\")",
};

/** Hoạ tiết nền hero — data URI SVG cho từng thế giới. */
export const MOTIFS = MOTIF_SVGS;

const THEMES: Record<string, CategoryTheme> = {
  'nha-bep': {
    name: 'Nhà bếp',
    icon: ChefHat,
    kicker: 'Không gian ấm áp nhất nhà',
    title: 'Căn bếp của những bữa cơm ngon',
    tagline:
      'Từ nồi cháo nóng hổi buổi sáng đến mâm cơm tối rộn rã tiếng cười — mọi dụng cụ trong bếp đều sẵn sàng cùng bạn vào bếp.',
    description:
      'Đồ dùng nhà bếp chính hãng: nồi, chảo, dao thớt, dụng cụ làm bánh, hộp bảo quản thực phẩm. Giá tốt, freeship đơn từ 500K.',
    heroGradient: ['#7c2d12', '#c2410c', '#f59e0b'],
    accent: '#ea580c',
    accentDeep: '#9a3412',
    wash: '#fffbeb',
    chipBg: '#ffedd5',
    chipText: '#9a3412',
    motif: 'tiles',
    highlights: [
      { icon: ChefHat, title: 'An toàn thực phẩm', text: 'Chất liệu inox 304, gỗ tự nhiên, không BPA.' },
      { icon: Sparkles, title: 'Đủ mọi nhu cầu', text: 'Từ nấu nướng thường ngày đến làm bánh nâng cao.' },
      { icon: HeartHandshake, title: 'Thương hiệu tin dùng', text: 'Sunhouse, Lock&Lock, Electrolux — bảo hành chính hãng.' },
    ],
  },

  'dien-gia-dung': {
    name: 'Điện gia dụng',
    icon: PlugZap,
    kicker: 'Máy móc lo việc nặng',
    title: 'Ngôi nhà thông thái hơn mỗi ngày',
    tagline:
      'Nồi cơm thơm dẻo, sinh tố mát lành, quát mát êm ru — để máy móc đảm nhiệm phần vất vả, bạn giữ trọn phần thư giãn.',
    description:
      'Điện gia dụng chính hãng: nồi cơm điện, máy xay ép, quạt, máy lọc không khí, lò vi sóng. Bảo hành đầy đủ, giá tốt.',
    heroGradient: ['#0c4a6e', '#0284c7', '#38bdf8'],
    accent: '#0284c7',
    accentDeep: '#075985',
    wash: '#f0f9ff',
    chipBg: '#e0f2fe',
    chipText: '#075985',
    motif: 'waves',
    highlights: [
      { icon: ShieldCheck, title: 'Chính hãng 100%', text: 'Full bảo hành các thương hiệu Sharp, Panasonic, Philips.' },
      { icon: Zap, title: 'Tiết kiệm điện', text: 'Công nghệ inverter, tiêu thụ thấp, bền bỉ năm tháng.' },
      { icon: Truck, title: 'Giao lắp nhanh', text: 'Giao hàng toàn quốc, hỗ trợ đổi mới 7 ngày.' },
    ],
  },

  'dung-cu-sua-chua': {
    name: 'Dụng cụ sửa chữa',
    icon: Wrench,
    kicker: 'Trạm sửa chữa tại gia',
    title: 'Hỏng gì tự tay chữa được',
    tagline:
      'Đèn hở, ghế lung lay, tường cần khoan treo kệ — với bộ đồ nghề đúng chuẩn trong tay, mọi thứ trong nhà lại nên gọn như cũ.',
    description:
      'Dụng cụ sửa chữa chuyên nghiệp: bộ cơ khí, máy khoan, cờ lê, thước đo. Đủ món cho người chơi hệ DIY và thợ chuyên.',
    heroGradient: ['#1c1917', '#44403c', '#78716c'],
    accent: '#d97706',
    accentDeep: '#92400e',
    wash: '#fafaf9',
    chipBg: '#fef3c7',
    chipText: '#92400e',
    motif: 'stripes',
    darkHero: true,
    highlights: [
      { icon: Wrench, title: 'Đủ đồ nghề', text: 'Từ bộ tua vít 32 món đến máy khoan pin 20V công suất lớn.' },
      { icon: ShieldCheck, title: 'Thép CRV chắc chắn', text: 'Vanadium chrome chống mài mòn, chịu lực cao.' },
      { icon: Package, title: 'Vali gọn gàng', text: 'Mỗi bộ một vali — cất gọn, mang đi, tìm món tức thì.' },
    ],
  },

  've-sinh-nha-cua': {
    name: 'Vệ sinh nhà cửa',
    icon: SprayCan,
    kicker: 'Sạch từ nóc đến kẽ',
    title: 'Ngôi nhà sạch lấp lánh mỗi ngày',
    tagline:
      'Bụi chưa kịp đáp đã bị đuổi đi, sàn nhà sạch bong bóng kính soi — nhà sạch là nơi khởi nguồn của tâm trạng nhẹ nhõm.',
    description:
      'Đồ vệ sinh nhà cửa: máy hút bụi robot, chổi lau xoay 360°, thùng rác bàn đạp, túi rác. Nhà sạch, lòng thoải mái.',
    heroGradient: ['#134e4a', '#0d9488', '#2dd4bf'],
    accent: '#0d9488',
    accentDeep: '#115e59',
    wash: '#f0fdfa',
    chipBg: '#ccfbf1',
    chipText: '#115e59',
    motif: 'bubbles',
    highlights: [
      { icon: SprayCan, title: 'Sâu mọi ngóc ngách', text: 'Robot Lidar, lau xoay 360°, đầu chổi thiết kế riêng.' },
      { icon: Wind, title: 'Không khí trong lành', text: 'Lọc HEPA bắt bụi mịn, kín mùi, hợp nhà có trẻ nhỏ.' },
      { icon: Recycle, title: 'Bền — thay dễ', text: 'Phụ kiện thay thế luôn sẵn, dùng bền chứ không dùng once.' },
    ],
  },

  'noi-that-nho': {
    name: 'Nội thất nhỏ',
    icon: Armchair,
    kicker: 'Góc sống gọn gàng',
    title: 'Mỗi mét vuông đều đáng để tận dụng',
    tagline:
      'Một chiếc kệ đúng chỗ biến góc lộn xộn thành kệ sách yêu thích — nhà nhỏ không sao, gọn mới là sang.',
    description:
      'Nội thất nhỏ thông minh: kệ để đồ nhiều tầng, giá treo, móc dán chịu lực. Lắp đặt dễ dàng, tiết kiệm không gian.',
    heroGradient: ['#451a03', '#92400e', '#ca8a04'],
    accent: '#a16207',
    accentDeep: '#713f12',
    wash: '#fefce8',
    chipBg: '#fef3c7',
    chipText: '#713f12',
    motif: 'grain',
    highlights: [
      { icon: Armchair, title: 'Chịu lực thật', text: 'Kệ tải 30kg/tầng, móc dán chịu 5kg — nói là làm.' },
      { icon: Ruler, title: 'Lắp dễ như xếp hình', text: 'Enough dụng cụ kèm theo, 15 phút là xong.' },
      { icon: Home, title: 'Hợp mọi không gian', text: 'Phòng ngủ, bếp, ban công, nhà vệ sinh — chỗ nào cũng vừa.' },
    ],
  },

  'nha-thong-minh': {
    name: 'Nhà thông minh',
    icon: Lightbulb,
    kicker: 'Một chạm, cả tổ ấm',
    title: 'Nhà biết ý, chủ được việc',
    tagline:
      'Đèn tự bật khi bạn về, camera canh cửa lúc vắng nhà, ổ cắm hẹn giờ từ xa — ngôi nhà lắng nghe và thấu hiểu thói quen của bạn.',
    description:
      'Nhà thông minh Xiaomi, Aqara: đèn smart, ổ cắm wifi, camera AI, chuông cửa có hình. Kết nối Mi Home, Google, Alexa.',
    heroGradient: ['#1e1b4b', '#3730a3', '#6d28d9'],
    accent: '#0891b2',
    accentDeep: '#155e75',
    wash: '#f5f3ff',
    chipBg: '#cffafe',
    chipText: '#155e75',
    motif: 'circuit',
    darkHero: true,
    highlights: [
      { icon: Wifi, title: 'Kết nối mọi nơi', text: 'Điều khiển qua app Mi Home, Google Assistant, Alexa.' },
      { icon: Camera, title: 'An ninh AI', text: 'Camera phát hiện người, quay quét 360°, lưu cloud.' },
      { icon: Lightbulb, title: '16 triệu màu ánh sáng', text: 'Đèn smart đổi sắc theo thời khắc, sync nhạc sống động.' },
    ],
  },
};

/** Theme trung tính cho slug lạ (vẫn xem được sản phẩm). */
const FALLBACK: CategoryTheme = {
  name: 'Danh mục',
  icon: Sparkles,
  kicker: 'HomeMart',
  title: 'Khám phá sản phẩm',
  tagline: 'Đồ gia dụng chính hãng cho mọi tổ ấm — chọn đúng thứ bạn cần.',
  description: 'Sản phẩm gia dụng chính hãng tại HomeMart.',
  heroGradient: ['#065f46', '#059669', '#34d399'],
  accent: '#059669',
  accentDeep: '#047857',
  wash: '#ecfdf5',
  chipBg: '#d1fae5',
  chipText: '#065f46',
  motif: 'waves',
  highlights: [
    { icon: Truck, title: 'Freeship từ 500K', text: 'Giao hàng toàn quốc nhanh chóng.' },
    { icon: ShieldCheck, title: 'Chính hãng', text: 'Bảo hành đầy đủ theo nhà phân phối.' },
    { icon: HeartHandshake, title: 'Đổi trả dễ dàng', text: 'Hỗ trợ đổi mới trong 7 ngày.' },
  ],
};

export function getCategoryTheme(slug: string): CategoryTheme {
  return THEMES[slug] ?? FALLBACK;
}

export const THEME_SLUGS = Object.keys(THEMES);
