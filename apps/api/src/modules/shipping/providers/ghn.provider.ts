import { Logger } from '@nestjs/common';
import {
  CarrierFeeInput,
  CarrierFeeResult,
  CarrierProvider,
  CreateShipmentInput,
  CreateShipmentResult,
} from '../carrier-provider.interface';

/**
 * GiaoHangNhanh (GHN) integration.
 * Docs: https://dev-online.ghn.vn/home/docs/api/
 *
 * Env vars:
 *   GHN_TOKEN         — API token from GHN merchant portal
 *   GHN_SHOP_ID       — Shop ID
 *   GHN_API_URL       — Base URL (default: https://dev-online.ghn.vn/shipping/v2)
 *   GHN_WEBHOOK_TOKEN — Secret token for webhook signature verification
 *   GHN_FROM_NAME     — Default sender name
 *   GHN_FROM_PHONE    — Default sender phone
 *   GHN_FROM_ADDRESS  — Default sender address
 *   GHN_FROM_PROVINCE — Default sender province (ID, not name)
 *   GHN_FROM_DISTRICT — Default sender district (ID, not name)
 *   GHN_FROM_WARD     — Default sender ward (ID, not name)
 *
 * When GHN_TOKEN is unset (dev), returns deterministic mock data.
 */
export class GhnProvider implements CarrierProvider {
  readonly name = 'GHN';
  private readonly logger = new Logger(GhnProvider.name);
  private readonly token: string;
  private readonly shopId: string;
  private readonly apiUrl: string;

  constructor() {
    this.token = process.env.GHN_TOKEN ?? '';
    this.shopId = process.env.GHN_SHOP_ID ?? '';
    this.apiUrl = process.env.GHN_API_URL ?? 'https://dev-online.ghn.vn/shipping/v2';
  }

  // ─── Mock fallback ───

  private get isConfigured(): boolean {
    return Boolean(this.token && this.shopId);
  }

  async calculateFee(input: CarrierFeeInput): Promise<CarrierFeeResult> {
    if (!this.isConfigured) {
      return this.mockFee(input);
    }

    const token = await this.getServiceToken(input.serviceType);

    const body = {
      shop_id: Number(this.shopId),
      from_district_id: Number(process.env.GHN_FROM_DISTRICT ?? 1461),
      to_district_id: Number(input.toDistrict),
      to_ward_code: input.toWard,
      service_code: this.serviceCode(input.serviceType),
      weight: input.weightGrams,
    };

    const res = await fetch(`${this.apiUrl}/v2/a5/fee`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Token: token,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });

    const data = (await res.json()) as {
      code: number;
      data: { total: number; service_fee: number; insurance_fee: number };
    };

    if (data.code !== 200) {
      throw new Error(`GHN fee API error: ${JSON.stringify(data)}`);
    }

