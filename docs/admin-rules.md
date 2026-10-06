# Admin & Product Engineering Rules — HomeMart

> "Constitution" cho AI coding agent: mỗi quyết định UI xuất phát từ task,
> mỗi dữ liệu có meaning, mỗi action có business rule, mỗi rule quan trọng
> được backend enforce, mỗi mutation quan trọng có audit, mỗi operation đắt
> có scalability strategy.

Quy ước mức: **MUST** (bắt buộc) · **SHOULD** (nên) · **MAY** (tùy).
Mỗi rule có ví dụ GOOD/BAD + acceptance. Nguồn: Carbon DS, GOV.UK DS, NN/G, OWASP.

---

## UX — Nguyên tắc admin

- **UX-001 (MUST)** Admin = công cụ làm việc: ưu tiên nhanh → rõ → chính xác →
  ít lỗi. Không hero/gradient lớn/animation liên tục/glassmorphism nặng trong admin.
- **UX-002 (MUST)** Mật độ thông tin vừa phải: table row 40–48px mặc định.
  Không row 100px chỉ vì "đẹp".
- **UX-003 (MUST)** Mỗi màn hình trả lời 5 câu: đang ở đâu / nhìn gì / làm được
  gì / có vấn đề gì / làm nhanh hơn thế nào.
  - Acceptance: có breadcrumb + title + active nav + primary action + error/warning state.
- **UX-004 (SHOULD)** Progressive disclosure: form dài chia section/tab
  (Basic → Pricing → Media → Shipping → SEO → Advanced). Không form 1 cột 20 field.
- **UX-005 (MUST)** Mỗi screen 1 primary action. Button nói hành động + đối tượng
  (`Tạo voucher`, không `Submit`).
  - GOOD: `[+ Thêm sản phẩm]` primary, `[Export]` secondary.
- **UX-006 (SHOULD)** Action dùng liên tục (Edit/Approve/Ship) để visible,
  không giấu sau `⋮`. `⋮` chỉ cho Rename/Duplicate/Archive/View audit.
- **UX-007 (MUST)** Destructive (Delete/Disable/Revoke) tách khỏi Save/Approve,
  đặt trong Danger zone + confirm. Xem SEC-010.

## UX — Navigation & layout

- **UX-010 (MUST)** Layout 3 vùng: sidebar + topbar + content.
  Sidebar nhóm theo chức năng (Bán hàng / Quản trị), không list phẳng 12 mục.
- **UX-011 (MUST)** Biết mình đang ở đâu: breadcrumb `Catalog / Products`,
  active state rõ (không chỉ đổi màu nhẹ), `aria-current="page"`.
- **UX-012 (SHOULD)** Filter/search/sort/page giữ trong URL
  (`?status=…&page=3&sort=…`) để Back không mất context.
- **UX-013 (SHOULD)** Command palette ⌘K cho power users: mở trang + lệnh
  actionable (PENDING, chờ duyệt, low-stock).
- **UX-014 (SHOULD)** Phím `/` focus search chính, Esc đóng modal, Tab/Enter
  điều hướng hợp lý.

## DATA — Visualization & ranking

- **DATA-001 (MUST)** Chọn chart theo câu hỏi kinh doanh, không theo sở thích:
  time-series → line; so sánh category → bar; top-N → horizontal bar
  (label dài không xoay 90°); 2–4 phần của tổng → pie OK; nhiều nhóm → stacked bar.
- **DATA-002 (SHOULD)** Tránh pie/donut khi cần so sánh định lượng chính xác (NN/G).
- **DATA-003 (MUST)** Không 3D chart. Không bóp méo trục (baseline/scale gây hiểu nhầm).
- **DATA-004 (MUST)** Ranking có metric + sort theo metric đó, không sort alphabet.
  - BAD: `Top Products: 1. Apple 2. Samsung` (không metric).
  - GOOD: `Top Products by Units Sold: iPhone 17 Pro — 12,481`.
- **DATA-005 (MUST)** Default sort phản ánh công việc: orders PENDING/attention
  trước (hoặc created_at DESC); inventory stock ASC; reviews pending first;
  products recently-updated/sales DESC. Không mặc định A→Z.
- **DATA-006 (MUST)** Attention-first: vấn đề (payment failed, fraud, low-stock,
  refund) lên trước, không list theo ID tăng dần.
- **DATA-007 (MUST)** Dashboard = KPI → trend → actionable, không biển 6 chart.
- **DATA-008 (MUST)** Mỗi KPI có context: value + period + comparison
  (`₫2.4B · ↑12.4% vs Sep 2026 · target ₫2.2B`). Không số trần.
- **DATA-009 (MUST)** Mọi số liệu kèm time range (`Oct 1–6, 2026`).
- **DATA-010 (MUST)** Tiền đúng context: `₫1.23B` overview / `₫1,234,567,890` khi
  cần chính xác; phân biệt Revenue ≠ Profit ≠ GMV ≠ Net sales.
  Số tiền `tabular-nums`, canh phải trong table.
