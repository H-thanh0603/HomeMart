import { Module } from '@nestjs/common';
import { CatalogController, AdminCatalogController } from './catalog.controller';
import { ProductsController, AdminProductsController } from './products.controller';
import { CategoriesService } from './categories.service';
import { BrandsService } from './brands.service';
import { ProductsService } from './products.service';

@Module({
  controllers: [CatalogController, AdminCatalogController, ProductsController, AdminProductsController],
  providers: [CategoriesService, BrandsService, ProductsService],
  exports: [ProductsService, CategoriesService],
})
export class CatalogModule {}
