import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async updateMe(userId: string, dto: { fullName?: string; phone?: string; avatarUrl?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { fullName: dto.fullName, phone: dto.phone, avatarUrl: dto.avatarUrl },
      select: { id: true, email: true, fullName: true, phone: true, avatarUrl: true },
    });
  }

  listAddresses(userId: string) {
    return this.prisma.address.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  createAddress(userId: string, dto: CreateAddressDto) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
      }
      const count = await tx.address.count({ where: { userId, deletedAt: null } });
      return tx.address.create({
        data: { ...dto, userId, isDefault: dto.isDefault || count === 0 },
      });
    });
  }

  async updateAddress(userId: string, addressId: string, dto: Partial<CreateAddressDto>) {
    await this.assertOwnership(userId, addressId);
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
      }
      return tx.address.update({ where: { id: addressId }, data: dto });
    });
  }

  async setDefaultAddress(userId: string, addressId: string) {
    await this.assertOwnership(userId, addressId);
    return this.prisma.$transaction(async (tx) => {
      await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
      return tx.address.update({ where: { id: addressId }, data: { isDefault: true } });
    });
  }

  async deleteAddress(userId: string, addressId: string) {
    await this.assertOwnership(userId, addressId);
    await this.prisma.address.update({ where: { id: addressId }, data: { deletedAt: new Date() } });
    // Promote another address to default if needed
    const remaining = await this.prisma.address.findFirst({ where: { userId, deletedAt: null, isDefault: false } });
    const hasDefault = await this.prisma.address.findFirst({ where: { userId, deletedAt: null, isDefault: true } });
    if (!hasDefault && remaining) {
      await this.prisma.address.update({ where: { id: remaining.id }, data: { isDefault: true } });
    }
    return { message: 'Deleted' };
  }

  private async assertOwnership(userId: string, addressId: string) {
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, deletedAt: null },
    });
    if (!address) throw new NotFoundException('Address not found');
    if (address.userId !== userId) throw new ForbiddenException('Not your address');
  }
}

export interface CreateAddressDto {
  fullName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  line: string;
  isDefault?: boolean;
}

