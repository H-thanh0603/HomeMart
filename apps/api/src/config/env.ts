import './env-loader';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().default(4000),
  WEB_URL: z.string().default('http://localhost:3000'),

  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().default(7),

  TAX_RATE: z.coerce.number().min(0).max(1).default(0.08),
  ORDER_PAYMENT_TIMEOUT_MINUTES: z.coerce.number().default(30),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('no-reply@homemart.local'),

  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_UPLOAD_MB: z.coerce.number().default(5),

  // S3 / Cloudflare R2
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional().default('auto'),
  S3_ENDPOINT: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_PUBLIC_URL: z.string().optional(),
  UPLOAD_BASE_URL: z.string().optional().default('/uploads'),

  VNPAY_TMN_CODE: z.string().optional().default('HOMEMART'),
  VNPAY_HASH_SECRET: z.string().optional().default('dev-vnpay-secret'),
  VNPAY_URL: z.string().default('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'),
  VNPAY_RETURN_URL: z.string().default('http://localhost:3000/payments/vnpay/return'),
  MOMO_PARTNER_CODE: z.string().optional().default('HOMEMART'),
  MOMO_ACCESS_KEY: z.string().optional().default('dev-momo-access'),
  MOMO_SECRET_KEY: z.string().optional().default('dev-momo-secret'),
  MOMO_API_URL: z.string().default('https://test-payment.momo.vn/v2/gateway/api/create'),
  MOMO_RETURN_URL: z.string().default('http://localhost:3000/payments/momo/return'),
  STRIPE_SECRET_KEY: z.string().optional().default(''),

  // Carrier (GHN / GHTK)
  GHN_TOKEN: z.string().optional(),
  GHN_SHOP_ID: z.string().optional(),
  GHN_API_URL: z.string().optional().default('https://dev-online.ghn.vn/shipping/v2'),
  GHN_WEBHOOK_TOKEN: z.string().optional(),
  GHN_FROM_NAME: z.string().optional().default('HomeMart'),
  GHN_FROM_PHONE: z.string().optional().default('0123456789'),
  GHN_FROM_ADDRESS: z.string().optional().default('123 ABC, Phường 1, Quận 1'),
  GHN_FROM_PROVINCE: z.string().optional().default('79'),
  GHN_FROM_DISTRICT: z.string().optional().default('1461'),
  GHN_FROM_WARD: z.string().optional().default(''),
});

export type Env = z.infer<typeof envSchema>;

// Values that must never survive into a production deployment.
const PROD_FORBIDDEN_DEFAULTS: Array<[keyof Env & string, string]> = [
  ['JWT_ACCESS_SECRET', 'change-me-access-secret-please-32-chars-min'],
  ['JWT_REFRESH_SECRET', 'change-me-refresh-secret-please-32-chars-min'],
  ['VNPAY_HASH_SECRET', 'dev-vnpay-secret'],
  ['MOMO_ACCESS_KEY', 'dev-momo-access'],
  ['MOMO_SECRET_KEY', 'dev-momo-secret'],
];

let cached: Env | null = null;

export function getEnv(): Env {
  if (!cached) {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(
        `Invalid environment variables:\n${parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')}`,
      );
    }
    const env = parsed.data;

    if (env.NODE_ENV === 'production') {
      const offenders = PROD_FORBIDDEN_DEFAULTS.filter(([key, defaultValue]) => env[key] === defaultValue).map(
        ([key]) => `  - ${key}: default/insecure value in production`,
      );
      if (offenders.length > 0) {
        throw new Error(`Refusing to start in production with insecure configuration:\n${offenders.join('\n')}`);
      }
    }

    cached = env;
  }
  return cached;
}
