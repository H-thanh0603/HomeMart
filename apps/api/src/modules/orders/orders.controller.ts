import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import { OrderStatus, PaymentMethodType } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/auth.decorators';
import { buildPagedMeta } from '../../common/dto/pagination.dto';
import { OrdersService, CheckoutDto } from './orders.service';

export class CheckoutItemDto {
  @IsString() productId!: string;
  @IsOptional() @IsString() variantId?: string;
  @Type(() => Number) @IsInt() @Min(1) quantity!: number;
}

export class CheckoutBodyDto {
  @IsOptional() @IsArray() @ValidateNested({ each: true })
  items?: CheckoutItemDto[];

  @IsString() addressId!: string;
  @IsString() shippingMethodId!: string;
  @IsOptional() @IsString() voucherCode?: string;
  @IsIn(['COD', 'VNPAY', 'MOMO', 'STRIPE', 'BANK_TRANSFER']) paymentMethod!: PaymentMethodType;
  @IsOptional() @IsString() note?: string;
}

export class PreviewDto {
  @IsOptional() items?: CheckoutItemDto[];
  @IsOptional() @IsString() shippingMethodId?: string;
  @IsOptional() @IsString() voucherCode?: string;
}


export class OrderActionDto {
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) @MaxLength(500, { each: true }) images?: string[]; // URLs từ POST /uploads/image
}

export class ListOrdersQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit = 10;
  @IsOptional() @IsIn(['PENDING','CONFIRMED','PROCESSING','PACKING','SHIPPED','DELIVERED','COMPLETED','CANCELLED','RETURN_REQUESTED','RETURNED','REFUNDED']) status?: OrderStatus;
}

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('preview')
  @ApiOperation({ summary: 'Tính toán tạm subtotal/discount/shipping/tax/total (backend tính)' })
  preview(@CurrentUser('id') userId: string, @Body() dto: PreviewDto) {
    return this.ordersService.preview(userId, dto as CheckoutDto);
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Đặt hàng — backend re-price + reserve stock trong 1 transaction' })
  checkout(@CurrentUser('id') userId: string, @Body() dto: CheckoutBodyDto) {
    return this.ordersService.checkout(userId, dto as CheckoutDto);
  }

  @Get()
  list(@CurrentUser('id') userId: string, @Query() query: ListOrdersQuery) {
    return this.ordersService
      .listMine(userId, Number(query.page), Number(query.limit), query.status)
      .then((r) => ({ items: r.items, ...buildPagedMeta(r.total, r.page, r.limit) }));
  }

  @Get(':id')
  detail(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.ordersService.getOwned(userId, id);
  }

  @Post(':id/cancel')
  cancel(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: OrderActionDto,
  ) {
    // validated below via helper
    return this.ordersService.cancel(userId, id, dto.reason);
  }

  @Post(':id/return')
  requestReturn(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: OrderActionDto,
  ) {
    const note = dto.images?.length
      ? `${dto.reason ?? ''}\n[images] ${dto.images.join(', ')}`.trim()
      : dto.reason;
    return this.ordersService.requestReturn(userId, id, note);
  }
}
