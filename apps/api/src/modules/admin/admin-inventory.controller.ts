import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { Role } from 'src/generated/prisma/client';
import { CurrentUser, Roles } from '../../common/decorators/auth.decorators';
import { Audit } from './audit.decorator';
import { AdminService } from './admin.service';
import { InventoryService } from '../inventory/inventory.service';

export class AdjustStockDto {
  @Type(() => Number) @IsInt() delta!: number; // +restock / -correction
  @IsOptional() @IsString() note?: string;
}

@ApiTags('admin/inventory')
@ApiBearerAuth()
@Roles(Role.STAFF)
@Controller('admin')
export class AdminInventoryController {
  constructor(
    private readonly adminService: AdminService,
    private readonly inventoryService: InventoryService,
  ) {}

  @Get('inventory/low-stock')
  lowStock() {
    return this.inventoryService.listLowStock();
  }

  @Get('products/:id/inventory')
  productInventory(@Param('id') productId: string) {
    return this.adminService.productInventory(productId);
  }

  @Post('inventory/:id/adjust')
  @Roles(Role.MANAGER)
  @Audit('inventory.adjust', 'Inventory')
  adjust(@CurrentUser('id') actorId: string, @Param('id') id: string, @Body() dto: AdjustStockDto) {
    return this.inventoryService.adjust(id, dto.delta, actorId);
  }
}
