import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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
}
