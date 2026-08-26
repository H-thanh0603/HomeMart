import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma, ShipmentStatus } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../infra/prisma.service';
import { CarrierFeeInput, CarrierProvider, CreateShipmentInput } from './carrier-provider.interface';
import { GhnProvider } from './providers/ghn.provider';

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

    // Try carrier API first, fall back to formula
    const defaultCarrier = this.carriers.values().next().value;
    if (defaultCarrier && input.toProvince && input.toDistrict) {
      try {
        const carrierFee = await defaultCarrier.calculateFee({
          serviceType: method.code,
          fromProvince: process.env.GHN_FROM_PROVINCE ?? '',
          fromDistrict: process.env.GHN_FROM_DISTRICT ?? '',
          toProvince: input.toProvince,
          toDistrict: input.toDistrict,
          toWard: input.toWard ?? '',
          weightGrams: input.totalWeightGrams,
        });
        return {
          fee: carrierFee.fee,
          estimatedDaysMin: carrierFee.estimatedDaysMin,
          estimatedDaysMax: carrierFee.estimatedDaysMax,
        };
      } catch (e) {
        this.logger.warn(`Carrier API failed, falling back to formula: ${(e as Error).message}`);
      }
    }

    // Fallback formula: baseFee + feePerKg × ceil(weightKg)
    const weightKg = Math.max(1, Math.ceil(input.totalWeightGrams / 1000));
    const fee = method.baseFee + method.feePerKg * weightKg;
    return { fee, estimatedDaysMin: method.estimatedDaysMin, estimatedDaysMax: method.estimatedDaysMax };
  }

  async createShipment(orderId: string, methodId: string, carrierOverride?: string) {
    const carrier = this.carriers.get(carrierOverride ?? 'GHN');
    if (!carrier) return this.prisma.shipment.create({ data: { orderId, methodId } });

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');

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
        weightGrams: order.items.reduce((sum, i) => sum + (i.quantity * 500), 0), // TODO: get real weight
        codAmount: order.totalAmount,
        serviceType: (await this.prisma.shippingMethod.findUnique({ where: { id: methodId } }))?.code ?? 'STANDARD',
        items: order.items.map((i) => ({
          name: i.productName,
          quantity: i.quantity,
          weight: 500,
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
    await this.updateTracking(shipment.id, { status: shipmentStatus });

    // Update order status based on shipment events
    if (shipmentStatus === 'PICKED_UP' && shipment.order.status === OrderStatus.CONFIRMED) {
      await this.prisma.order.update({ where: { id: shipment.orderId }, data: { status: OrderStatus.PROCESSING } });
      this.events.emit('order.status_changed', { orderId: shipment.orderId, from: 'CONFIRMED', to: 'PROCESSING' });
    }
    if (shipmentStatus === 'DELIVERED') {
      await this.prisma.order.update({ where: { id: shipment.orderId }, data: { status: OrderStatus.DELIVERED } });
      this.events.emit('order.status_changed', { orderId: shipment.orderId, from: shipment.order.status, to: 'DELIVERED' });
    }

    return { ok: true, message: `Shipment ${parsed.trackingCode} updated to ${shipmentStatus}` };
  }
}
