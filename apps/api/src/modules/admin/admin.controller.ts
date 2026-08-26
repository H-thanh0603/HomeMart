import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { OrderStatus, Role } from '@prisma/client';
import { Roles } from '../../common/decorators/auth.decorators';
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
    return this.adminService.revenueReport(from, to, groupBy);
  }

  @Get('reports/top-categories')
  topCategories(@Query('from') from = '', @Query('to') to = '') {
    const defaultFrom = new Date(Date.now() - 30 * 86400e3).toISOString();
    const defaultTo = new Date().toISOString();
    return this.adminService.topCategories(from || defaultFrom, to || defaultTo);
  }

  @Get('audit-logs') @Roles(Role.ADMIN)
  auditLogs(@Query('page') page = '1', @Query('limit') limit = '50') {
    return this.adminService.getAuditLogs(Number(page), Number(limit));
  }
}
