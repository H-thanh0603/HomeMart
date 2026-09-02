import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CategoryStatus, Prisma } from 'src/generated/prisma/client';
import { PrismaService } from '../../infra/prisma.service';
import { slugify } from '../../common/utils/helpers';

export interface CategoryTreeNode {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  sortOrder: number;
  children: CategoryTreeNode[];
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async getTree(): Promise<CategoryTreeNode[]> {
    const categories = await this.prisma.category.findMany({
      where: { deletedAt: null, status: CategoryStatus.ACTIVE },
      orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }],
    });
    return this.buildTree(categories);
  }

  private buildTree(categories: {
    id: string; parentId: string | null; name: string; slug: string; imageUrl: string | null; sortOrder: number;
  }[]): CategoryTreeNode[] {
    const map = new Map<string, CategoryTreeNode>();
    for (const c of categories) map.set(c.id, { ...c, children: [] });
    const roots: CategoryTreeNode[] = [];
    for (const c of categories) {
      const node = map.get(c.id)!;
      if (c.parentId && map.has(c.parentId)) map.get(c.parentId)!.children.push(node);
      else roots.push(node);
    }
    return roots;
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findFirst({
      where: { slug, deletedAt: null },
      include: { children: { where: { status: 'ACTIVE', deletedAt: null } } },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async create(dto: CreateCategoryDto) {
    await this.assertSlugFree(dto.slug ?? slugify(dto.name));
    return this.prisma.category.create({
      data: {
        name: dto.name,
        slug: dto.slug || slugify(dto.name),
        description: dto.description,
        imageUrl: dto.imageUrl,
        parentId: dto.parentId,
        sortOrder: dto.sortOrder ?? 0,
        seoTitle: dto.seoTitle,
        seoDescription: dto.seoDescription,
      },
    });
  }

  update(id: string, dto: UpdateCategoryDto) {
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  /** Soft delete; blocks when children exist. */
  async remove(id: string) {
    const children = await this.prisma.category.count({ where: { parentId: id, deletedAt: null } });
    if (children > 0) throw new ConflictException('Category has sub-categories');
    await this.prisma.category.update({ where: { id }, data: { deletedAt: new Date(), status: 'INACTIVE' } });
    return { message: 'Deleted' };
  }

  private async assertSlugFree(slug: string) {
    const existing = await this.prisma.category.findUnique({ where: { slug } });
    if (existing) throw new ConflictException(`Slug "${slug}" already exists`);
  }
}

export interface CreateCategoryDto {
  name: string;
  slug?: string;
  description?: string;
  imageUrl?: string;
  parentId?: string | null;
  sortOrder?: number;
  seoTitle?: string;
  seoDescription?: string;
}

export type UpdateCategoryDto = Partial<CreateCategoryDto> & { status?: CategoryStatus };
export type CategoryWhere = Prisma.CategoryWhereInput;