- **DATA-011 (SHOULD)** Phân biệt `+2pp` vs `+25% relative` cho conversion.
- **DATA-012 (SHOULD)** Top-N dashboard: Top 5/10 + `Xem tất cả →`; đào sâu → table.
- **DATA-013 (SHOULD)** Metric quan trọng có tooltip định nghĩa + nguồn
  (`Revenue ⓘ = paid orders, excl. cancelled/refunds`).
- **DATA-014 (MUST)** Dashboard ↔ detail page nhất quán (cùng metric definition,
  hoặc giải thích rõ nếu khác).
- **DATA-015 (MUST)** Metric chuẩn định nghĩa ở backend/domain layer, frontend
  không tự tính `revenue = price × qty` mỗi nơi một kiểu.

## DATA — Table

- **DATA-020 (MUST)** Table có: checkbox + bulk, search, filter, sort,
  pagination, export, row actions, status badge (text + màu, không màu-only).
- **DATA-021 (MUST)** Server-side filter/sort/pagination cho dataset lớn.
  Không tải 50k records về filter JS.
- **DATA-022 (SHOULD)** Filter composable + chips hiển thị filter đang bật
  (xóa từng cái / xóa hết).
- **DATA-023 (MUST)** Số canh phải, text canh trái, ngày format nhất quán —
  table scan nhanh.
- **DATA-024 (SHOULD)** ID là identifier, không phải primary info
  (`iPhone 17 Pro / #ORD-…`, không phóng to `#10002931`).
- **DATA-025 (SHOULD)** Không 15 cột mặc định; field ít dùng cho vào column visibility.
- **DATA-026 (MUST)** Bulk delete/preview: `Xóa 2,391 users?` liệt kê impact
  (accounts/sessions/…), `không thể hoàn tác`, nút `Xóa 2,391 users`.
- **DATA-027 (MUST)** Bulk result partial-aware: `Xong 94 · lỗi 6 (lý do từng dòng)
  · [Thử lại mục lỗi]`, không all-or-nothing giả.

## FE — Interaction & states

- **FE-001 (MUST)** Loading phân loại: initial → skeleton; thao tác nhỏ →
  `Saving…` trên nút; nền → `Exporting…`; dài → progress % + `[Xem jobs]`.
  Không app trắng 5s.
- **FE-002 (MUST)** Error nói: chuyện gì + làm gì tiếp (`[Thử lại]`) + request_id
  (`req_8f2a91`). Không `500 Internal Server Error` trần cho user.
- **FE-003 (MUST)** Empty phân biệt: chưa có data (`[+ Thêm]`) vs filter rỗng
  (`[Xóa bộ lọc]`).
- **FE-004 (SHOULD)** Toast cho kết quả nhanh; thông tin quan trọng (payment fail)
  phải nằm trong UI, không chỉ toast.
- **FE-005 (MUST)** Modal chỉ cho confirm/quick-edit/small-form/warning/preview.
  Form 15–20 field → page/drawer riêng. Modal có Esc + focus trap + trả focus.
- **FE-006 (SHOULD)** Drawer xem nhanh (click order → drawer, không mất context table).
- **FE-007 (MUST)** Validation gần field lỗi (`SKU đã tồn tại`), không toast chung.
- **FE-008 (SHOULD)** Không confirm fatigue: toggle/rename/save rõ → không hỏi;
  delete/refund/permission/bulk-delete/financial → confirm (mạnh nếu impact lớn).
- **FE-009 (SHOULD)** Optimistic chỉ cho thao tác nhanh + rollback được; không
  optimistic cho delete/payment/refund/permission.
- **FE-010 (MUST)** Destructive 2 lớp: inline confirm (undo được) → DialogLite
  (không undo được, nêu impact). Hết `window.confirm`.
- **FE-011 (MUST)** Undo > confirm khi rollback được (`Đã xóa. [Hoàn tác]`).
- **FE-012 (SHOULD)** Detail Back giữ context (search/filter/sort/page) qua URL params.
- **FE-013 (SHOULD)** Export đúng dataset đang xem, không hỏi lại warehouse/date/status.
- **FE-014 (MUST)** Form giá/inventory đủ context: currency, thuế gồm/chưa,
  compare-at, cost/margin; stock = available/reserved/incoming + threshold và
  công thức `Available = On-hand − Reserved` nếu đúng model.
- **FE-015 (MUST)** Upload: type/size/progress/preview/validation/cancel/retry.
- **FE-016 (SHOULD)** Ảnh sản phẩm: primary ★ + thứ tự kéo-thả + alt text.

## A11Y + Responsive

- **A11Y-001 (MUST)** Keyboard: Tab/Enter/Esc, focus visible, `aria-label`,
  semantic HTML, contrast, không màu-only, label + error link với field.
- **A11Y-002 (MUST)** Table usable ở tablet/mobile: collapse sidebar, card/list
  hoặc horizontal scroll có kiểm soát. Không ép 12 cột vào 375px.

