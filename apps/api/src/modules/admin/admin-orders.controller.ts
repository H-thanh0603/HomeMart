import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { OrderStatus, Role } from '@prisma/client';
import { Roles } from '../../common/decorators/auth.decorators';
import { CurrentUser } from '../../common/decorators/auth.decorators';
import { Audit } from './audit.decorator';
import { OrdersService } from '../orders/orders.service';
import { PaymentsService } from '../payments/payments.service';

export class AdminListOrdersQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsIn(Object.values(OrderStatus)) status?: OrderStatus;
}

@ApiTags('admin/orders')
@ApiBearerAuth()
@Roles(Role.STAFF)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Tất cả đơn hàng (filter + search)' })
  async list(@Query() query: AdminListOrdersQuery) {
    const where = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? {
            OR: [
              { orderNumber: { contains: query.q, mode: 'insensitive' as const } },
              { contactName: { contains: query.q, mode: 'insensitive' as const } },
              { contactPhone: { contains: query.q } },
            ],
          }
        : {}),
    };
    return this.ordersService.adminList(where, Number(query.page), Number(query.limit));
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.ordersService.getForAdmin(id);
  }

  /** Staff/admin transition — full state-machine validation (BR-5). */
  @Patch(':id/status')
  @Audit('order.status_update', 'Order')
  async updateStatus(
    @CurrentUser('id') actorId: string,
    @Param('id') id: string,
    @Body() dto: { status: OrderStatus; note?: string },
  ) {
    return this.ordersService.transition(id, dto.status, actorId, dto.note);
  }

  /** COD collected on delivery. */
  @Post(':id/confirm-cod')
  @Audit('order.cod_confirm', 'Order')
  confirmCod(@Param('id') orderId: string) {
    return this.paymentsService.confirmCodOnDelivery(orderId);
  }
}
