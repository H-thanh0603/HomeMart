import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma.service';

export interface ShippingQuoteInput {
  methodId: string;
  subtotal: number;
  totalWeightGrams: number;
  freeShipping: boolean; // từ voucher FREE_SHIPPING
}

@Injectable()
export class ShippingService {
  constructor(private readonly prisma: PrismaService) {}

  listMethods() {
    return this.prisma.shippingMethod.findMany({ where: { isActive: true } });
  }

  /**
   * BR-9: fee = baseFee + feePerKg × ceil(weightKg).
   * Free STANDARD when subtotal ≥ method threshold; voucher freeship forces 0.
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

    const weightKg = Math.max(1, Math.ceil(input.totalWeightGrams / 1000));
    const fee = method.baseFee + method.feePerKg * weightKg;
    return { fee, estimatedDaysMin: method.estimatedDaysMin, estimatedDaysMax: method.estimatedDaysMax };
  }

  async createShipment(orderId: string, methodId: string) {
    return this.prisma.shipment.create({ data: { orderId, methodId } });
  }

  async updateTracking(shipmentId: string, data: {
    trackingCode?: string;
    carrierName?: string;
    status?: 'PREPARING' | 'PICKED_UP' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED' | 'RETURNED';
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
}
