/**
 * HomeMart seed — realistic Vietnamese home-goods catalog.
 * 22 categories (tree), 10 brands, 100+ products with variants/inventory,
 * users for all roles, vouchers, shipping methods.
 */
import { PrismaClient, ProductStatus } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient(
  new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL })),
);

const slugify = (s: string) => {
  const from = 'àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ';
  const to = 'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd';
  let x = s.toLowerCase();
  for (let i = 0; i < from.length; i++) x = x.replaceAll(from[i], to[i]);
  return x.replace(/[^a-z0-9\s-]/g, '').trim().replace(/[\s-]+/g, '-');
};

// ─── Category tree ───
const CATEGORY_TREE: { name: string; children?: string[] }[] = [
  { name: 'Nhà bếp', children: ['Nồi & Lòng nồi', 'Chảo & Xào', 'Dao & Thớt', 'Dụng cụ làm bánh', 'Hộp bảo quản thực phẩm', 'Dụng cụ pha chế'] },
  { name: 'Điện gia dụng', children: ['Nồi cơm điện', 'Máy xay & Máy ép', 'Quạt điện', 'Máy lọc không khí', 'Bàn ủi & Máy sấy tóc', 'Lò vi sóng & Nướng'] },
  { name: 'Dụng cụ sửa chữa', children: ['Bộ dụng cụ cơ khí', 'Máy khoan & Mũi khoan', 'Thước đo & Cờ lê'] },
  { name: 'Vệ sinh nhà cửa', children: ['Chổi & Lau nhà', 'Máy hút bụi', 'Thùng rác & Túi rác'] },
  { name: 'Nội thất nhỏ', children: ['Kệ để đồ', 'Giá treo & Móc treo'] },
  { name: 'Nhà thông minh', children: ['Đèn thông minh', 'Ổ cắm & Công tắc thông minh', 'Camera & Chuông cửa'] },
];

const BRANDS = ['Sharp', 'Toshiba', 'Panasonic', 'Philips', 'Sunhouse', 'Lock&Lock', 'Xiaomi', 'Electrolux', 'Kangaroo', 'Total'];

interface P {
  name: string; cat: string; brand: string; price: number; compareAt?: number;
  short: string; variants?: { attr: string; values: [string, ...string[]]; priceDelta: number[] }[];
  tags?: string[]; attrs?: [string, string][];
}

