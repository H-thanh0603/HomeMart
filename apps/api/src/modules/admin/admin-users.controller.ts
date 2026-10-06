import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Role, UserStatus } from 'src/generated/prisma/client';
import { CurrentUser, Roles } from '../../common/decorators/auth.decorators';
import { buildPagedMeta } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../infra/prisma.service';
import { Audit } from './audit.decorator';

export class AdminListUsersQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsIn(Object.values(Role)) role?: Role;
  @IsOptional() @IsIn(Object.values(UserStatus)) status?: UserStatus;
}

export class UpdateUserRoleDto {
  @IsIn(Object.values(Role)) role!: Role;
}

export class UpdateUserStatusDto {
  @IsIn(Object.values(UserStatus)) status!: UserStatus;
}

const SAFE_SELECT = {
  id: true, email: true, fullName: true, phone: true,
  role: true, status: true, lastLoginAt: true, createdAt: true,
} as const;

@ApiTags('admin/users')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Danh sách users (search + filter role/status)' })
  async list(@Query() query: AdminListUsersQuery) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 20, 100);
    const where = {
      deletedAt: null,
      ...(query.role ? { role: query.role } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? {
            OR: [
              { email: { contains: query.q, mode: 'insensitive' as const } },
              { fullName: { contains: query.q, mode: 'insensitive' as const } },
              { phone: { contains: query.q } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: SAFE_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      items,
      ...buildPagedMeta(total, page, limit),
    };
  }

  @Patch(':id/role')
  @Audit('user.role_update', 'User')
  async updateRole(
    @CurrentUser() actor: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    if (id === actor.id) throw new ForbiddenException('Không thể đổi role của chính mình');
    const target = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!target) throw new BadRequestException('User không tồn tại');
    return this.prisma.user.update({ where: { id }, data: { role: dto.role }, select: SAFE_SELECT });
  }

  @Patch(':id/status')
  @Audit('user.status_update', 'User')
  async updateStatus(
    @CurrentUser() actor: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    if (id === actor.id) throw new ForbiddenException('Không thể khóa chính mình');
    const target = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!target) throw new BadRequestException('User không tồn tại');
    return this.prisma.user.update({ where: { id }, data: { status: dto.status }, select: SAFE_SELECT });
  }
}
