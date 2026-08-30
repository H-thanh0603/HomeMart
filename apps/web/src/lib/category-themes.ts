import type { LucideIcon } from 'lucide-react';
import {
  Armchair,
  Camera,
  CheckCircle2,
  ChefHat,
  Cpu,
  Flame,
  Gauge,
  Hammer,
  HeartHandshake,
  Home,
  Layers,
  Lightbulb,
  Maximize2,
  Package,
  PlugZap,
  Power,
  Radio,
  Recycle,
  RotateCcw,
  Ruler,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  SprayCan,
  ThermometerSun,
  Truck,
  UtensilsCrossed,
  Waves,
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

export interface BespokeGuideStep {
  icon: LucideIcon;
  badge: string;
  title: string;
  desc: string;
}

export interface BespokeScenario {
  icon: LucideIcon;
  title: string;
  status: string;
  actions: string[];
}

export interface CategoryTheme {
  slug: string;
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
  /** Viền thẻ đặc thù */
  cardBorder: string;

  /** Hoạ tiết nền hero: 'tiles' | 'waves' | 'stripes' | 'bubbles' | 'grain' | 'circuit' */
  motif: 'tiles' | 'waves' | 'stripes' | 'bubbles' | 'grain' | 'circuit';
  darkHero?: boolean;

  /** 3 Cam kết cốt lõi */
  highlights: CategoryHighlight[];

  /** Banner đặc thù riêng của từng phòng */
  featureBanner: {
    kicker: string;
    headline: string;
    subtitle: string;
    tags: { label: string; icon: LucideIcon }[];
    stat: { number: string; label: string };
  };

  /** Hướng dẫn / Kịch bản chuyên biệt */
  guideSection?: {
    title: string;
    subtitle: string;
    steps: BespokeGuideStep[];
  };

  /** Kịch bản thông minh (Dành riêng cho Smart Home) */
  scenarios?: BespokeScenario[];
}

const MOTIF_SVGS: Record<CategoryTheme['motif'], string> = {
  // Ô men gạch bếp
  tiles:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56'%3E%3Cg fill='none' stroke='%23ffffff' stroke-opacity='0.16' stroke-width='1.5'%3E%3Crect x='1' y='1' width='26' height='26' rx='6'/%3E%3Crect x='29' y='29' width='26' height='26' rx='6'/%3E%3C/g%3E%3C/svg%3E\")",
  // Sóng gió mát / Điện lạnh
  waves:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='32'%3E%3Cg fill='none' stroke='%23ffffff' stroke-opacity='0.18' stroke-width='2'%3E%3Cpath d='M0 16 Q 20 0 40 16 T 80 16'/%3E%3Cpath d='M-40 16 Q -20 32 0 16' opacity='0.5'/%3E%3C/g%3E%3C/svg%3E\")",
  // Sọc công nghiệp / Cơ khí
  stripes:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Cpath d='M-6 18 L18 -6 M0 30 L30 0 M6 30 L30 6' stroke='%23f59e0b' stroke-opacity='0.14' stroke-width='4'/%3E%3C/svg%3E\")",
  // Bọt nước / Kháng khuẩn
  bubbles:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='72' height='72'%3E%3Cg fill='none' stroke='%23ffffff' stroke-opacity='0.18' stroke-width='2'%3E%3Ccircle cx='14' cy='14' r='9'/%3E%3Ccircle cx='50' cy='42' r='13'/%3E%3Ccircle cx='30' cy='60' r='5'/%3E%3C/g%3E%3C/svg%3E\")",
  // Vân gỗ / Nội thất
  grain:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='36'%3E%3Cg fill='none' stroke='%23ffffff' stroke-opacity='0.15' stroke-width='1.8'%3E%3Cpath d='M0 8 Q 30 2 60 8 T 120 8'/%3E%3Cpath d='M0 20 Q 30 26 60 20 T 120 20'/%3E%3Cpath d='M0 32 Q 30 27 60 32 T 120 32'/%3E%3C/g%3E%3C/svg%3E\")",
  // Bo mạch điện tử AI
  circuit:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E%3Cg fill='none' stroke='%2338bdf8' stroke-opacity='0.25' stroke-width='1.5'%3E%3Cpath d='M8 8 H40 V40 H8 Z'/%3E%3Ccircle cx='40' cy='40' r='3' fill='%2338bdf8' fill-opacity='0.3'/%3E%3Cpath d='M56 88 V56 H88'/%3E%3Ccircle cx='56' cy='56' r='3' fill='%23818cf8' fill-opacity='0.3'/%3E%3C/g%3E%3Ccircle cx='72' cy='24' r='3' fill='%2334d399' fill-opacity='0.4'/%3E%3C/svg%3E\")",
};

export const MOTIFS = MOTIF_SVGS;

const THEMES: Record<string, CategoryTheme> = {
  'nha-bep': {
    slug: 'nha-bep',
    name: 'Nhà bếp',
    icon: ChefHat,
    kicker: 'Không gian ấm áp nhất nhà',
    title: 'Căn Bếp Của Những Bữa Cơm Ngon',
    tagline:
      'Từ chiếc nồi kho cá đượm vị đến bộ dao thớt sắc bén — tuyển chọn đồ dùng nhà bếp chuẩn an toàn thực phẩm, đồng hành cùng tình yêu nấu nướng.',
    description:
      'Đồ dùng nhà bếp chính hãng: nồi chảo chống dính, dao kéo cao cấp, dụng cụ làm bánh, hộp thủy tinh bảo quản.',
    heroGradient: ['#7c2d12', '#c2410c', '#f59e0b'],
    accent: '#ea580c',
    accentDeep: '#9a3412',
    wash: '#fffbeb',
    chipBg: '#ffedd5',
    chipText: '#9a3412',
    cardBorder: 'border-amber-200/80',
    motif: 'tiles',
    highlights: [
      { icon: ChefHat, title: 'Inox 304 & Gốm Sứ', text: 'Tuyệt đối không thôi nhiễm chất độc hại, an toàn cho trẻ nhỏ.' },
      { icon: ThermometerSun, title: 'Bắt nhiệt & Giữ nhiệt tốt', text: 'Đáy từ 3-5 lớp, nấu nhanh trên mọi loại bếp gas và từ.' },
      { icon: HeartHandshake, title: 'Đổi mới 7 ngày', text: 'Bảo hành chống dính và lỗi từ nhà sản xuất tận nơi.' },
    ],
    featureBanner: {
      kicker: 'Bí quyết ẩm thực',
      headline: 'Chuẩn Bị Bữa Cơm Gia Đình Nhanh Gấp 2 Lần',
      subtitle: 'Trang bị trọn bộ nồi chảo chống dính vân đá và dao kéo rèn Đức giúp tiết kiệm thời gian vào bếp mỗi tối.',
      tags: [
        { label: 'Không PFOA/PTFE', icon: ShieldCheck },
        { label: 'Mọi loại bếp', icon: Flame },
        { label: 'Rửa máy chén an toàn', icon: CheckCircle2 },
      ],
      stat: { number: '100%', label: 'Thực phẩm giữ trọn dinh dưỡng' },
    },
    guideSection: {
      title: '3 Tiêu Chí Chọn Dụng Cụ Nấu Ăn Bền Lâu',
      subtitle: 'Lời khuyên từ các chuyên gia ẩm thực hàng đầu tại HomeMart',
      steps: [
        {
          icon: UtensilsCrossed,
          badge: 'Bước 1',
          title: 'Chọn đáy từ đa lớp nguyên khối',
          desc: 'Nồi chảo đáy đúc 3 lớp inox-nhôm-inox truyền nhiệt đều, không bị lồi đáy sau thời gian dài sử dụng.',
        },
        {
          icon: ShieldCheck,
          badge: 'Bước 2',
          title: 'Lớp chống dính phủ khoáng tự nhiên',
          desc: 'Ưu tiên chống dính vân đá Maifan hoặc Ceramic gốm giúp chiên xào ít dầu mỡ, dễ vệ sinh.',
        },
        {
          icon: Layers,
          badge: 'Bước 3',
          title: 'Phụ kiện thủy tinh chịu nhiệt Borosilicate',
          desc: 'Hộp thực phẩm và nắp kính cường lực chịu sốc nhiệt từ -20°C đến 400°C an toàn tuyệt đối trong lò nướng.',
        },
      ],
    },
  },

  'dien-gia-dung': {
    slug: 'dien-gia-dung',
    name: 'Điện gia dụng',
    icon: PlugZap,
    kicker: 'Công nghệ phục vụ cuộc sống',
    title: 'Thiết Bị Điện Thông Thái & Tiết Kiệm Năng Lượng',
    tagline:
      'Nồi chiên không dầu tách béo, nồi cơm điện cao tần IH giữ trọn vị hạt gạo, máy xay êm ái — giải phóng sức lao động để bạn tận hưởng cuộc sống.',
    description:
      'Điện gia dụng chính hãng: nồi cơm IH, nồi chiên không dầu, quạt máy, lò vi sóng, máy ép chậm.',
    heroGradient: ['#082f49', '#0284c7', '#38bdf8'],
    accent: '#0284c7',
    accentDeep: '#0369a1',
    wash: '#f0f9ff',
    chipBg: '#e0f2fe',
    chipText: '#0369a1',
    cardBorder: 'border-sky-200/80',
    motif: 'waves',
    highlights: [
      { icon: Zap, title: 'Inverter Tiết Kiệm Điện', text: 'Hiệu suất chuẩn 5 sao năng lượng, giảm tới 40% hoá đơn điện.' },
      { icon: ShieldCheck, title: 'Bảo Hành 12-24 Tháng', text: 'Kích hoạt bảo hành điện tử chính hãng từ Sharp, Philips, Sunhouse.' },
      { icon: Truck, title: 'Giao Hỏa Tốc & Đồng Kiểm', text: 'Mở hộp kiểm tra thử máy trước khi thanh toán, an tâm tuyệt đối.' },
    ],
    featureBanner: {
      kicker: 'Công nghệ đỉnh cao',
      headline: 'Chuẩn Tiết Kiệm Điện A+++ Cho Mọi Thiết Bị',
      subtitle: 'Động cơ biến tần Smart Inverter thế hệ mới vận hành êm ái dưới 35dB, kéo dài tuổi thọ thiết bị lên đến 10 năm.',
      tags: [
        { label: 'Smart Inverter 2026', icon: Zap },
        { label: 'Bảo hành motor 5 năm', icon: ShieldCheck },
        { label: 'Tự ngắt an toàn', icon: Power },
      ],
      stat: { number: '-45%', label: 'Điện năng tiêu thụ trung bình' },
    },
    guideSection: {
      title: 'Bí Quyết Chọn Thiết Bị Điện Gia Dụng Chuẩn Gia Đình',
      subtitle: 'Tối ưu công năng và công suất phù hợp diện tích sống',
      steps: [
        {
          icon: Gauge,
          badge: 'Công suất',
          title: 'Chọn dải công suất phù hợp thành viên',
          desc: 'Gia đình 2-4 người: Nồi cơm 1.2L - 1.8L; Nồi chiên 5L - 7L đủ nướng gà nguyên con nguyên vị.',
        },
        {
          icon: Zap,
          badge: 'Tiết kiệm',
          title: 'Ưu tiên cảm biến nhiệt thông minh NTC',
          desc: 'Tự động ngắt khi quá nhiệt và duy trì dải nhiệt độ chính xác từng độ C giúp món ăn chín vàng đều.',
        },
        {
          icon: RotateCcw,
          badge: 'Vệ sinh',
          title: 'Lòng nồi tráng men chống dính tháo rời',
          desc: 'Các khay hứng mỡ và giỏ chiên thiết kế phủ men kim cương chống trầy, rửa nhanh không tốn công.',
        },
      ],
    },
  },

  'dung-cu-sua-chua': {
    slug: 'dung-cu-sua-chua',
    name: 'Dụng cụ sửa chữa',
    icon: Wrench,
    kicker: 'Trạm cơ khí & DIY tại gia',
    title: 'Trọn Bộ Đồ Nghề Thép CR-V Bền Bỉ Chuẩn Chuyên Nghiệp',
    tagline:
      'Khoan bắt vít treo tranh, siết ốc ghế lung lay, lắp ghép bàn học — trọn bộ dụng cụ cơ khí giúp bạn tự tay chăm sóc và hoàn thiện mọi ngóc ngách ngôi nhà.',
    description:
      'Dụng cụ sửa chữa cầm tay: máy khoan pin không chổi than, bộ cờ lê, kìm đa năng, thước đo laser, vali đồ nghề.',
    heroGradient: ['#18181b', '#27272a', '#78350f'],
    accent: '#d97706',
    accentDeep: '#b45309',
    wash: '#fafaf9',
    chipBg: '#fef3c7',
    chipText: '#92400e',
    cardBorder: 'border-amber-300/80',
    motif: 'stripes',
    darkHero: true,
    highlights: [
      { icon: Hammer, title: 'Thép Chrome Vanadium (CR-V)', text: 'Tôi cứng 60 HRC, chống gỉ sét, chịu lực siết cực lớn.' },
      { icon: Package, title: 'Vali Đựng Chống Va Đập', text: 'Sắp xếp khoa học, có khay định hình, dễ mang vác và bảo quản.' },
      { icon: ShieldCheck, title: 'Độ Chính Xác Cao', text: 'Thước laser sai số < 1mm, đầu vít từ tính hút ốc mạnh mẽ.' },
    ],
    featureBanner: {
      kicker: 'Chất lượng công nghiệp',
      headline: 'Động Cơ Brushless Không Chổi Than 21V',
      subtitle: 'Máy khoan pin và siết bulong thế hệ mới: lực xoắn 80Nm cực đại, làm việc liên tục 6 tiếng với 2 pin Lithium dung lượng cao.',
      tags: [
        { label: 'Thép CR-V mạ Chrome', icon: ShieldCheck },
        { label: 'Motor Brushless', icon: Cpu },
        { label: 'Đèn LED soi góc tối', icon: Lightbulb },
      ],
      stat: { number: '60 HRC', label: 'Độ cứng chuẩn công nghiệp' },
    },
    guideSection: {
      title: 'Hộp Đồ Nghề Cần Thiết Cho Mọi Gia Đình',
      subtitle: '3 Món không thể thiếu khi về nhà mới',
      steps: [
        {
          icon: Wrench,
          badge: 'Cơ bản',
          title: 'Bộ tua vít đa năng 32 chi tiết có từ tính',
          desc: 'Mở được từ ốc vít mắt kính, điện thoại, laptop đến đồ gia dụng lớn trong nhà.',
        },
        {
          icon: Hammer,
          badge: 'Sửa chữa',
          title: 'Kìm bấm & Cờ lê tự động đảo chiều',
          desc: 'Xử lý đường ống nước rò rỉ, siết bulong góc hẹp chỉ cần lắc nhẹ mà không cần nhấc cờ lê.',
        },
        {
          icon: Ruler,
          badge: 'Đo đạc',
          title: 'Thước cuộn bọc cao su chống sốc + Nivo cân bằng',
          desc: 'Đảm bảo tranh ảnh, giá sách, gương phòng tắm luôn được treo thẳng tắp chuẩn chỉnh.',
        },
      ],
    },
  },

  've-sinh-nha-cua': {
    slug: 've-sinh-nha-cua',
    name: 'Vệ sinh nhà cửa',
    icon: SprayCan,
    kicker: 'Sạch khuẩn & Tinh tươm',
    title: 'Ngôi Nhà Sạch Lấp Lánh & Không Khí Trong Lành',
    tagline:
      'Robot hút bụi định vị Lidar 3D, cây lau nhà xoay trợ lực 360°, máy lọc không khí bắt 99.97% bụi mịn PM2.5 — giữ cho tổ ấm luôn thơm mát và an lành.',
    description:
      'Dụng cụ vệ sinh thông minh: robot hút bụi, cây lau nhà tự vắt, máy chà sàn cầm tay, túi rác tự hủy sinh học.',
    heroGradient: ['#042f2e', '#0f766e', '#14b8a6'],
    accent: '#0d9488',
    accentDeep: '#0f766e',
    wash: '#f0fdfa',
    chipBg: '#ccfbf1',
    chipText: '#0f766e',
    cardBorder: 'border-teal-200/80',
    motif: 'bubbles',
    highlights: [
      { icon: Wind, title: 'Màng Lọc HEPA H13', text: 'Bắt giữ vi khuẩn, phấn hoa và bụi mịn PM2.5, bảo vệ hệ hô hấp.' },
      { icon: SprayCan, title: 'Khử Khuẩn Ion & Tia UV', text: 'Tiêu diệt 99.9% vi khuẩn gây mùi trên sàn nhà và thảm trải.' },
      { icon: Recycle, title: 'Nhựa Nguyên Sinh & Thân Thiện', text: 'Chất liệu bền chắc, túi rác sinh học phân huỷ an toàn cho môi trường.' },
    ],
    featureBanner: {
      kicker: 'Nhà sạch thảnh thơi',
      headline: 'Hút Sạch 99.9% Bụi Mịn & Diệt Khuẩn Bằng Tia UV',
      subtitle: 'Hệ thống lau sàn rung sóng âm kết hợp bình chứa nước điện phân tạo ion bạc giúp sàn nhà sạch bóng không tì vết.',
      tags: [
        { label: 'Màng lọc HEPA H13', icon: Wind },
        { label: 'Lidar 3D tránh vật cản', icon: Radio },
        { label: 'Kháng khuẩn Ion Bạc', icon: ShieldCheck },
      ],
      stat: { number: '99.9%', label: 'Tỉ lệ diệt khuẩn & nấm mốc' },
    },
    guideSection: {
      title: 'Quy Trình 3 Bước Dọn Nhà 15 Phút Thảnh Thơi',
      subtitle: 'Bí quyết giữ ngôi nhà luôn sạch tinh tươm mỗi ngày',
      steps: [
        {
          icon: Wind,
          badge: 'Bước 1',
          title: 'Hút bụi từ trên cao xuống sàn',
          desc: 'Dùng đầu hút mềm quét sạch bụi rèm cửa, mặt bàn và các khe ghế sofa trước khi xử lý sàn nhà.',
        },
        {
          icon: SprayCan,
          badge: 'Bước 2',
          title: 'Lau sàn trợ lực 360° với nước ấm',
          desc: 'Bông lau microfiber thấm hút gấp 5 lần sợi thường, đánh bay vết dầu mỡ nhà bếp chỉ sau 1 đường lau.',
        },
        {
          icon: Sparkles,
          badge: 'Bước 3',
          title: 'Bật máy lọc không khí chế độ khử khuẩn',
          desc: 'Giải phóng ion âm lọc sạch mùi thức ăn, đem lại không gian thoáng mát như trong lành giữa rừng cây.',
        },
      ],
    },
  },

  'noi-that-nho': {
    slug: 'noi-that-nho',
    name: 'Nội thất nhỏ',
    icon: Armchair,
    kicker: 'Giải pháp tối ưu không gian',
    title: 'Góc Sống Tinh Tế & Tiết Kiệm Diện Tích Tổ Ấm',
    tagline:
      'Kệ đa năng thông minh, giá treo đồ gấp gọn, kệ gia vị xoay 360° — biến từng mét vuông diện tích thành không gian ngăn nắp, thoáng đãng và giàu thẩm mỹ.',
    description:
      'Nội thất nhỏ thông minh: kệ sách mini, tủ tab đầu giường, giá treo quần áo di động, kệ bếp 4 tầng chịu lực.',
    heroGradient: ['#451a03', '#92400e', '#d97706'],
    accent: '#b45309',
    accentDeep: '#78350f',
    wash: '#fefce8',
    chipBg: '#fef3c7',
    chipText: '#78350f',
    cardBorder: 'border-amber-200/80',
    motif: 'grain',
    highlights: [
      { icon: Armchair, title: 'Chịu Tải 30kg / Tầng', text: 'Khung thép sơn tĩnh điện chống rỉ kết hợp gỗ MDF phủ Melamine cao cấp.' },
      { icon: Maximize2, title: 'Tăng 50% Diện Tích Lưu Trữ', text: 'Thiết kế theo chiều dọc thông minh, khai thác tối đa góc tường hẹp.' },
      { icon: Ruler, title: 'Lắp Đặt 15 Phút Tại Nhà', text: 'Kèm đầy đủ lục giác, ốc vít và bản vẽ hướng dẫn chi tiết từng bước.' },
    ],
    featureBanner: {
      kicker: 'Japandi & Bắc Âu',
      headline: 'Biến Góc Nhỏ Hẹp Thành Điểm Nhấn Nghệ Thuật',
      subtitle: 'Thiết kế tối giản phối màu gỗ ấm áp, bề mặt chống trầy xước và chống thấm nước, dễ dàng lau chùi.',
      tags: [
        { label: 'Gỗ MDF chống ẩm', icon: ShieldCheck },
        { label: 'Chịu lực 30kg/tầng', icon: Layers },
        { label: 'Dễ dàng tháo lắp', icon: Wrench },
      ],
      stat: { number: '+50%', label: 'Diện tích lưu trữ tận dụng' },
    },
    guideSection: {
      title: '3 Mẹo Bố Trí Không Gian Cho Căn Hộ Nhỏ',
      subtitle: 'Tối ưu diện tích phòng ngủ, bếp và ban công',
      steps: [
        {
          icon: Maximize2,
          badge: 'Không gian',
          title: 'Tận dụng không gian thẳng đứng (Vertical Storage)',
          desc: 'Sử dụng kệ treo tường và giá đỡ nhiều tầng giúp giải phóng toàn bộ mặt sàn đi lại.',
        },
        {
          icon: RotateCcw,
          badge: 'Linh hoạt',
          title: 'Chọn nội thất có bánh xe xoay 360° có khoá',
          desc: 'Dễ dàng di chuyển kệ xe đẩy từ bếp ra phòng khách khi có khách và cất gọn vào góc khi xong việc.',
        },
        {
          icon: Home,
          badge: 'Thẩm mỹ',
          title: 'Đồng bộ tông màu gỗ ấm & khung sơn trắng/đen',
          desc: 'Tạo cảm giác thị giác liền mạch, giúp căn phòng trông rộng rãi và ấm cúng hơn thực tế.',
        },
      ],
    },
  },

  'nha-thong-minh': {
    slug: 'nha-thong-minh',
    name: 'Nhà thông minh',
    icon: Lightbulb,
    kicker: 'Hệ sinh thái Smart Home 2026',
    title: 'Ngôi Nhà Thấu Hiểu Thói Quen & Tự Động Hóa 1 Chạm',
    tagline:
      'Đèn tự bật khi bước vào nhà, camera AI bảo vệ 24/7, ổ cắm điều khiển từ xa qua giọng nói — mang công nghệ tương lai vào trọn vẹn ngôi nhà bạn.',
    description:
      'Thiết bị Smart Home Xiaomi, Aqara, Tuya: cảm biến chuyển động, camera an ninh AI, công tắc thông minh, đèn LED 16 triệu màu.',
    heroGradient: ['#0f172a', '#1e1b4b', '#4338ca'],
    accent: '#4f46e5',
    accentDeep: '#3730a3',
    wash: '#f5f3ff',
    chipBg: '#ede9fe',
    chipText: '#3730a3',
    cardBorder: 'border-indigo-200/80',
    motif: 'circuit',
    darkHero: true,
    highlights: [
      { icon: Wifi, title: 'Chuẩn Matter & Zigbee 3.0', text: 'Kết nối ổn định tầm xa, phản hồi tức thì dưới 50ms không phụ thuộc mạng.' },
      { icon: Smartphone, title: 'Điều Khiển Giọng Nói', text: 'Tương thích 100% Apple HomeKit, Google Assistant và Xiaomi Mi Home.' },
      { icon: Camera, title: 'An Ninh AI Nhận Diện Người', text: 'Camera quay quét 360° 2K, cảnh báo đột nhập trực tiếp về điện thoại.' },
    ],
    featureBanner: {
      kicker: 'Smart Living',
      headline: 'Hệ Sinh Thái Tự Động Hóa Không Cần Chạm',
      subtitle: 'Cảm biến hiện diện mmWave siêu nhạy phát hiện người thở, tự động kích hoạt điều hòa, đèn chiếu sáng và rèm cửa.',
      tags: [
        { label: 'Matter & Zigbee 3.0', icon: Wifi },
        { label: 'Phản hồi <50ms', icon: Zap },
        { label: 'Bảo mật chuẩn Apple Home', icon: ShieldCheck },
      ],
      stat: { number: '<50ms', label: 'Tốc độ phản hồi tự động hóa' },
    },
    scenarios: [
      {
        icon: ThermometerSun,
        title: '🌅 Kịch bản "Chào Buổi Sáng"',
        status: 'Kích hoạt lúc 6:30 AM',
        actions: ['Rèm mở đón nắng tự nhiên 50%', 'Bình đun nước thông minh tự bật sôi', 'Đèn đổi tông ấm dịu 2700K'],
      },
      {
        icon: ShieldAlert,
        title: '🚪 Kịch bản "Rời Khỏi Nhà"',
        status: 'Kích hoạt khi cửa khoá',
        actions: ['Tắt toàn bộ đèn & ngắt điện ổ cắm phụ', 'Robot bắt đầu chu trình hút bụi tự động', 'Kích hoạt camera AI cảnh báo chống trộm'],
      },
      {
        icon: Lightbulb,
        title: '🎬 Kịch bản "Thư Giãn & Xem Phim"',
        status: 'Kích hoạt bằng giọng nói',
        actions: ['Đèn trần giảm độ sáng về 15%', 'Bật dải LED Neon RGB hiệu ứng rạp phim', 'Máy lọc khí chuyển chế độ êm dịu 22dB'],
      },
    ],
  },
};

const FALLBACK: CategoryTheme = {
  slug: 'tat-ca',
  name: 'Danh mục',
  icon: Sparkles,
  kicker: 'HomeMart',
  title: 'Khám Phá Toàn Bộ Sản Phẩm Gia Dụng',
  tagline: 'Sản phẩm chính hãng tuyển chọn cho tổ ấm của bạn — chất lượng cao, giá tốt, đổi trả 7 ngày.',
  description: 'Sản phẩm gia dụng chính hãng tại HomeMart.',
  heroGradient: ['#065f46', '#059669', '#10b981'],
  accent: '#059669',
  accentDeep: '#047857',
  wash: '#f0fdf4',
  chipBg: '#dcfce7',
  chipText: '#064e3b',
  cardBorder: 'border-emerald-200/80',
  motif: 'waves',
  highlights: [
    { icon: Truck, title: 'Freeship từ 299K', text: 'Giao hàng toàn quốc nhanh chóng, an toàn.' },
    { icon: ShieldCheck, title: '100% Chính hãng', text: 'Đầy đủ hoá đơn VAT và tem bảo hành điện tử.' },
    { icon: HeartHandshake, title: 'Đổi mới trong 7 ngày', text: 'Hỗ trợ đổi trả tận nhà miễn phí nếu có lỗi kỹ thuật.' },
  ],
  featureBanner: {
    kicker: 'HomeMart Tuyển Chọn',
    headline: 'Sản Phẩm Chất Lượng Cho Cuộc Sống Tiện Nghi',
    subtitle: 'Hàng ngàn mặt hàng gia dụng thông minh chính hãng với mức giá tốt nhất.',
    tags: [
      { label: 'Chính hãng 100%', icon: ShieldCheck },
      { label: 'Giao nhanh 2h', icon: Truck },
    ],
    stat: { number: '100%', label: 'Hài lòng khi nhận hàng' },
  },
};

export function getCategoryTheme(slug: string): CategoryTheme {
  return THEMES[slug] ?? FALLBACK;
}

export const THEME_SLUGS = Object.keys(THEMES);
