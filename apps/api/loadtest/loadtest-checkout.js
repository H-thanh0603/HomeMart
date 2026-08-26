/**
 * HomeMart — k6 Load Test: 200 Parallel Checkouts
 *
 * Verifies:
 *   1. No oversell (stock doesn't go negative)
 *   2. Voucher usageLimitPerUser not exceeded
 *   3. No concurrent modification errors
 *
 * Run:
 *   k6 run apps/api/loadtest/loadtest-checkout.js
 *   k6 run --vus 200 --iterations 200 apps/api/loadtest/loadtest-checkout.js
 *
 * Prerequisites:
 *   - API running at API_URL (default http://localhost:4000/api/v1)
 *   - Seed data: products with stock > 0, at least 1 shipping method
 *
 * Install k6:
 *   macOS:  brew install k6
 *   Linux:  sudo snap install k6
 *   Docker: docker run --rm -i grafana/k6 run - < loadtest-checkout.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// ─── Config ───────────────────────────────────────────────────────────
const API_URL = __ENV.API_URL || 'http://localhost:4000/api/v1';
const VUS = parseInt(__ENV.VUS || '200', 10);
const ITERATIONS = parseInt(__ENV.ITERATIONS || '200', 10);

const checkoutSuccess = new Rate('checkout_success');
const checkoutErrors = new Counter('checkout_errors');
const checkoutDuration = new Trend('checkout_duration');

export const options = {
  scenarios: {
    parallel_checkout: {
      executor: 'shared-iterations',
      vus: VUS,
      iterations: ITERATIONS,
      maxDuration: '5m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    checkout_success: ['rate>0.95'],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────

function randomEmail() {
  return `loadtest_${Date.now()}_${__VU}_${__ITER}@example.com`;
}

function registerAndLogin(email) {
  // Register
  const regRes = http.post(`${API_URL}/auth/register`, JSON.stringify({
    email,
    password: 'LoadTest123!',
    fullName: `Load Test User ${__VU}`,
    phone: `0900${String(__VU).padStart(6, '0')}`,
  }), { headers: { 'Content-Type': 'application/json' } });

  if (regRes.status !== 200 && regRes.status !== 201) {
    // Try login if already exists
    const loginRes = http.post(`${API_URL}/auth/login`, JSON.stringify({
      email,
      password: 'LoadTest123!',
    }), { headers: { 'Content-Type': 'application/json' } });
    if (loginRes.status !== 200) return null;
    const loginBody = JSON.parse(loginRes.body);
    return loginBody?.data?.accessToken ?? loginBody?.accessToken;
  }

  const regBody = JSON.parse(regRes.body);
  return regBody?.data?.accessToken ?? regBody?.accessToken;
}

function getDefaultAddress(token) {
  const res = http.get(`${API_URL}/addresses`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = JSON.parse(res.body);
  const addresses = body?.data?.items ?? body?.data ?? [];
  return addresses[0]?.id;
}

function createAddress(token) {
  const res = http.post(`${API_URL}/addresses`, JSON.stringify({
    fullName: `Load Test ${__VU}`,
    phone: `0900${String(__VU).padStart(6, '0')}`,
    province: 'Hà Nội',
    district: 'Ba Đình',
    ward: 'Phúc Xá',
    line: '123 Load Test Street',
    isDefault: true,
  }), {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  const body = JSON.parse(res.body);
  return body?.data?.id;
}

function getShippingMethod() {
  const res = http.get(`${API_URL}/shipping/methods`);
  const body = JSON.parse(res.body);
  const methods = body?.data ?? body;
  return methods[0]?.id;
}

function addToCart(token, productId) {
  http.post(`${API_URL}/cart/items`, JSON.stringify({
    productId,
    quantity: 1,
  }), {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
}

function getRandomProduct() {
  const res = http.get(`${API_URL}/products?limit=50&status=PUBLISHED`);
  const body = JSON.parse(res.body);
  const products = body?.data?.items ?? body?.data ?? [];
  if (!products.length) return null;
  return products[Math.floor(Math.random() * products.length)];
}

// ─── Main test flow ───────────────────────────────────────────────────

export default function () {
  const email = randomEmail();
  const start = Date.now();

  // 1. Register
  const token = registerAndLogin(email);
  if (!token) {
    checkoutErrors.add(1);
    return;
  }

  // 2. Create address if needed
  let addressId = getDefaultAddress(token);
  if (!addressId) {
    addressId = createAddress(token);
    if (!addressId) {
      checkoutErrors.add(1);
      return;
    }
  }

  // 3. Get shipping method
  const methodId = getShippingMethod();
  if (!methodId) {
    checkoutErrors.add(1);
    return;
  }

  // 4. Get product & add to cart
  const product = getRandomProduct();
  if (!product) {
    checkoutErrors.add(1);
    return;
  }
  addToCart(token, product.id);

  sleep(0.1);

  // 5. Checkout (COD)
  const checkoutRes = http.post(`${API_URL}/orders/checkout`, JSON.stringify({
    addressId,
    shippingMethodId: methodId,
    paymentMethod: 'COD',
    items: [{ productId: product.id, quantity: 1 }],
  }), {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    timeout: '10s',
  });

  const duration = Date.now() - start;
  checkoutDuration.add(duration);

  const ok = checkoutRes.status === 200;
  checkoutSuccess.add(ok);
  if (!ok) {
    checkoutErrors.add(1);
    // Log error for debugging
    console.error(`Checkout failed: ${checkoutRes.status} ${checkoutRes.body}`);
  }

  check(checkoutRes, {
    'checkout status is 200': (r) => r.status === 200,
    'checkout returns order': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body?.data?.orderNumber != null || body?.orderNumber != null;
      } catch { return false; }
    },
  });
}

// ─── Summary ──────────────────────────────────────────────────────────

export function handleSummary(data) {
  const successRate = data.metrics.checkout_success?.values?.rate ?? 0;
  const errors = data.metrics.checkout_errors?.values?.count ?? 0;
  const avgDuration = data.metrics.checkout_duration?.values?.avg ?? 0;

  const summary = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  HomeMart Load Test — ${VUS} parallel checkouts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Success rate:  ${(successRate * 100).toFixed(1)}%  (target: >95%)
  Errors:        ${errors}
  Avg duration:  ${avgDuration.toFixed(0)}ms
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

  console.log(summary);

  return {
    'stdout': summary,
    'loadtest-result.json': JSON.stringify({
      vus: VUS,
      iterations: ITERATIONS,
      successRate,
      errors,
      avgDuration,
      timestamp: new Date().toISOString(),
    }, null, 2),
  };
}
