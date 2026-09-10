# Agent module — WIP (Work In Progress)

> **Trạng thái: KHÔNG wire vào `AppModule`.** Đây là thư viện chuẩn bị cho
> shopping-agent (port từ [anthropics/commerce-agents](https://github.com/anthropics/commerce-agents),
> Apache-2.0) — feature chưa lên roadmap launch (xem `docs/launch-checklist.md`).
>
> Giữ lại trong repo (thay vì xóa) vì: fencing là security util đã hoàn thiện
> và được CI cover (lint + typecheck + test). Khi shopping-agent được bật
> (`AGENT_ENABLED`), `fencePayload` sẽ bọc mọi catalog text trước khi vào
> prompt model — chống prompt-injection từ product name/description do
> MANAGER/STAFF nhập (nguồn untrusted).

## Thành phần

| File | Vai trò |
|---|---|
| `fencing.ts` | Sanitize + fence untrusted text trước khi model đọc: strip invisible/bidi controls, forged turn boundaries, transcript/tool markup; fixpoint strip để không tái lắp fence markers |
| `types.ts` | Domain model cho agent (AgentProduct VND integer, AgentSessionState provenance — cart chỉ nhận id đã từng hiện cho model) |

## Bật feature (tương lai)

1. Đăng ký `AgentModule` vào `app.module.ts` khi có controller thật.
2. Mọi tool result chạm catalog text → `fencePayload(payload)`.
3. Cart-write guard: chỉ nhận productId trong `AgentSessionState.seenProducts`.

## Test

```bash
npm test -w apps/api -- --testPathPattern fencing
```
