# Design System

<!-- impeccable:design-schema 1 -->

## Visual World & Metaphor
HomeMart kiến tạo trải nghiệm *"Tổ ấm tiện nghi, trọn vẹn yêu thương"* — một không gian mua sắm trực tuyến tươi sáng, ấm áp, tinh tế và đáng tin cậy dành cho mọi gia đình Việt. Giao diện kết hợp giữa sự tươi mát, sạch sẽ của sắc xanh thảo mộc (**Emerald Mint**) và năng lượng ấm cúng, thân thiện, kích thích mua sắm tích cực (**Warm Amber / Tangerine**).

## Color System
- **Primary (Emerald Mint — Bản sắc tươi mới, sạch sẽ, an tâm)**:
  - `primary-50`: `#f0fdf4` (Nền wash nhẹ nhàng)
  - `primary-100`: `#dcfce7` (Tint chip & badge)
  - `primary-500`: `#10b981` (Sắc xanh tươi)
  - `primary-600`: `#059669` (Màu thương hiệu chính / Nút bấm chính)
  - `primary-700`: `#047857` (Hover & Điểm nhấn đậm)
  - `primary-800`: `#065f46`
  - `primary-900`: `#064e3b` (Chữ tương phản cao trên nền sáng)
- **Accent (Warm Amber / Tangerine — Năng lượng ấm cúng, Flash Sale & CTA)**:
  - `accent-50`: `#fff7ed`
  - `accent-100`: `#ffedd5`
  - `accent-500`: `#f97316` (Nút CTA mua ngay, ngọn lửa Flash sale, huy hiệu giảm giá)
  - `accent-600`: `#ea580c` (Giá tiền sản phẩm nổi bật)
  - `accent-700`: `#c2410c`
- **Neutrals & Surfaces (Mặt nền & Phân cấp thị giác)**:
  - Nền trang web: `#f8fafc` (Slate 50)
  - Thẻ card & Vùng chứa: `#ffffff`
  - Màu chữ: `#0f172a` (Slate 900 tiêu đề) / `#334155` (Slate 700 nội dung) / `#64748b` (Slate 500 chú thích)
  - Viền & Ngăn cách: `#f1f5f9` (Slate 100) / `#e2e8f0` (Slate 200)

## Typography & Hierarchy
- Font chữ sans-serif hiện đại, tối ưu hiển thị tiếng Việt với dấu sắc nét.
- Tiêu đề: Font-black (900) / Font-bold (700), tracking-tight, leading-tight.
- Nội dung: 14px – 16px, leading-relaxed, màu sắc êm dịu không gây mỏi mắt.
- Giá tiền & Số liệu: Sử dụng `tabular-nums` căn đều chữ số, định dạng tiền tệ Việt Nam `₫` chuẩn xác.

## Component Language
- **Cards & Containers**: Bo góc lớn `rounded-2xl` (16px) và `rounded-3xl` (24px), viền mỏng tinh tế `ring-1 ring-slate-100/90`, bóng đổ chân thực nhiều lớp (`shadow-card`, `shadow-card-hover`, `shadow-elevated`).
- **Buttons**: Bo góc mềm mại `rounded-xl`, dải màu chuyển sắc mượt mà (Emerald & Amber gradients), phản hồi vi mô khi bấm `active:scale-[0.98]`, hiệu ứng nổi khối hover.
- **Inputs & Forms**: Bo góc `rounded-xl`, hiệu ứng focus ring màu ngọc lục bảo mờ (`focus:ring-4 focus:ring-primary-500/15`), thông báo lỗi màu đỏ rõ ràng.
- **Badges & Tags**: Huy hiệu dạng viên thuốc `rounded-full` kèm chấm trạng thái (dot indicator), màu sắc phân loại ngữ nghĩa rõ ràng.

## Key Surfaces
- **Header & Navigation**: Thanh top-banner thông báo ưu đãi freeship, logo nhận diện thương hiệu tươi sáng, thanh tìm kiếm thông minh có nút xóa nhanh, giỏ hàng với huy hiệu động, menu điều hướng danh mục theo không gian sống.
- **Hero Section**: Banner chuyển màu xanh ngọc bích sang xanh lục sâu thẳm, hiệu ứng hoạ tiết gạch men, cam kết 3 tiêu chí (Freeship từ 299K, Đổi trả 7 ngày, 100% Chính hãng).
- **Flash Sale Strip**: Dải ưu đãi giá sốc với ngọn lửa chuyển động nhẹ, đồng hồ đếm ngược thời gian thực, thanh tiến độ hàng bán.
- **Product Card**: Thẻ sản phẩm với hình ảnh phóng to nhẹ khi hover, nút tim yêu thích chuyển động mượt, nhãn giảm giá nổi bật, số sao đánh giá và số lượng đã bán.
- **Catalog & Product Detail**: Bộ lọc đa tầng (danh mục cây, khoảng giá tùy chỉnh, thương hiệu, đánh giá), trang chi tiết sản phẩm với thư viện ảnh sắc nét, chọn biến thể trực quan, các tab mô tả, thông số và đánh giá xác thực.
- **Giỏ hàng & Thanh toán**: Luồng thanh toán 3 bước trực quan, bảng tóm tắt chi phí minh bạch, hỗ trợ đa dạng phương thức thanh toán an toàn.
