import { BadRequestException, Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import { OrderStatus, PaymentMethodType } from 'src/generated/prisma/client';
import { CurrentUser } from '../../common/decorators/auth.decorators';
import { buildPagedMeta } from '../../common/dto/pagination.dto';
import { OrdersService, CheckoutDto } from './orders.service';

export class CheckoutItemDto {
  @IsString() productId!: string;
  @IsOptional() @IsString() variantId?: string;
  @Type(() => Number) @IsInt() @Min(1) quantity!: number;
}

export class CheckoutBodyDto {
  // @Type is required: without it the ValidationPipe strips productId/quantity
  // from the nested plain objects (whitelist) and checkout 500s downstream.
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => CheckoutItemDto)
  items?: CheckoutItemDto[];

  @IsString() addressId!: string;
  @IsString() shippingMethodId!: string;
  @IsOptional() @IsString() voucherCode?: string;
  @IsIn(['COD', 'VNPAY', 'MOMO', 'STRIPE', 'BANK_TRANSFER']) paymentMethod!: PaymentMethodType;
  @IsOptional() @IsString() note?: string;
}

export class PreviewDto {
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => CheckoutItemDto)
  items?: CheckoutItemDto[];
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
  @ApiOperation({ summary: 'Đặt hàng — backend re-price + reserve stock trong 1 transaction. Yêu cầu header Idempotency-Key (UUID do client sinh).' })
  checkout(
    @CurrentUser('id') userId: string,
    @Body() dto: CheckoutBodyDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    if (!idempotencyKey || !/^[\w-]{8,64}$/.test(idempotencyKey)) {
      throw new BadRequestException('Missing or invalid Idempotency-Key header (8-64 chars)');
    }
    return this.ordersService.checkout(userId, dto as CheckoutDto, idempotencyKey);
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