    return {
      fee: data.data.total ?? data.data.service_fee,
      estimatedDaysMin: input.serviceType === 'EXPRESS' ? 1 : input.serviceType === 'SAME_DAY' ? 0 : 2,
      estimatedDaysMax: input.serviceType === 'EXPRESS' ? 2 : input.serviceType === 'SAME_DAY' ? 0 : 5,
      carrierName: 'GHN',
    };
  }

  async createOrder(input: CreateShipmentInput): Promise<CreateShipmentResult> {
    if (!this.isConfigured) {
      return this.mockCreateOrder(input);
    }

    const token = await this.getServiceToken(input.serviceType);

    const body = {
      shop_id: Number(this.shopId),
      required_note: 'KHONG_THU_TIEN',
      note: `HomeMart #${input.orderNumber}`,
      from_name: process.env.GHN_FROM_NAME ?? 'HomeMart',
      from_phone: process.env.GHN_FROM_PHONE ?? '0123456789',
      from_address: process.env.GHN_FROM_ADDRESS ?? '123 ABC',
      from_ward_code: process.env.GHN_FROM_WARD ?? '',
      from_district_id: Number(process.env.GHN_FROM_DISTRICT ?? 1461),
      to_name: input.contactName,
      to_phone: input.contactPhone,
      to_address: input.address,
      to_ward_code: input.ward,
      to_district_id: Number(input.district),
      service_code: this.serviceCode(input.serviceType),
      cod_amount: input.codAmount ?? 0,
      items: input.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        weight: i.weight,
      })),
    };

    const res = await fetch(`${this.apiUrl}/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Token: token,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });

    const data = (await res.json()) as {
      code: number;
      data: {
        order_code: string;
        expected_delivery_time: string;
        fee: { total: number };
      };
      message?: string;
    };

    if (data.code !== 200) {
      throw new Error(`GHN create order error: ${data.message ?? JSON.stringify(data)}`);
    }

    return {
      trackingCode: data.data.order_code,
      carrierName: 'GHN',
      fee: data.data.fee?.total ?? 0,
      estimatedDelivery: data.data.expected_delivery_time,
      rawResponse: data,
    };
  }

  verifyWebhook(headers: Record<string, string>, body: unknown): boolean {
    const token = process.env.GHN_WEBHOOK_TOKEN;
    if (!token) return true; // skip verification in dev
    return headers['x-token'] === token || headers['x-giaohangnhanh-token'] === token;
  }

  parseWebhook(body: unknown): {
    trackingCode: string;
    status: string;
    note?: string;
    timestamp: string;
  } | null {
    const b = body as Record<string, unknown>;
    if (!b || typeof b.order_code !== 'string') return null;

    const statusMap: Record<string, string> = {
      ready_to_pick: 'PICKED_UP',
      picking: 'PICKED_UP',
      picked: 'PICKED_UP',
      delivering: 'IN_TRANSIT',
      delivered: 'DELIVERED',
      delivery_fail: 'FAILED',
      cancel: 'RETURNED',
      wrong_return: 'RETURNED',
      return: 'RETURNED',
    };

    return {
      trackingCode: b.order_code as string,
      status: statusMap[(b.status as string) ?? ''] ?? 'IN_TRANSIT',
      note: (b.log as string) ?? undefined,
      timestamp: (b.updated_at as string) ?? new Date().toISOString(),
    };
  }

  // ─── Private helpers ───

  private serviceCode(type: string): string {
    const map: Record<string, string> = {
      STANDARD: 'gtc',
      EXPRESS: 'tieuchuan',
      SAME_DAY: 'nhanh',
    };
    return map[type] ?? 'gtc';
  }

  private async getServiceToken(serviceType: string): Promise<string> {
    // GHN v2 uses a token from POST /a5/gen-token
    const res = await fetch(`${this.apiUrl}/a5/gen-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Token: this.token,
      },
      body: JSON.stringify({
        shop_id: Number(this.shopId),
        service_code: this.serviceCode(serviceType),
      }),
      signal: AbortSignal.timeout(5000),
    });
    const data = (await res.json()) as { code: number; data?: { token: string } };
    if (data.code !== 200 || !data.data?.token) {
      throw new Error(`GHN token generation failed: ${JSON.stringify(data)}`);
    }
    return data.data.token;
  }

  private mockFee(input: CarrierFeeInput): CarrierFeeResult {
    const weightKg = Math.max(1, Math.ceil(input.weightGrams / 1000));
    const base: Record<string, number> = { STANDARD: 15000, EXPRESS: 25000, SAME_DAY: 40000 };
    const fee = (base[input.serviceType] ?? 15000) + 5000 * weightKg;
    return {
      fee,
      estimatedDaysMin: input.serviceType === 'EXPRESS' ? 1 : input.serviceType === 'SAME_DAY' ? 0 : 2,
      estimatedDaysMax: input.serviceType === 'EXPRESS' ? 2 : input.serviceType === 'SAME_DAY' ? 0 : 5,
      carrierName: 'GHN',
    };
  }

  private mockCreateOrder(input: CreateShipmentInput): CreateShipmentResult {
    const trackingCode = `GHNM${Date.now().toString(36).toUpperCase()}`;
    return {
      trackingCode,
      carrierName: 'GHN',
      fee: 25000,
      estimatedDelivery: new Date(Date.now() + 3 * 86400000).toISOString(),
    };
  }
}
