import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

export function slugify(input: string): string {
  const from = 'àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ';
  const to = 'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd';
  let s = input.toLowerCase();
  for (let i = 0; i < from.length; i++) s = s.replaceAll(from[i], to[i]);
  return s
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function generateOrderNumber(seq: number): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `HM-${ymd}-${String(seq % 1000000).padStart(6, '0')}`;
}

export function randomToken(length = 32): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  const bytes = randomBytes(length);
  for (let i = 0; i < length; i++) out += chars[bytes[i] % chars.length];
  return out;
}

/** Clamp a raw query-param page number to a safe integer >= 1. */
export function clampPage(value: unknown, fallback = 1): number {
  const n = Math.floor(Number(value ?? fallback));
  return Number.isFinite(n) && n >= 1 ? n : fallback;
}

/** Clamp a raw query-param limit to [1, max]. */
export function clampLimit(value: unknown, fallback: number, max = 100): number {
  const n = Math.floor(Number(value ?? fallback));
  return Number.isFinite(n) && n >= 1 ? Math.min(n, max) : fallback;
}

/**
 * Guest cart tokens are server-signed (id.hmac) so a client cannot forge or
 * present arbitrary strings — knowing another user's token no longer helps
 * unless it was issued by us, and the id alone is useless without the HMAC.
 */
const GUEST_ID_RE = /^[0-9a-f]{32}$/;

function guestSig(id: string): string {
  const secret = process.env.JWT_ACCESS_SECRET ?? '';
  return createHmac('sha256', secret).update(`guest:${id}`).digest('hex').slice(0, 32);
}

export function createGuestToken(): string {
  const id = randomBytes(16).toString('hex');
  return `${id}.${guestSig(id)}`;
}

export function isValidGuestToken(token: string): boolean {
  const dot = token.indexOf('.');
  if (dot !== 32 || !GUEST_ID_RE.test(token.slice(0, 32))) return false;
  const expected = Buffer.from(guestSig(token.slice(0, 32)));
  const received = Buffer.from(token.slice(33));
  return expected.length === received.length && timingSafeEqual(expected, received);
}
