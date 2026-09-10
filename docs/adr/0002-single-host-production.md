# ADR 0002 — Single-host production (không HA, không zero-downtime)

**Ngày:** 2026-08-30 · **Trạng thái:** Accepted · **Liên quan:** `docs/deployment.md`, `docker/docker-compose.prod.yml`, `docs/launch-checklist.md#3.3`

## Bối cảnh
Stack prod (docker-compose.prod.yml) chạy toàn bộ api + web + postgres + redis + nginx trên **một máy chủ duy nhất**. Không có HA, không có zero-downtime deploy — `docker compose up -d` tái tạo container gây downtime gián đoạn trong lúc restart. Cần quyết định rõ ràng: đầu tư HA ngay, hay chấp nhận single-host và ghi rõ rủi ro + đường thoát.

## Quyết định
**Chấp nhận single-host cho launch v1** (scope đồ án tốt nghiệp, 1 VPS), với điều kiện: rủi ro + đường thoát được ghi rõ (ADR này), restore drill đạt (checklist 3.3), và kiến trúc giữ cam kết "thoát single-host không đổi code".

## Lý do
- Đồ án tốt nghiệp: 1 VPS đủ cho demo + đơn thật công suất thấp. Chi phí HA (≥3 máy, managed DB, LB) không tương xứng.
- Api stateless (JWT + Redis), web là static build → đã sẵn sàng scale ngang, chỉ chạm infra config.
- Giả vờ "production-grade HA" khi chỉ có 1 máy là lừa dối người vận hành — ghi thẳng giới hạn trung thực hơn.

## Hệ quả
- **Rủi ro biết trước:** (1) hardware chết = downtime toàn bộ — giảm bằng backup-job pg_dump hàng ngày + restore drill; (2) mỗi deploy downtime ~30-60s — deploy ngoài giờ thấp điểm; (3) postgres đầy đĩa/conn làm chết cả API — monitor `pg_isready`; (4) burst traffic không scale ngang được — nginx rate-limit là hàng rào đầu.
- **Đường thoát (không đổi code):** B1 tách DB sang managed/VPS riêng (đổi connection string); B2 `--scale api=2` + nginx upstream (đã trỏ `api` service name); B3 blue/green 2 VPS + health-check `GET /api/v1/health`; B4 managed postgres replica + api ≥2 AZ.
- Cam kết: các bước thoát chỉ chạm docker-compose/nginx/DNS, không chạm code — điều kiện để single-host hôm nay không tạo nợ chặn scale sau này.

## Tham chiếu
- `docs/deployment.md#backup--restore` — quy trình backup hiện tại
- `docker/backup-job.sh` — pg_dump hàng ngày
- `docs/go-no-go.md` — tiêu chí áp lực tải đã đo