const PRODUCTS: P[] = [
  // Nồi cơm điện
  { name: 'Nồi cơm điện Sharp KS-N191ETV 1.8L', cat: 'Nồi cơm điện', brand: 'Sharp', price: 1090000, compareAt: 1390000, short: 'Nồi cơm điện dung tích 1.8L, lòng nồi chống dính, giữ ấm 12 giờ.', tags: ['noi com'], attrs: [['Dung tích', '1.8L'], ['Công suất', '700W'], ['Bảo hành', '12 tháng']] },
  { name: 'Nồi cơm điện Toshiba RC-10JFMVN 1.0L', cat: 'Nồi cơm điện', brand: 'Toshiba', price: 1250000, compareAt: 1590000, short: 'Công nghệ nấu 3D, cảm biến nhiệt thông minh.', tags: ['noi com'], attrs: [['Dung tích', '1.0L'], ['Công suất', '550W']] },
  { name: 'Nồi cơm điện Panasonic SR-MVN107', cat: 'Nồi cơm điện', brand: 'Panasonic', price: 1190000, short: 'Thiết kế nhỏ gọn, phù hợp gia đình 4 người.', tags: ['noi com'], attrs: [['Dung tích', '1.0L']] },
  { name: 'Nồi cơm điện Sunhouse SHD8602', cat: 'Nồi cơm điện', brand: 'Sunhouse', price: 690000, compareAt: 850000, short: 'Giá trị gia đình, nấu nhanh tiết kiệm điện.', tags: ['noi com'], attrs: [['Dung tích', '1.5L']] },
  // Máy xay
  { name: 'Máy xay sinh tố Philips HR2056', cat: 'Máy xay & Máy ép', brand: 'Philips', price: 890000, compareAt: 1150000, short: '2 cối xay, lưỡi thép không gỉ, xay đá cực mạnh.', tags: ['may xay'], variants: [{ attr: 'Màu sắc', values: ['Trắng', 'Đen', 'Xanh'], priceDelta: [0, 50000, 30000] }], attrs: [['Công suất', '400W'], ['Dung tích', '1.5L']] },
  { name: 'Máy xay cầm tay Panasonic MX-SS1', cat: 'Máy xay & Máy ép', brand: 'Panasonic', price: 790000, short: 'Xay trực tiếp trong ly, tiện lợi vệ sinh.' },
  { name: 'Máy ép chậm Xiaomi Mi Juicer', cat: 'Máy xay & Máy ép', brand: 'Xiaomi', price: 1890000, compareAt: 2200000, short: 'Ép chậm giữ nguyên dinh dưỡng, vận hành êm ái.' },
  { name: 'Máy xay thịt Kangaroo KG268', cat: 'Máy xay & Máy ép', brand: 'Kangaroo', price: 650000, short: 'Xay thịt, rau củ, đậu nành đa năng.' },
  // Quạt điện
  { name: 'Quạt đứng Panasonic F-EY1511', cat: 'Quạt điện', brand: 'Panasonic', price: 1450000, compareAt: 1690000, short: 'Gió mạnh êm ái, độ bền cao.', variants: [{ attr: 'Chiều cao', values: ['1.4m', '1.6m'], priceDelta: [0, 150000] }] },
  { name: 'Quạt bàn Sharp PJ77CD', cat: 'Quạt điện', brand: 'Sharp', price: 750000, short: '3 tốc độ gió, quay rộng 90 độ.' },
  { name: 'Quạt tháp Electrolux EAT3230', cat: 'Quạt điện', brand: 'Electrolux', price: 1990000, short: 'Thiết kế tháp hiện đại, điều khiển từ xa.' },
  { name: 'Quạt treo tường Sunhouse SHD5693', cat: 'Quạt điện', brand: 'Sunhouse', price: 520000, short: 'Tiết kiệm không gian, hợp quán ăn, nhà hàng.' },
  { name: 'Quạt điều hòa Kangaroo KG50F', cat: 'Quạt điện', brand: 'Kangaroo', price: 2790000, compareAt: 3200000, short: 'Làm mát bằng nước, tiết kiệm 80% điện.' },
  // Máy hút bụi / lọc khí
  { name: 'Robot hút bụi Xiaomi Robot Vacuum S10', cat: 'Máy hút bụi', brand: 'Xiaomi', price: 6490000, compareAt: 7990000, short: 'Lidar định dạng laser, kéo sàn lau bụi thông minh.', tags: ['robot hut bui'], attrs: [['Lực hút', '4000Pa'], ['Pin', '3200mAh']] },
  { name: 'Máy hút bụi Electrolux Z1220', cat: 'Máy hút bụi', brand: 'Electrolux', price: 1690000, short: 'Dạng đứng gọn nhẹ, bộ lọc HEPA.' },
  { name: 'Máy hút bụi cầm tay Kangaroo KG9001', cat: 'Máy hút bụi', brand: 'Kangaroo', price: 890000, short: 'Không dây, sạc nhanh, hút ghế sofa ô tô.' },
  { name: 'Máy lọc không khí Xiaomi Air Purifier 4', cat: 'Máy lọc không khí', brand: 'Xiaomi', price: 3490000, compareAt: 4200000, short: 'Lọc 99.97% bụi mịn PM2.5, điều khiển app.' },
  { name: 'Máy lọc không khí Philips AC1215', cat: 'Máy lọc không khí', brand: 'Philips', price: 4590000, short: 'Phòng 63m², cảm biến tự động.' },
  // Chảo, nồi, dao
  { name: 'Chảo chống dính Sunhouse 28cm', cat: 'Chảo & Xào', brand: 'Sunhouse', price: 350000, compareAt: 450000, short: 'Đáy từ dùng cho mọi loại bếp.', variants: [{ attr: 'Đường kính', values: ['24cm', '28cm', '32cm'], priceDelta: [-50000, 0, 120000] }] },
  { name: 'Bộ nồi inox Sunhouse 5 chiếc', cat: 'Nồi & Lòng nồi', brand: 'Sunhouse', price: 1290000, compareAt: 1650000, short: 'Inox 304 sáng bóng, dùng cho bếp từ.' },
  { name: 'Nồi áp suất Sunhouse SHA666', cat: 'Nồi & Lòng nồi', brand: 'Sunhouse', price: 850000, short: '5 lớp an toàn, nấu hầm siêu nhanh.' },
  { name: 'Bộ dao nhà bếp Total THT79136', cat: 'Dao & Thớt', brand: 'Total', price: 550000, short: '6 món đầy đủ, thép không gỉ sắc bén.' },
  { name: 'Dao thái đa năng Lock&Lock', cat: 'Dao & Thớt', brand: 'Lock&Lock', price: 290000, short: 'Lưỡi dày, cán chống trượt.' },
  { name: 'Thớt gỗ tự nhiên 40cm', cat: 'Dao & Thớt', brand: 'Sunhouse', price: 180000, short: 'Gỗ ép nguyên khối, an toàn thực phẩm.' },
  { name: 'Bộ dụng cụ làm bánh Lock&Lock', cat: 'Dụng cụ làm bánh', brand: 'Lock&Lock', price: 620000, compareAt: 780000, short: 'Full khuôn, đánh trứng, cạo bột.' },
  { name: 'Bộ hộp thủy tinh Lock&Lock 5 hộp', cat: 'Hộp bảo quản thực phẩm', brand: 'Lock&Lock', price: 750000, compareAt: 920000, short: 'Thủy tinh chịu nhiệt, dùng được lò vi sóng.' },
  { name: 'Hộp nhựa Lock&Lock set 4 (1.2L)', cat: 'Hộp bảo quản thực phẩm', brand: 'Lock&Lock', price: 420000, short: 'Khóa 4 cạnh kín hơi.' },
  { name: 'Bình pha cà phê drip Kettle Inox', cat: 'Dụng cụ pha chế', brand: 'Sunhouse', price: 320000, short: 'Mỏ vịt chuẩn barista, inox 304.' },
  { name: 'Máy pha cà phê Electrolux ECF7022', cat: 'Dụng cụ pha chế', brand: 'Electrolux', price: 2890000, compareAt: 3400000, short: 'Áp suất 20 bar, chiết xuất espresso đậm vị.' },
  // Bàn ủi, sấy tóc, lò
  { name: 'Bàn ủi hơi nước Philips GC1740', cat: 'Bàn ủi & Máy sấy tóc', brand: 'Philips', price: 650000, compareAt: 800000, short: 'Đế ceramic trượt êm, phun hơi mạnh mẽ.' },
  { name: 'Bàn ủi khô Sunhouse SHI8001', cat: 'Bàn ủi & Máy sấy tóc', brand: 'Sunhouse', price: 250000, short: 'Nhẹ, bền, giá tốt cho sinh viên.' },
  { name: 'Máy sấy tóc Philips BHC010', cat: 'Bàn ủi & Máy sấy tóc', brand: 'Philips', price: 480000, short: 'Công nghệ bảo vệ nhiệt, gấp gọn.' },
  { name: 'Máy sấy tóc Panasonic EH-ND57', cat: 'Bàn ủi & Máy sấy tóc', brand: 'Panasonic', price: 550000, short: 'Ion âm giảm rối tóc.' },
  { name: 'Lò vi sóng Sharp R-25AS 20L', cat: 'Lò vi sóng & Nướng', brand: 'Sharp', price: 2190000, compareAt: 2600000, short: 'Nấu rã đông tự động, dễ vệ sinh.' },
  { name: 'Lò nướng Electrolux EOT3805MC', cat: 'Lò vi sóng & Nướng', brand: 'Electrolux', price: 1990000, short: '38L, đối lưu nhiệt đều.' },
  // Sửa chữa
  { name: 'Bộ dụng cụ sửa chữa nhà Total 108 món', cat: 'Bộ dụng cụ cơ khí', brand: 'Total', price: 890000, compareAt: 1100000, short: 'Đầy đủ tuýp, lục giác, kìm, búa trong vali.', tags: ['bo do cu'], attrs: [['Số món', '108'], ['Chất liệu', 'CRV']] },
  { name: 'Bộ tua vít Total 32 món', cat: 'Bộ dụng cụ cơ khí', brand: 'Total', price: 280000, short: 'Đầu nam châm, tay cầm chống trượt.' },
  { name: 'Máy khoan pin Total TDLI201201', cat: 'Máy khoan & Mũi khoan', brand: 'Total', price: 1250000, compareAt: 1500000, short: 'Pin 20V, 2 tầng tốc độ, kèm 2 pin.' },
  { name: 'Máy khoan bê tông Total TB2060', cat: 'Máy khoan & Mũi khoan', brand: 'Total', price: 990000, short: 'Công suất 600W, khoan bê tông 13mm.' },
  { name: 'Set mũi khoan Total 15 chiếc', cat: 'Máy khoan & Mũi khoan', brand: 'Total', price: 190000, short: 'Khoan gỗ, kim loại, bê tông.' },
  { name: 'Bộ cờ lê miệng Total 12 chiếc', cat: 'Thước đo & Cờ lê', brand: 'Total', price: 320000, short: 'Inox chrome vanadium chắc chắn.' },
  { name: 'Thước cuộn 5m Total', cat: 'Thước đo & Cờ lê', brand: 'Total', price: 60000, short: 'Khóa thước chắc chắn, vạch rõ nét.' },
  { name: 'Máy mài góc Total TG105100', cat: 'Bộ dụng cụ cơ khí', brand: 'Total', price: 720000, short: 'Công suất 850W, dùng đĩa 100mm.' },
  // Vệ sinh
  { name: 'Bộ chổi lau nhà xoay 360 Lock&Lock', cat: 'Chổi & Lau nhà', brand: 'Lock&Lock', price: 350000, compareAt: 430000, short: 'Kèm xô vắt xoay tay, đầu lau thay thế.' },
  { name: 'Lau nhà phun nước Sunhouse', cat: 'Chổi & Lau nhà', brand: 'Sunhouse', price: 290000, short: 'Phun nước tiện lợi, không cần xô.' },
  { name: 'Chổi quét 2 lớp kèm hót rác', cat: 'Chổi & Lau nhà', brand: 'Sunhouse', price: 120000, short: 'Lông mềm bắt bụi tốt.' },
  { name: 'Thùng rác có bàn đạp 20L Lock&Lock', cat: 'Thùng rác & Túi rác', brand: 'Lock&Lock', price: 480000, short: 'Đóng mở êm, giữ mùi bên trong.' },
  { name: 'Túi rác cuộn lớn 50 túi', cat: 'Thùng rác & Túi rác', brand: 'Lock&Lock', price: 85000, short: 'Túi dày chịu lực, kín mùi.' },
  // Nội thất nhỏ
  { name: 'Kệ để đồ 4 tầng chống rỉ', cat: 'Kệ để đồ', brand: 'Sunhouse', price: 550000, compareAt: 700000, short: 'Chịu tải 30kg/tầng, lắp đặt dễ dàng.', variants: [{ attr: 'Số tầng', values: ['3 tầng', '4 tầng', '5 tầng'], priceDelta: [-130000, 0, 160000] }] },
  { name: 'Kệ gia vị 3 tầng inox', cat: 'Kệ để đồ', brand: 'Sunhouse', price: 230000, short: 'Tiết kiệm không gian bếp.' },
  { name: 'Giá treo quần áo inox 1m2', cat: 'Giá treo & Móc treo', brand: 'Sunhouse', price: 320000, short: 'Di động, xếp gọn khi không dùng.' },
  { name: 'Bộ móc treo đa năng 10 cái', cat: 'Giá treo & Móc treo', brand: 'Lock&Lock', price: 95000, short: 'Móc dán chịu lực 5kg.' },
  // Nhà thông minh
  { name: 'Đèn thông minh Xiaomi Bulb W3 (E27)', cat: 'Đèn thông minh', brand: 'Xiaomi', price: 290000, compareAt: 360000, short: '16 triệu màu, điều khiển Mi Home/Google/Alexa.', variants: [{ attr: 'Màu ánh sáng', values: ['Trắng', 'RGB 16 màu'], priceDelta: [0, 80000] }], tags: ['den thong minh'] },
  { name: 'Đèn led dán thông minh Yeelight', cat: 'Đèn thông minh', brand: 'Xiaomi', price: 450000, short: 'Dải LED sync nhạc, dán màn hình TV.' },
  { name: 'Ổ cắm wifi thông minh Xiaomi 16A', cat: 'Ổ cắm & Công tắc thông minh', brand: 'Xiaomi', price: 320000, compareAt: 400000, short: 'Hẹn giờ từ xa, đo điện năng tiêu thụ.', tags: ['o cam thong minh'] },
  { name: 'Công tắc cảm ứng thông minh 2 gang', cat: 'Ổ cắm & Công tắc thông minh', brand: 'Xiaomi', price: 560000, short: 'Chạm cảm ứng, điều khiển app, hẹn giờ.' },
  { name: 'Camera ip ngoài trời Xiaomi CW300', cat: 'Camera & Chuông cửa', brand: 'Xiaomi', price: 1290000, compareAt: 1550000, short: '2.5K, quay quét 360°, phát hiện người AI.' },
  { name: 'Camera trong nhà Xiaomi Aqara G2H', cat: 'Camera & Chuông cửa', brand: 'Xiaomi', price: 1490000, short: 'Hub trung tâm nhà thông minh tích hợp camera.' },
  { name: 'Chuông cửa có hình Xiaomi D200', cat: 'Camera & Chuông cửa', brand: 'Xiaomi', price: 1790000, short: 'Pin 5 tháng, xem qua điện thoại, lưu cloud.' },
  // Tiện ích khác
  { name: 'Bình thủy điện Sunhouse SHD9616', cat: 'Điện gia dụng', brand: 'Sunhouse', price: 620000, compareAt: 750000, short: '5 lớp giữ nhiệt, đun sôi siêu tốc 1.8L.' },
  { name: 'Ấm siêu tốc Panasonic NC-GK1', cat: 'Điện gia dụng', brand: 'Panasonic', price: 590000, short: 'An toàn tự ngắt khi sôi.' },
  { name: 'Máy xay cà phê Philips HD7431', cat: 'Dụng cụ pha chế', brand: 'Philips', price: 480000, short: 'Xay hạt cà phê, ngũ cốc nhanh chóng.' },
  { name: 'Thùng giữ nhiệt Lock&Lock 28L', cat: 'Tiện ích', brand: 'Lock&Lock', price: 890000, short: 'Giữ lạnh 48 giờ, du lịch picnic.' },
  { name: 'Bình giữ nhiệt Lock&Lock 500ml', cat: 'Tiện ích', brand: 'Lock&Lock', price: 390000, compareAt: 480000, short: 'Inox 304, giữ nóng 6 tiếng.', variants: [{ attr: 'Dung tích', values: ['350ml', '500ml', '750ml'], priceDelta: [-80000, 0, 110000] }] },
  { name: 'Dây phơi đồ thông minh 3 thanh', cat: 'Tiện ích', brand: 'Sunhouse', price: 260000, short: 'Chống trượt, chịu tải 25kg.' },
  { name: 'Thảm chùi chân nhà bếp', cat: 'Vệ sinh nhà cửa', brand: 'Sunhouse', price: 140000, short: 'Sợi PVC chống trượt, dễ giặt.' },
  { name: 'Găng tay silicone chịu nhiệt', cat: 'Nhà bếp', brand: 'Sunhouse', price: 85000, short: 'Chịu nhiệt 230°C, dùng lò nướng.' },
  { name: 'Cân nhà bếp điện tử 10kg', cat: 'Nhà bếp', brand: 'Xiaomi', price: 210000, compareAt: 270000, short: 'Độ chính xác 1g, màn hình LED.' },
  { name: 'Đồng hồ hẹn giờ bếp cơ khí', cat: 'Nhà bếp', brand: 'Sunhouse', price: 65000, short: 'Chuông to, lên tối đa 60 phút.' },
  { name: 'Bộ 3 thùng chứa gạo ngăn ẩm', cat: 'Hộp bảo quản thực phẩm', brand: 'Lock&Lock', price: 520000, short: 'Có bánh xe, nắp lật tiện lấy gạo.' },
  { name: 'Vòi rửa chén sen tay gạt', cat: 'Nhà bếp', brand: 'Sunhouse', price: 380000, short: 'Inox sáng, tiết kiệm nước.' },
  { name: 'Máy rửa chén mini Electrolux', cat: 'Điện gia dụng', brand: 'Electrolux', price: 8490000, compareAt: 9990000, short: '6 bộ chén, 6 chương trình rửa.' },
  { name: 'Nồi chiên không dầu Sunhouse 5L', cat: 'Điện gia dụng', brand: 'Sunhouse', price: 1990000, compareAt: 2450000, short: 'Chiên ngon ít dầu, 8 menu cài sẵn.', variants: [{ attr: 'Dung tích', values: ['4L', '5L', '6.5L'], priceDelta: [-350000, 0, 500000] }] },
  { name: 'Máy làm sữa hạt Kangaroo KG55S', cat: 'Điện gia dụng', brand: 'Kangaroo', price: 1450000, short: 'Nấu sữa hạt tự động, không cần lọc.' },
  { name: 'Đèn bàn học chống cận Philips', cat: 'Nhà thông minh', brand: 'Philips', price: 690000, short: 'Ánh sáng tự nhiên, 3 chế độ học tập.' },
  { name: 'Máy khử khuẩn đồ dùng Kangaroo', cat: 'Điện gia dụng', brand: 'Kangaroo', price: 1250000, short: 'Diệt khuẩn UV, sấy khô tiệt trùng.' },
];