## BE — Business rules & API

- **BE-001 (MUST)** State machine server-side: `NEXT_STATUS_OPTIONS` frontend chỉ
  là mirror; `transition()` validate `ORDER_TRANSITIONS` + optimistic lock
  (`version+1`), STAFF không chạm money (RETURNED/REFUNDED → MANAGER+).
- **BE-002 (MUST)** Không tin client: price/discount/permission/ownership tính +
  validate server-side.
- **BE-003 (MUST)** RBAC server-side mọi API (`Roles()` guard), deny-by-default,
  least privilege. Ẩn button ở UI không phải security.
- **BE-004 (MUST)** Admin list: WHERE + ORDER BY + LIMIT/OFFSET (hoặc cursor) ở DB.
  Không `GET everything` rồi filter frontend.
- **BE-005 (SHOULD)** Filter+search+sort compose được ở backend thành 1 query đúng.
- **BE-006 (MUST)** Atomic/concurrency: checkout reserve `SELECT … FOR UPDATE` +
  re-validate + aggregated update; không check-then-act; không oversell.
- **BE-007 (MUST)** Idempotency cho payment/refund/webhook (IdempotencyRecord):
  retry không tạo 2 payments.
- **BE-008 (MUST)** Export/report/bulk nặng → job queue + worker + storage +
  notification, không sync trong HTTP request.
- **BE-009 (MUST)** Rate limit theo cost: login/search/export/bulk/upload/reset
  đều giới hạn (RateLimitGuard + Redis INCR+EXPIRE).
- **BE-010 (MUST)** Audit log: WHO/WHAT/WHEN/WHERE/TARGET/BEFORE/AFTER/RESULT
  (AuditInterceptor, redact password/token, fail-quiet nhưng warn).
- **BE-011 (SHOULD)** Error response có cấu trúc: `{code, message, details,
  request_id}` để frontend map message thân thiện.
- **BE-012 (MUST)** Validation 3 tầng: frontend (UX) → API (security/correctness)
  → DB constraints (UNIQUE/NOT NULL/CHECK/FK/INDEX).
- **BE-013 (SHOULD)** Soft delete (`deleted_at/by`) cho entity cần restore/audit/
  compliance; không máy móc mọi bảng.
- **BE-014 (MUST)** Không N+1: eager/batch/DataLoader/projection cho admin table.
- **BE-015 (SHOULD)** Index theo query pattern admin dùng (`status`,
  `user_id+status+created_at`…): UX → API → query → index.
- **BE-016 (SHOULD)** Đo p50/p95/p99 cho API quan trọng, không chỉ average.
- **BE-017 (SHOULD)** Observability: logs/metrics/tracing/alerts/health; không log secret.
- **BE-018 (MUST)** Không secret vào frontend (`VITE_ADMIN_SECRET`); frontend chỉ
  public config.
- **BE-019 (SHOULD)** API contract explicit + backward-compatible (v1/… khi cần).

## Áp dụng trong repo này (đã làm)

- Dashboard: KPI + attentions (`buildAttentions`, test) + low-stock preview +
  recent/top-5 + voucher — đúng DATA-007/008/009/012.
- Reports: line (revenue) + bar (orders) + top-N table đúng DATA-001; kèm
  time-range + định nghĩa loại trừ CANCELLED (DATA-009/013).
- `dashboardStats.lowStockCount` = COUNT thật (trước là length của preview take 20);
  low-stock preview sort ASC stock (DATA-005/006).
- Bulk delete products: DialogLite nêu impact + count (DATA-026); bulk result toast.
- Mọi destructive confirm qua DialogLite (FE-010); hết `window.confirm`.
- Filter chips + giữ state trong URL (DATA-022, UX-012); `/` focus search, ⌘K palette.
- Backend có sẵn: ORDER_TRANSITIONS + optimistic lock (BE-001), Roles guard
  (BE-003), reserve FOR UPDATE (BE-006), IdempotencyRecord (BE-007),
  RateLimitGuard (BE-009), AuditInterceptor redact (BE-010).

## Chưa làm (cố ý để lại)

- Export async SSE onProgress (BE-008, học Twenty record-export): backend chưa
  có endpoint export nào — thêm cả API + UI khi cần, bê pattern
  `createRecordExportConnection` (GraphQL SSE, onProgress, cancel).
- Empty biết soft-delete (học Twenty isSoftDeleteFilterActive + trash restore):
  DB đã có deletedAt khắp nơi nhưng chưa có trash UI/filter — thêm khi cần.
- Error `{code, request_id}` chuẩn (BE-011): API đang message text; đổi khi version API.
- Undo toast sau delete (FE-011): delete hiện hard-confirm; thêm undo khi có soft-delete restore đồng bộ UI.
- Column visibility (DATA-025), drawer quick-view (FE-006), density toggle:
  thêm khi table > 8 cột hoặc user phàn nàn.
- AI admin guardrails: chưa có AI action nào.
