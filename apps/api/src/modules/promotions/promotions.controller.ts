import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { Role } from 'src/generated/prisma/client';
import { Public, Roles } from '../../common/decorators/auth.decorators';
import { Audit } from '../admin/audit.decorator';
import { PromotionsService } from './promotions.service';

export class VoucherBodyDto {
  @IsString() code!: string;
  @IsIn(['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING']) type!: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
  @Type(() => Number) @IsInt() value!: number;
  @IsOptional() maxDiscountAmount?: number;
  @IsOptional() minOrderAmount?: number;
  @IsOptional() usageLimit?: number;
  @IsOptional() usageLimitPerUser?: number;
  @IsString() startsAt!: string;
  @IsString() endsAt!: string;
  @IsOptional() @IsIn(['ACTIVE', 'INACTIVE']) status?: 'ACTIVE' | 'INACTIVE';
}

@ApiTags('promotions')
@Controller()
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Public() @Get('vouchers/active')
  activeVouchers() {
    return this.promotionsService.listActive();
  }
}

@ApiTags('admin/promotions')
@ApiBearerAuth()
@Roles(Role.MANAGER)
@Controller('admin')
export class AdminPromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get('vouchers')
  listVouchers() {
    return this.promotionsService.listVouchers();
  }

  @Post('vouchers') @Audit('voucher.create', 'Voucher')
  createVoucher(@Body() dto: VoucherBodyDto) {
    return this.promotionsService.createVoucher(dto);
  }

  @Patch('vouchers/:id') @Audit('voucher.update', 'Voucher')
  updateVoucher(@Param('id') id: string, @Body() dto: Partial<VoucherBodyDto>) {
    return this.promotionsService.updateVoucher(id, dto);
  }

  @Delete('vouchers/:id') @Roles(Role.ADMIN) @Audit('voucher.delete', 'Voucher')
  removeVoucher(@Param('id') id: string) {
    return this.promotionsService.removeVoucher(id);
  }

  @Get('promotions')
  listPromotions() {
    return this.promotionsService.listActivePromotions();
  }
}
