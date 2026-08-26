import { All, Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { Role } from '@prisma/client';
import { Public, Roles } from '../../common/decorators/auth.decorators';
import { Audit } from '../admin/audit.decorator';
import { ShippingService } from './shipping.service';

export class ShippingMethodDto {
  @IsIn(['STANDARD', 'EXPRESS', 'SAME_DAY']) code!: 'STANDARD' | 'EXPRESS' | 'SAME_DAY';
  @IsString() name!: string;
  @Type(() => Number) @IsInt() baseFee!: number;
  @Type(() => Number) @IsInt() feePerKg!: number;
  @IsOptional() @Type(() => Number) @IsInt() freeShippingMinSubtotal?: number;
  @Type(() => Number) @IsInt() estimatedDaysMin!: number;
  @Type(() => Number) @IsInt() estimatedDaysMax!: number;
}

@ApiTags('shipping')
@Controller()
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Public() @Get('shipping/methods')
  methods() {
    return this.shippingService.listMethods();
  }
}

@ApiTags('admin/shipping')
@ApiBearerAuth()
@Roles(Role.MANAGER)
@Controller('admin')
export class AdminShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Get('shipments')
  async listShipments(@Query() q: { status?: string }) {
    return this.shippingService['prisma'].shipment.findMany({
      where: q.status ? { status: q.status as never } : undefined,
      include: { order: { select: { orderNumber: true, contactName: true } }, method: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('shipping-methods') @Audit('shipping_method.create', 'ShippingMethod')
  createMethod(@Body() dto: ShippingMethodDto) {
    return this.shippingService['prisma'].shippingMethod.create({ data: dto });
  }

  @Patch('shipments/:id/tracking') @Audit('shipment.update', 'Shipment')
  updateTracking(
    @Param('id') id: string,
    @Body() dto: { trackingCode?: string; carrierName?: string; status?: string },
  ) {
    return this.shippingService.updateTracking(id, dto as never);
  }

  @Post('shipments/:id/create-carrier')
  @ApiOperation({ summary: '[Admin] Tạo vận đơn trên carrier (GHN)' })
  createCarrierOrder(@Param('id') shipmentId: string, @Query('carrier') carrier: string) {
    const shipment = this.shippingService['prisma'].shipment.findUnique({ where: { id: shipmentId } });
    return shipment.then((s) =>
      s ? this.shippingService.createShipment(s.orderId, s.methodId, carrier) : null,
    );
  }
}

// ─── Carrier Webhook ───────────────────────────────────────────
// Public endpoints — carriers POST status updates here.
// Each carrier has its own route to avoid signature collisions.

@ApiTags('carrier/webhooks')
@Controller('carrier')
export class WebhookController {
  constructor(private readonly shippingService: ShippingService) {}

  @All('ghn/webhook')
  @ApiOperation({ summary: 'GHN carrier webhook' })
  async ghnWebhook(@Req() req: { headers: Record<string, string> }, @Body() body: unknown) {
    return this.shippingService.handleWebhook('GHN', body, req.headers);
  }

  @All('ghtk/webhook')
  @ApiOperation({ summary: 'GHTK carrier webhook (placeholder)' })
  async ghtkWebhook(@Req() req: { headers: Record<string, string> }, @Body() body: unknown) {
    return this.shippingService.handleWebhook('GHTK', body, req.headers);
  }
}
