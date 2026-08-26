import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsArray, IsIn, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Role } from '@prisma/client';
import { Public, Roles } from '../../common/decorators/auth.decorators';
import { Audit } from '../admin/audit.decorator';
import { CategoriesService } from './categories.service';
import { ProductsService } from './products.service';
import { BrandsService } from './brands.service';

// ─────────── DTOs ───────────

export class CategoryDto {
  @IsString() name!: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() parentId?: string | null;
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
  @IsOptional() @IsString() seoTitle?: string;
  @IsOptional() @IsString() seoDescription?: string;
}

export class BrandDto {
  @IsString() name!: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() description?: string;
}

export class ProductImageDto {
  @IsString() url!: string;
  @IsOptional() @IsString() alt?: string;
  @IsOptional() @Type(() => Boolean) isPrimary?: boolean;
}

export class ProductAttributeInputDto {
  @IsString() name!: string;
  @IsString() value!: string;
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
}

export class VariantInputDto {
  @IsString() sku!: string;
  @IsObject() attributes!: Record<string, string>;
  @Type(() => Number) @IsInt() @Min(0) price!: number;
  @IsOptional() @Type(() => Number) @IsInt() compareAtPrice?: number;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) stock?: number;
}

export class ProductDto {
  @IsString() sku!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() shortDescription?: string;
  @IsOptional() @IsString() description?: string;
  @IsString() categoryId!: string;
  @IsOptional() @IsString() brandId?: string | null;
  @Type(() => Number) @IsInt() @Min(0) price!: number;
  @IsOptional() @Type(() => Number) @IsInt() compareAtPrice?: number;
  @IsOptional() @Type(() => Number) @IsInt() costPrice?: number;
  @IsOptional() @Type(() => Number) @IsInt() stock?: number;
  @IsOptional() @Type(() => Number) @IsInt() weightGrams?: number;
  @IsOptional() @Type(() => Number) @IsInt() warrantyMonths?: number;
  @IsOptional() @IsString() origin?: string;
  @IsOptional() @IsArray() tags?: string[];
  @IsOptional() @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED']) status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  @IsOptional() @IsString() seoTitle?: string;
  @IsOptional() @IsString() seoDescription?: string;
  @IsOptional() @IsArray() relatedProductIds?: string[];
  @IsOptional() @IsArray() images?: ProductImageDto[];
  @IsOptional() @IsArray() attributes?: ProductAttributeInputDto[];
  @IsOptional() @IsArray() variants?: VariantInputDto[];
}

export class BulkProductActionDto {
  @IsIn(['publish', 'archive', 'delete']) action!: 'publish' | 'archive' | 'delete';
  @IsArray() @IsString({ each: true }) ids!: string[];
}

// ─────────── Public catalog controller ───────────

@ApiTags('catalog')
@Controller()
export class CatalogController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly brandsService: BrandsService,
    private readonly productsService: ProductsService,
  ) {}

  // Categories
  @Public() @Get('categories')
  @ApiOperation({ summary: 'Cây danh mục' })
  categoryTree() {
    return this.categoriesService.getTree();
  }

  @Public() @Get('categories/:slug')
  categoryBySlug(@Param('slug') slug: string) {
    return this.categoriesService.findBySlug(slug);
  }

  // Brands
  @Public() @Get('brands')
  brands() {
    return this.brandsService.list();
  }

  @Public() @Get('brands/:slug')
  brandBySlug(@Param('slug') slug: string) {
    return this.brandsService.findBySlug(slug);
  }

  // Search suggest
  @Public() @Get('search/suggest')
  @ApiOperation({ summary: 'Autocomplete gợi ý sản phẩm' })
  suggest(@Query('q') q = '') {
    return this.productsService.suggest(q);
  }
}

// ─────────── Admin categories/brands ───────────

@ApiTags('admin/catalog')
@ApiBearerAuth()
@Roles(Role.MANAGER)
@Controller('admin')
export class AdminCatalogController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly brandsService: BrandsService,
  ) {}

  @Post('categories') @Audit('category.create', 'Category')
  createCategory(@Body() dto: CategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Patch('categories/:id') @Audit('category.update', 'Category')
  updateCategory(@Param('id') id: string, @Body() dto: Partial<CategoryDto>) {
    return this.categoriesService.update(id, dto);
  }

  @Delete('categories/:id') @Audit('category.delete', 'Category')
  deleteCategory(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }

  @Post('brands') @Audit('brand.create', 'Brand')
  createBrand(@Body() dto: BrandDto) {
    return this.brandsService.create(dto);
  }

  @Patch('brands/:id') @Audit('brand.update', 'Brand')
  updateBrand(@Param('id') id: string, @Body() dto: Partial<BrandDto>) {
    return this.brandsService.update(id, dto);
  }

  @Delete('brands/:id') @Audit('brand.delete', 'Brand')
  deleteBrand(@Param('id') id: string) {
    return this.brandsService.remove(id);
  }
}
