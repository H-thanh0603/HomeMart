/**
 * env.ts production guards (P2) — refuse-to-boot khi cấu hình GHN giả.
 * Dùng process con vì getEnv() cache + NODE_ENV production cần process sạch.
 */
import { execFileSync } from 'child_process';

const BASE_ENV: Record<string, string> = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_ACCESS_SECRET: 'prod-access-secret-32-chars-minimum-aa',
  JWT_REFRESH_SECRET: 'prod-refresh-secret-32-chars-minimum-bb',
  POSTGRES_PASSWORD: 'prod-db-password-strong',
};

/** Chạy node snippet với env production, trả stdout/stderr. */
function runWithEnv(extra: Record<string, string>): { ok: boolean; output: string } {
  const script = `
const { getEnv } = require('./src/config/env');
try { getEnv(); console.log('BOOT_OK'); } catch (e) { console.log('BOOT_REFUSED'); console.log(e.message); }
`;
  try {
    const out = execFileSync('npx', ['ts-node', '-e', script], {
      cwd: __dirname + '/../..',
      env: { ...process.env, ...BASE_ENV, ...extra },
      timeout: 60_000,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { ok: true, output: out };
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string };
    return { ok: false, output: (err.stdout ?? '') + (err.stderr ?? '') };
  }
}

describe('env.ts — GHN prod guards (P2)', () => {
  it('GHN_TOKEN set + defaults giả → REFUSE to boot', () => {
    const r = runWithEnv({ GHN_TOKEN: 'real-token-from-merchant' });
    const text = r.output;
    expect(text).toContain('BOOT_REFUSED');
    expect(text).toContain('GHN_FROM_PHONE');
    expect(text).toContain('GHN_FROM_ADDRESS');
    expect(text).toContain('GHN_FROM_WARD');
    expect(text).toContain('GHN_WEBHOOK_TOKEN');
  });

  it('GHN cấu hình đầy đủ → BOOT_OK', () => {
    const r = runWithEnv({
      GHN_TOKEN: 'real-token-from-merchant',
      GHN_WEBHOOK_TOKEN: 'webhook-secret',
      GHN_FROM_PHONE: '0912345678',
      GHN_FROM_ADDRESS: 'Số 1 Ngõ 2 Phường XYZ',
      GHN_FROM_WARD: '20432',
      GHN_FROM_PROVINCE: '01',
      GHN_FROM_DISTRICT: '148',
    });
    expect(r.output).toContain('BOOT_OK');
  });

  it('không set GHN_TOKEN (dùng công thức nội bộ) → BOOT_OK — không ép GHN', () => {
    const r = runWithEnv({});
    expect(r.output).toContain('BOOT_OK');
  });
});
