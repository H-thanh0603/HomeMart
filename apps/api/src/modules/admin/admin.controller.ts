import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { OrderStatus, Role } from '@prisma/client';
import { Roles } from '../../common/decorators/auth.decorators';
import { clampLimit, clampPage } from '../../common/utils/helpers';
import { AdminService } from './admin.service';

export class AdminListOrdersQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit = 20;
  @IsOptional() @IsString() q?: string;
  @IsOptional() status?: OrderStatus;
}

@ApiTags('admin/dashboard')
@ApiBearerAuth()
@Roles(Role.STAFF)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard/stats')
  @ApiOperation({ summary: '[Admin] Số liệu dashboard' })
  dashboardStats() {
    return this.adminService.dashboardStats();
  }

  @Get('reports/revenue')
  revenueReport(
    @Query('from') from = new Date(Date.now() - 30 * 86400e3).toISOString().slice(0, 10),
    @Query('to') to = new Date().toISOString().slice(0, 10),
    @Query('groupBy') groupBy: 'day' | 'month' = 'day',
  ) {
    if (!isDateString(from) || !isDateString(to)) throw new BadRequestException('Invalid date range');
    return this.adminService.revenueReport(from, to, groupBy === 'month' ? 'month' : 'day');
  }

  @Get('reports/top-categories')
  topCategories(@Query('from') from = '', @Query('to') to = '') {
    const effFrom = from || new Date(Date.now() - 30 * 86400e3).toISOString();
    const effTo = to || new Date().toISOString();
    if (!isDateString(effFrom) || !isDateString(effTo)) throw new BadRequestException('Invalid date range');
    return this.adminService.topCategories(effFrom, effTo);
  }

  @Get('reports/soft-launch') @Roles(Role.MANAGER)
  @ApiOperation({ summary: '[Admin] 4.3 soft-launch 3 metrics (checkout/on-time/returns)' })
  softLaunch(@Query('from') from?: string, @Query('to') to?: string) {
    return this.adminService.softLaunchMetrics(from, to);
  }

  @Get('audit-logs') @Roles(Role.ADMIN)
  auditLogs(@Query('page') page = '1', @Query('limit') limit = '50') {
    return this.adminService.getAuditLogs(clampPage(page), clampLimit(limit, 50));
  }
}

function isDateString(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/.test(v) && !Number.isNaN(new Date(v).getTime());
}
