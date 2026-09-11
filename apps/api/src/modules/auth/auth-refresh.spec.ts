/**
 * Auth refresh-token rotation (P1 #6 gap) — integration test với DB thật.
 *
 * Bao phủ vòng đời refresh token:
 *  - register → refresh hợp lệ → nhận cặp token mới, token cũ bị revoke
 *  - dùng lại token cũ TRONG grace window (≤30s) → 401 nhưng chain còn sống
 *  - dùng lại token cũ NGOÀI grace window → revoke TOÀN BỘ chain (theft detection)
 *  - access token / chuỗi rác làm refresh → 401
 */
process.env.NODE_ENV ||= 'test';
process.env.DATABASE_URL ||= 'postgresql://homemart:homemart_secret@localhost:54329/homemart?schema=public';
process.env.JWT_ACCESS_SECRET ||= 'x'.repeat(32);
process.env.JWT_REFRESH_SECRET ||= 'y'.repeat(32);

import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createHash } from 'crypto';
import { PrismaClient } from 'src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { AuthService } from 'src/modules/auth/auth.service';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');
const PASSWORD = 'Passw0rd!Secure';

jest.setTimeout(30000);

/** Đăng ký user mới qua AuthService.register (hash bcrypt thật, trả cặp token). */
async function registerFresh(label: string) {
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.local`;
  const result = await authService.register({ email, password: PASSWORD, fullName: 'Refresh Test' });
  return { email, ...result } as { email: string; accessToken: string; refreshToken: string };
}

/** Xóa user + tokens của mình. */
async function cleanupUser(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
}

let authService: AuthService;

describe('AuthService.refresh — rotation + reuse detection (auth)', () => {
  const emails: string[] = [];

  beforeAll(() => {
    authService = new AuthService(prisma as never, new JwtService(), new EventEmitter2());
  });

  afterAll(async () => {
    for (const email of emails) await cleanupUser(email);
    await prisma.$disconnect();
  });

  it('register → refresh → token cũ bị revoke (rotation)', async () => {
    const reg = await registerFresh('rot');
    emails.push(reg.email);

    // Refresh hợp lệ → cặp token mới khác cũ
    const second = await authService.refresh(reg.refreshToken);
    expect(second.accessToken).toBeTruthy();
    expect(second.refreshToken).toBeTruthy();
    expect(second.refreshToken).not.toBe(reg.refreshToken);

    // Token cũ đã revoked trong DB
    const old = await prisma.refreshToken.findUnique({ where: { tokenHash: sha256(reg.refreshToken) } });
    expect(old?.revokedAt).not.toBeNull();
  });

  it('dùng lại token cũ TRONG grace window (≤30s) → 401 nhưng chain CÒN SỐNG', async () => {
    const reg = await registerFresh('grace');
    emails.push(reg.email);

    const second = await authService.refresh(reg.refreshToken); // rotate → t1 revoked VỪA XONG (trong window)

    // Retry bằng t1 (mất response/double submit) → 401 nhưng KHÔNG giết chain
    await expect(authService.refresh(reg.refreshToken)).rejects.toThrow(UnauthorizedException);

    // t2 (token mới) vẫn refresh được bình thường — benign retry không bị phạt
    const third = await authService.refresh(second.refreshToken);
    expect(third.accessToken).toBeTruthy();
  });

  it('dùng lại token cũ NGOÀI grace window → revoke TOÀN BỘ chain', async () => {
    const reg = await registerFresh('theft');
    emails.push(reg.email);

    const second = await authService.refresh(reg.refreshToken); // rotate t1 → t2

    // Giả lập t1 bị revoke từ LÂU (ngoài 30s window) — kẻ trộm giữ token cũ giờ mới dùng
    await prisma.refreshToken.update({
      where: { tokenHash: sha256(reg.refreshToken) },
      data: { revokedAt: new Date(Date.now() - 60_000) },
    });

    // Reuse ngoài window → 401
    await expect(authService.refresh(reg.refreshToken)).rejects.toThrow(UnauthorizedException);

    // TOÀN BỘ chain (kể cả t2 chưa từng dùng) bị revoke
    const user = await prisma.user.findUniqueOrThrow({ where: { email: reg.email } });
    const tokens = await prisma.refreshToken.findMany({ where: { userId: user.id } });
    expect(tokens.length).toBeGreaterThanOrEqual(2);
    for (const t of tokens) expect(t.revokedAt).not.toBeNull();

    // Token hợp lệ nhất (t2) cũng chết — thief không tiếp tục được
    await expect(authService.refresh(second.refreshToken)).rejects.toThrow(UnauthorizedException);
  });

  it('access token / chuỗi rác làm refresh → 401 không tạo bản ghi', async () => {
    const reg = await registerFresh('badtype');
    emails.push(reg.email);

    // Access token có type='access' → từ chối
    await expect(authService.refresh(reg.accessToken)).rejects.toThrow(UnauthorizedException);

    // Chuỗi rác → verify fail → từ chối
    await expect(authService.refresh('garbage.token.here')).rejects.toThrow(UnauthorizedException);

    // Không có bản ghi token rác nào được tạo (không leak storage)
    const user = await prisma.user.findUniqueOrThrow({ where: { email: reg.email } });
    const tokens = await prisma.refreshToken.findMany({ where: { userId: user.id } });
    expect(tokens).toHaveLength(1); // chỉ token register ban đầu
  });
});
