import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma.service';
import { slugify } from '../../common/utils/helpers';

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.brand.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async findBySlug(slug: string) {
    const brand = await this.prisma.brand.findFirst({ where: { slug, deletedAt: null }, include: { _count: { select: { products: true } } } });
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  async create(dto: { name: string; slug?: string; logoUrl?: string; description?: string }) {
    const slug = dto.slug || slugify(dto.name);
    if (await this.prisma.brand.findUnique({ where: { slug } })) {
      throw new ConflictException(`Brand slug "${slug}" exists`);
    }
    return this.prisma.brand.create({ data: { ...dto, slug } });
  }

  update(id: string, dto: { name?: string; slug?: string; logoUrl?: string; description?: string }) {
    return this.prisma.brand.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.prisma.brand.findUniqueOrThrow({ where: { id } });
    await this.prisma.brand.update({ where: { id }, data: { deletedAt: new Date() } });
    return { message: 'Deleted' };
  }
}