async function main() {
  // Seed ships well-known demo credentials. In production they are a
  // free admin account — refuse unless SEED_PASSWORD/SEED_ADMIN_PASSWORD
  // provide real ones.
  if (process.env.NODE_ENV === 'production') {
    const pw = process.env.SEED_PASSWORD ?? '';
    const adminPw = process.env.SEED_ADMIN_PASSWORD ?? '';
    if (!pw || !adminPw) {
      throw new Error(
        'Refusing to seed in production without SEED_PASSWORD and SEED_ADMIN_PASSWORD (default credentials are public)',
      );
    }
  }
  console.log('🌱 Seeding HomeMart...');
  const passwordHash = await bcrypt.hash(process.env.SEED_PASSWORD ?? 'Customer@123', 12);
  const adminHash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123', 12);

  // ── Users ──
  const admin = await prisma.user.upsert({
    where: { email: 'admin@homemart.vn' },
    update: {},
    create: { email: 'admin@homemart.vn', passwordHash: adminHash, fullName: 'HomeMart Admin', role: 'ADMIN', emailVerifiedAt: new Date() },
  });
  await prisma.user.upsert({ where: { email: 'manager@homemart.vn' }, update: {}, create: { email: 'manager@homemart.vn', passwordHash: adminHash, fullName: 'Store Manager', role: 'MANAGER', emailVerifiedAt: new Date() } });
  await prisma.user.upsert({ where: { email: 'staff@homemart.vn' }, update: {}, create: { email: 'staff@homemart.vn', passwordHash: adminHash, fullName: 'Warehouse Staff', role: 'STAFF', emailVerifiedAt: new Date() } });
  const customer = await prisma.user.upsert({
    where: { email: 'customer@homemart.vn' },
    update: {},
    create: { email: 'customer@homemart.vn', passwordHash, fullName: 'Nguyễn Văn An', role: 'CUSTOMER', phone: '0901234567', emailVerifiedAt: new Date() },
  });
  await prisma.address.createMany({
    data: [
      { userId: customer.id, fullName: 'Nguyễn Văn An', phone: '0901234567', province: 'Hà Nội', district: 'Cầu Giấy', ward: 'Dịch Vọng', line: 'Số 12, ngõ 5 Xuân Thuỷ', isDefault: true },
      { userId: customer.id, fullName: 'Nguyễn Văn An', phone: '0901234567', province: 'TP. Hồ Chí Minh', district: 'Quận 1', ward: 'Bến Nghé', line: '45 Nguyễn Huệ', isDefault: false },
    ],
    skipDuplicates: true,
  });
  console.log('✓ Users');

  // ── Categories ──
  const catMap = new Map<string, string>();
  let order = 0;
  for (const group of CATEGORY_TREE) {
    const parent = await prisma.category.create({
      data: { name: group.name, slug: slugify(group.name), sortOrder: order++ },
    });
    catMap.set(group.name, parent.id);
    for (const child of group.children ?? []) {
      const c = await prisma.category.create({
        data: { name: child, slug: slugify(child), parentId: parent.id, sortOrder: order++ },
      });
      catMap.set(child, c.id);
    }
  }
  // Extra top-level categories referenced by products but not in tree
  for (const extra of ['Nhà bếp', 'Tiện ích']) {
    if (!catMap.has(extra)) {
      const c = await prisma.category.create({ data: { name: extra, slug: slugify(extra) } });
      catMap.set(extra, c.id);
    }
  }
  console.log(`✓ ${catMap.size} categories`);

  // ── Brands ──
  const brandMap = new Map<string, string>();
  for (const b of BRANDS) {
    const brand = await prisma.brand.create({ data: { name: b, slug: slugify(b) } });
    brandMap.set(b, brand.id);
  }
  console.log(`✓ ${BRANDS.length} brands`);

  // ── Products ──
  const now = Date.now();
  let i = 0;
  for (const p of PRODUCTS) {
    i++;
    const categoryId = catMap.get(p.cat) ?? [...catMap.entries()][0][1];
    const sku = `HM-${String(i).padStart(4, '0')}`;
    const product = await prisma.product.create({
      data: {
        sku,
        slug: `${slugify(p.name)}-${sku.toLowerCase()}`,
        name: p.name,
        shortDescription: p.short,
        description: `${p.short}\n\nSản phẩm chính hãng ${p.brand}, bảo hành theo quy định của nhà sản xuất. Đổi trả trong 7 ngày nếu có lỗi từ nhà sản xuất.\n\nHomeMart cam kết:\n- Hàng chính hãng 100%\n- Giao hàng toàn quốc\n- Thanh toán linh hoạt`,
        categoryId,
        brandId: brandMap.get(p.brand),
        price: p.price,
        compareAtPrice: p.compareAt,
        costPrice: Math.round(p.price * 0.75),
        status: ProductStatus.PUBLISHED,
        weightGrams: 500 + (i % 10) * 300,
        warrantyMonths: p.brand === 'Total' ? 6 : 12,
        origin: p.brand === 'Xiaomi' ? 'Trung Quốc' : 'Việt Nam',
        tags: p.tags ?? [],
        seoTitle: `${p.name} | HomeMart`,
        seoDescription: p.short.slice(0, 150),
        soldCount: (i * 37) % 500,
        ratingAvg: 0,
        images: {
          create: [
            { url: `/placeholder/products/${slugify(p.name)}.jpg`, alt: p.name, isPrimary: true },
          ],
        },
        attributes: p.attrs?.length ? { create: p.attrs.map(([name, value], idx) => ({ name, value, sortOrder: idx })) } : undefined,
      },
    });

    if (p.variants?.length) {
      for (const v of p.variants) {
        for (let vi = 0; vi < v.values.length; vi++) {
          const variantSku = `${sku}-${slugify(v.values[vi])}`;
          const variant = await prisma.productVariant.create({
            data: {
              productId: product.id,
              sku: variantSku,
              attributes: { [v.attr]: v.values[vi] },
              price: p.price + v.priceDelta[vi],
              compareAtPrice: p.compareAt ? p.compareAt + v.priceDelta[vi] : null,
              status: ProductStatus.PUBLISHED,
            },
          });
          await prisma.inventory.create({
            data: { productId: product.id, variantId: variant.id, availableStock: 20 + ((vi * 13 + i) % 40), reservedStock: 0 },
          });
        }
      }
    } else {
      await prisma.inventory.create({
        data: { productId: product.id, availableStock: 15 + ((i * 17) % 85), reservedStock: 0 },
      });
    }

    // Some low-stock items for dashboard demo
    if (i % 23 === 0) {
      await prisma.inventory.updateMany({ where: { productId: product.id }, data: { availableStock: 3 } });
    }
  }


// ── Extra products (auto-generated variations, reaching 100+) ──
const EXTRA: P[] = [];
const extraTemplates: [string, string, string[], number][] = [
  ['Nồi cơm điện', 'Nồi cơm điện {B} cao cấp dòng {V}', ['Sharp', 'Toshiba', 'Panasonic', 'Sunhouse'], 950000],
  ['Máy xay & Máy ép', 'Máy xay đa năng {B} series {V}', ['Philips', 'Panasonic', 'Kangaroo'], 720000],
  ['Quạt điện', 'Quạt đứng {B} model {V}', ['Sharp', 'Sunhouse', 'Panasonic', 'Kangaroo'], 880000],
  ['Chảo & Xào', 'Chảo chống dính {B} size {V}', ['Sunhouse', 'Lock&Lock'], 280000],
  ['Dao & Thớt', 'Bộ dao bếp {B} bộ {V} món', ['Total', 'Sunhouse'], 320000],
  ['Hộp bảo quản thực phẩm', 'Hộp đựng thực phẩm {B} {V}L', ['Lock&Lock', 'Sunhouse'], 150000],
  ['Dụng cụ cơ khí', 'Bộ dụng cụ cơ khí {B} combo {V}', ['Total'], 450000],
  ['Máy hút bụi', 'Máy hút bụi gia dụng {B} {V}', ['Electrolux', 'Kangaroo', 'Xiaomi'], 1350000],
  ['Đèn thông minh', 'Đèn thông minh {B} loại {V}', ['Xiaomi', 'Philips'], 250000],
  ['Ổ cắm & Công tắc thông minh', 'Ổ cắm thông minh {B} bản {V}', ['Xiaomi'], 290000],
];
let extIdx = 0;
for (const [cat, nameTpl, brandList, base] of extraTemplates) {
  for (let v = 1; v <= 3; v++) {
    extIdx++;
    const brand = brandList[v % brandList.length];
    EXTRA.push({
      name: nameTpl.replace('{B}', brand).replace('{V}', String(v)),
      cat,
      brand,
      price: base + v * 60000,
      compareAt: base + v * 60000 + Math.round(base * 0.18),
      short: `Sản phẩm ${cat.toLowerCase()} chính hãng ${brand}, chất lượng ổn định, giá hợp lý cho gia đình Việt.`,
      tags: [],
      attrs: [['Thương hiệu', brand], ['Bảo hành', '12 tháng']],
    });
  }
}
for (const p of EXTRA) {
  i++;
  const categoryId2 = catMap.get(p.cat) ?? [...catMap.entries()][0][1];
  const sku2 = `HM-${String(i).padStart(4, '0')}`;
  const prod2 = await prisma.product.create({
    data: {
      sku: sku2,
      slug: `${slugify(p.name)}-${sku2.toLowerCase()}`,
      name: p.name,
      shortDescription: p.short,
      description: p.short + '\n\nHàng chính hãng HomeMart phân phối. Bảo hành 12 tháng.',
      categoryId: categoryId2,
      brandId: brandMap.get(p.brand),
      price: p.price,
      compareAtPrice: p.compareAt,
      costPrice: Math.round(p.price * 0.75),
      status: ProductStatus.PUBLISHED,
      weightGrams: 400 + (i % 12) * 250,
      warrantyMonths: 12,
      origin: 'Việt Nam',
      tags: p.tags ?? [],
      soldCount: (i * 53) % 350,
      images: { create: [{ url: `/placeholder/products/${slugify(p.name)}.jpg`, alt: p.name, isPrimary: true }] },
      attributes: p.attrs?.length ? { create: p.attrs.map(([name, value], idx) => ({ name, value, sortOrder: idx })) } : undefined,
    },
  });
  await prisma.inventory.create({
    data: { productId: prod2.id, availableStock: 10 + ((i * 11) % 60) },
  });
}

  // Seed a few approved reviews to make ratings look alive
  const firstProducts = await prisma.product.findMany({ take: 12, orderBy: { createdAt: 'asc' } });
  const comments = [
    'Sản phẩm tốt, đóng gói kỹ, giao nhanh.', 'Đúng như mô tả, sẽ ủng hộ shop tiếp.',
    'Chất lượng ổn với mức giá này.', 'Hàng chính hãng, dùng rất hài lòng.',
  ];
  let reviewIdx = 0;
  for (const prod of firstProducts) {
    reviewIdx++;
    const fakeOrder = await prisma.order.create({
      data: {
        orderNumber: `HM-SEED-${String(reviewIdx).padStart(6, '0')}`,
        userId: customer.id,
        status: 'COMPLETED',
        contactName: 'Nguyễn Văn An',
        contactPhone: '0901234567',
        shippingProvince: 'Hà Nội', shippingDistrict: 'Cầu Giấy', shippingWard: 'Dịch Vọng',
        shippingLine: 'Số 12 ngõ 5 Xuân Thuỷ',
        subtotalAmount: prod.price, totalAmount: prod.price,
        completedAt: new Date(),
        items: {
          create: [{
            productId: prod.id, productName: prod.name, sku: prod.sku,
            unitPrice: prod.price, quantity: 1, lineTotal: prod.price,
          }],
        },
        statusHistory: {
          create: [{ fromStatus: null, toStatus: 'PENDING' }, { fromStatus: 'PENDING', toStatus: 'CONFIRMED' }, { fromStatus: 'CONFIRMED', toStatus: 'COMPLETED' }],
        },
      },
      include: { items: true },
    });
    await prisma.review.create({
      data: {
        userId: customer.id, productId: prod.id, orderItemId: fakeOrder.items[0].id,
        rating: 4 + (reviewIdx % 2), comment: comments[reviewIdx % comments.length], status: 'APPROVED',
      },
    });
    await prisma.$transaction(async (tx) => {
      const agg = await tx.review.aggregate({ where: { productId: prod.id, status: 'APPROVED' }, _avg: { rating: true }, _count: true });
      await tx.product.update({ where: { id: prod.id }, data: { ratingAvg: agg._avg.rating ?? 0, reviewCount: agg._count } });
    });
  }

  // ── Shipping methods ──
  await prisma.shippingMethod.createMany({
    data: [
      { code: 'STANDARD', name: 'Giao hàng tiêu chuẩn (2-4 ngày)', baseFee: 20000, feePerKg: 5000, freeShippingMinSubtotal: 500000, estimatedDaysMin: 2, estimatedDaysMax: 4 },
      { code: 'EXPRESS', name: 'Giao hàng nhanh (1-2 ngày)', baseFee: 35000, feePerKg: 8000, estimatedDaysMin: 1, estimatedDaysMax: 2 },
      { code: 'SAME_DAY', name: 'Giao trong ngày (nội thành)', baseFee: 60000, feePerKg: 12000, estimatedDaysMin: 0, estimatedDaysMax: 1 },
    ],
    skipDuplicates: true,
  });
  console.log('✓ Shipping methods');

  // ── Vouchers ──
  const day = 86400e3;
  await prisma.voucher.createMany({
    data: [
      { code: 'WELCOME10', type: 'PERCENTAGE' as const, value: 10, maxDiscountAmount: 100000, minOrderAmount: 200000, usageLimit: 1000, usageLimitPerUser: 1, startsAt: new Date(now - day), endsAt: new Date(now + 90 * day) },
      { code: 'FREESHIP', type: 'FREE_SHIPPING' as const, value: 0, minOrderAmount: 300000, usageLimit: 500, usageLimitPerUser: 3, startsAt: new Date(now - day), endsAt: new Date(now + 60 * day) },
      { code: 'GIAM50K', type: 'FIXED_AMOUNT' as const, value: 50000, maxDiscountAmount: 50000, minOrderAmount: 400000, usageLimit: 200, usageLimitPerUser: 2, startsAt: new Date(now - day), endsAt: new Date(now + 30 * day) },
      { code: 'SALE20', type: 'PERCENTAGE' as const, value: 20, maxDiscountAmount: 300000, minOrderAmount: 1000000, usageLimit: 100, usageLimitPerUser: 1, startsAt: new Date(now - day), endsAt: new Date(now + 14 * day) },
    ],
    skipDuplicates: true,
  });
  console.log('✓ Vouchers');

  const counts = {
    categories: await prisma.category.count(),
    brands: await prisma.brand.count(),
    products: await prisma.product.count(),
    variants: await prisma.productVariant.count(),
    reviews: await prisma.review.count(),
  };
  console.log('🎉 Seeding complete:', counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
