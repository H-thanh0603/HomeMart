import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { CurrentUser } from '../../common/decorators/auth.decorators';
import { WishlistService } from './wishlist.service';

export class WishlistItemDto {
  @IsString() productId!: string;
}

@ApiTags('wishlist')
@ApiBearerAuth()
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  get(@CurrentUser('id') userId: string) {
    return this.wishlistService.getOrCreate(userId);
  }

  @Post()
  add(@Body() dto: WishlistItemDto, @CurrentUser('id') userId: string) {
    return this.wishlistService.addItem(userId, dto.productId);
  }

  @Delete(':productId')
  remove(@Param('productId') productId: string, @CurrentUser('id') userId: string) {
    return this.wishlistService.removeItem(userId, productId);
  }
}
