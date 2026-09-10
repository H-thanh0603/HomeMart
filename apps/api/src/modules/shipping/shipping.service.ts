import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OrderStatus, ShipmentStatus } from 'src/generated/prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getEnv } from '../../config/env';
import { PrismaService } from '../../infra/prisma.service';
import { RedisService } from '../../infra/redis.service';
import { CarrierProvider } from './carrier-provider.interface';
import { GhnProvider } from './providers/ghn.provider';
import { ORDER_TRANSITIONS } from '../orders/orders.service';

export interface ShippingQuoteInput {
  methodId: string;
  subtotal: number;
  totalWeightGrams: number;
  freeShipping: boolean;
  toProvince?: string;
  toDistrict?: string;
  toWard?: string;
}

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);
  private readonly carriers: Map<string, CarrierProvider>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
    private readonly redis: RedisService,
  ) {
    this.carriers = new Map();
    // Register carriers — add more here when adding GHTK/Viettel Post etc.
    const ghn = new GhnProvider();
    this.carriers.set(ghn.name, ghn);
  }

  listMethods() {
    return this.prisma.shippingMethod.findMany({ where: { isActive: true } });
  }

  /**
   * BR-9: fee = baseFee + feePerKg × ceil(weightKg), but if carrier is configured,
   * use carrier API for real-time quote (falls back to formula when carrier is down).
   */
  async computeFee(input: ShippingQuoteInput): Promise<{ fee: number; estimatedDaysMin: number; estimatedDaysMax: number }> {
    const method = await this.prisma.shippingMethod.findFirst({
      where: { id: input.methodId, isActive: true },
    });
    if (!method) throw new NotFoundException('Shipping method not found');

    if (input.freeShipping) return { fee: 0, estimatedDaysMin: method.estimatedDaysMin, estimatedDaysMax: method.estimatedDaysMax };

    if (method.code === 'STANDARD' && method.freeShippingMinSubtotal && input.subtotal >= method.freeShippingMinSubtotal) {
      return { fee: 0, estimatedDaysMin: method.estimatedDaysMin, estimatedDaysMax: method.estimatedDaysMax };
    }

    // Cache hit → dùng ngay. Cache miss → trả phí công thức NGAY (không khách
    // nào chờ gateway ship trong flash sale), đồng thời gọi GHN ngầm để warm
    // cache 1h cho những người mua sau trên cùng tuyến.
    const defaultCarrier = this.carriers.values().next().value;
    if (defaultCarrier && input.toProvince && input.toDistrict) {
      const cacheKey = `ship:fee:${method.code}:${input.toProvince}:${input.toDistrict}:${input.toWard ?? ''}:${input.totalWeightGrams}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        try { return JSON.parse(cached) as { fee: number; estimatedDaysMin: number; estimatedDaysMax: number }; } catch { /* ignore */ }
      }
      this.warmCarrierFee(defaultCarrier, method.code, cacheKey, {
        serviceType: method.code,
        fromProvince: getEnv().GHN_FROM_PROVINCE ?? '',
        fromDistrict: getEnv().GHN_FROM_DISTRICT ?? '',
        toProvince: input.toProvince,
        toDistrict: input.toDistrict,
        toWard: input.toWard ?? '',
        weightGrams: input.totalWeightGrams,
      });
    }

    // Formula fee: baseFee + feePerKg × ceil(weightKg)
    const weightKg = Math.max(1, Math.ceil(input.totalWeightGrams / 1000));
    const fee = method.baseFee + method.feePerKg * weightKg;
    return { fee, estimatedDaysMin: method.estimatedDaysMin, estimatedDaysMax: method.estimatedDaysMax };
  }

  /** Fire-and-forget carrier quote — chỉ để warm cache, không chặn request. */
  private warmCarrierFee(
    carrier: CarrierProvider,
    methodCode: string,
    cacheKey: string,
    input: Parameters<CarrierProvider['calculateFee']>[0],
  ) {
    void carrier
      .calculateFee(input)
      .then((quote) => {
        const result = {
          fee: quote.fee,
          estimatedDaysMin: quote.estimatedDaysMin,
          estimatedDaysMax: quote.estimatedDaysMax,
        };
        void this.redis.set(cacheKey, JSON.stringify(result), 3600);
        this.logger.debug(`Carrier fee cached (warm): ${methodCode} ${cacheKey}`);
      })
      .catch((e: Error) => {
        // Gateway chậm/chết: người mua vẫn trả phí công thức, không sao cả.
        this.logger.warn(`Carrier warm-up failed for ${cacheKey}: ${e.message}`);
      });
  }

  async createShipment(orderId: string, methodId: string, carrierOverride?: string) {
    const carrier = this.carriers.get(carrierOverride ?? 'GHN');
    if (!carrier) return this.prisma.shipment.create({ data: { orderId, methodId } });

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    // Lấy weight thật từ Product (fallback 500g nếu thiếu)
    const productIds = order.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, weightGrams: true },
    });
    const weightMap = new Map(products.map((p) => [p.id, p.weightGrams ?? 500]));

    try {
      const result = await carrier.createOrder({
        orderId,
        orderNumber: order.orderNumber,
        contactName: order.contactName,
        contactPhone: order.contactPhone,
        address: order.shippingLine,
        province: order.shippingProvince,
        district: order.shippingDistrict,
        ward: order.shippingWard,
        weightGrams: order.items.reduce((sum, i) => sum + (weightMap.get(i.productId) ?? 500) * i.quantity, 0),
        codAmount: order.totalAmount,
        serviceType: (await this.prisma.shippingMethod.findUnique({ where: { id: methodId } }))?.code ?? 'STANDARD',
        items: order.items.map((i) => ({
          name: i.productName,
          quantity: i.quantity,
          weight: weightMap.get(i.productId) ?? 500,
        })),
      });

      this.logger.log(`Carrier order created: ${result.trackingCode} for order ${order.orderNumber}`);

      return this.prisma.shipment.create({
        data: {
          orderId,
          methodId,
          carrierName: result.carrierName,
          trackingCode: result.trackingCode,
          status: 'PREPARING',
          logs: JSON.stringify([{ at: new Date().toISOString(), status: 'CREATED', trackingCode: result.trackingCode }]),
        },
      });
    } catch (e) {
      this.logger.warn(`Carrier createOrder failed: ${(e as Error).message} — creating local shipment only`);
      return this.prisma.shipment.create({ data: { orderId, methodId } });
    }
  }

  async updateTracking(shipmentId: string, data: {
    trackingCode?: string;
    carrierName?: string;
    status?: ShipmentStatus;
  }) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id: shipmentId } });
    if (!shipment) throw new NotFoundException('Shipment not found');

    const logs = Array.isArray(shipment.logs) ? (shipment.logs as unknown[]) : [];
    logs.push({ at: new Date().toISOString(), status: data.status ?? shipment.status, note: data.trackingCode });

    return this.prisma.shipment.update({
      where: { id: shipmentId },
      data: {
        ...data,
        logs: logs as object,
        ...(data.status === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
        ...(data.status === 'PICKED_UP' ? { shippedAt: new Date() } : {}),
      },
    });
  }

  /**
   * Handle carrier webhook callback.
   * Maps carrier-specific status to ShipmentStatus and updates order accordingly.
   */
  async handleWebhook(carrierName: string, payload: unknown, headers: Record<string, string>): Promise<{ ok: boolean; message: string }> {
    const carrier = this.carriers.get(carrierName);
    if (!carrier) return { ok: false, message: `Unknown carrier: ${carrierName}` };

    if (!carrier.verifyWebhook(headers, payload)) {
      return { ok: false, message: 'Invalid webhook signature' };
    }

    const parsed = carrier.parseWebhook(payload);
    if (!parsed) return { ok: false, message: 'Could not parse webhook payload' };

    const shipment = await this.prisma.shipment.findFirst({
      where: { trackingCode: parsed.trackingCode },
      include: { order: true },
    });
    if (!shipment) return { ok: false, message: `Shipment not found for tracking ${parsed.trackingCode}` };

    const statusMap: Record<string, ShipmentStatus> = {
      PREPARING: 'PREPARING',
      PICKED_UP: 'PICKED_UP',
      IN_TRANSIT: 'IN_TRANSIT',
      OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
      DELIVERED: 'DELIVERED',
      FAILED: 'FAILED',
      RETURNED: 'RETURNED',
    };

    const shipmentStatus = statusMap[parsed.status] ?? 'IN_TRANSIT';

    // Idempotency: carrier retry gửi lại cùng event → skip (vẫn trả OK để
    // carrier ngừng retry). So sánh cả status lẫn thời điểm — chỉ bỏ qua
    // khi KHÔNG có gì đổi.
    const lastLog = Array.isArray(shipment.logs)
      ? (shipment.logs as Array<{ at?: string; status?: string }>)[(shipment.logs as unknown[]).length - 1]
      : undefined;
    const duplicateEvent =
      shipment.status === shipmentStatus &&
      lastLog?.status === parsed.status &&
      lastLog?.at;

    if (!duplicateEvent) {
      await this.updateTracking(shipment.id, { status: shipmentStatus });
    }

    // Update order status based on shipment events — qua state machine
    // (BR-5): terminal states (CANCELLED/COMPLETED/REFUNDED) không bao giờ
    // bị webhook "hồi sinh"; transition chỉ xảy ra khi hợp lệ.
    const order = shipment.order;
    const deliverableStatuses: OrderStatus[] = [OrderStatus.SHIPPED, OrderStatus.PROCESSING, OrderStatus.PACKING];
    const to: OrderStatus | null =
      shipmentStatus === 'PICKED_UP' && order.status === OrderStatus.CONFIRMED
        ? OrderStatus.PROCESSING
        : shipmentStatus === 'DELIVERED' && deliverableStatuses.includes(order.status)
          ? OrderStatus.DELIVERED
          : null;

    if (to && ORDER_TRANSITIONS[order.status]?.includes(to)) {
      // Optimistic-lock guard: chỉ update khi version vẫn như lúc đọc —
      // tránh đè lên transition admin vừa thực hiện song song.
      const updated = await this.prisma.$executeRaw`
        UPDATE orders SET status = ${to}::"OrderStatus", version = version + 1
        WHERE id = ${shipment.orderId} AND version = ${order.version} AND status = ${order.status}::"OrderStatus"`;
      if (updated > 0) {
        await this.prisma.orderStatusHistory.create({
          data: { orderId: shipment.orderId, fromStatus: order.status, toStatus: to, actorId: null, note: `Carrier ${carrierName} webhook: ${parsed.status}` },
        });
        this.events.emit('order.status_changed', { orderId: shipment.orderId, from: order.status, to });
      } else {
        this.logger.warn(`Webhook ${carrierName} ${parsed.status}: order ${order.orderNumber} changed concurrently — skipped (state machine guard)`);
      }
    }

    return { ok: true, message: `Shipment ${parsed.trackingCode} updated to ${shipmentStatus}` };
  }
}
