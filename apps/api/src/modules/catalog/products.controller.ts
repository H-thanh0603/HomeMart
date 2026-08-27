import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Role, ProductStatus } from '@prisma/client';
import { Public, Roles } from '../../common/decorators/auth.decorators';
import { Audit } from '../admin/audit.decorator';
import { buildPagedMeta } from '../../common/dto/pagination.dto';
import { ProductsService, ProductQuery } from './products.service';
import { BulkProductActionDto, ProductDto } from './catalog.controller';

export class ProductQueryDto {
  @IsOptional() @Type(() => Number) @IsNumber() page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsIn(['newest', 'price_asc', 'price_desc', 'best_selling', 'rating']) sort?: ProductQuery['sort'];
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() categorySlug?: string;
  @IsOptional() @IsString() brandId?: string;
  @IsOptional() @Type(() => Number) @IsNumber() minPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() maxPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() rating?: number;
  @IsOptional() @Type(() => Boolean) @IsBoolean() inStock?: boolean;
  @IsOptional() @Type(() => Boolean) @IsBoolean() onSale?: boolean;
}

@ApiTags('products')
@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get('products')
  @ApiOperation({ summary: 'Danh sách sản phẩm (filter + sort + phân trang)' })
  async list(@Query() query: ProductQueryDto) {
    const result = await this.productsService.list(query as ProductQuery);
    return { items: result.items, ...buildPagedMeta(result.total, result.page, result.limit) };
  }

  @Public()
  @Get('products/:slug')
  detail(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  @Public()
  @Get('products/:slug/related')
  related(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug).then((p) => this.productsService.findRelated(p.id));
  }
}

@ApiTags('admin/products')
@ApiBearerAuth()
@Roles(Role.STAFF)
@Controller('admin/products')
export class AdminProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Danh sách sản phẩm (kèm DRAFT/ARCHIVED)' })
  async list(@Query() query: ProductQueryDto & { status?: ProductStatus }) {
    const result = await this.productsService.list({ ...query, status: query.status ?? ProductStatus.PUBLISHED });
    return { items: result.items, ...buildPagedMeta(result.total, result.page, result.limit) };
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.productsService.getForAdmin(id);
  }

  @Post() @Roles(Role.MANAGER) @Audit('product.create', 'Product')
  create(@Body() dto: ProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(':id') @Audit('product.update', 'Product')
  update(@Param('id') id: string, @Body() dto: Partial<ProductDto>) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id') @Roles(Role.MANAGER) @Audit('product.delete', 'Product')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  @Patch(':id/restore') @Roles(Role.MANAGER) @Audit('product.restore', 'Product')
  restore(@Param('id') id: string) {
    return this.productsService.restore(id);
  }

  @Post('bulk') @Audit('product.bulk', 'Product')
  bulk(@Body() dto: BulkProductActionDto) {
    return this.productsService.bulkAction(dto.action, dto.ids);
  }

  @Post('import') @Roles(Role.MANAGER) @Audit('product.import', 'Product') @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: '[Admin] Import CSV 100 SP — header: sku,name,price,categorySlug,stock,weightGrams,description' })
  async importCsv(@UploadedFile() file: Express.Multer.File) {
    if (!file?.buffer) throw new Error('Thiếu file CSV (field name=file)');
    const csv = file.buffer.toString('utf-8');
    return this.productsService.importCsv(csv);
  }

  @Get('import/template') @Roles(Role.MANAGER)
  @ApiOperation({ summary: '[Admin] Tải template CSV mẫu' })
  template() {
    return {
      header: 'sku,name,price,categorySlug,stock,weightGrams,description',
      example: 'HM-BEP-001,Nồi inox 304 5L,299000,nha-bep,20,1200,Nồi inox 304 an toàn',
      categorySlugs: ['nha-bep', 'dien-gia-dung', 'dung-cu-sua-chua', 've-sinh-nha-cua', 'noi-that-nho', 'nha-thong-minh'],
    };
  }
}
