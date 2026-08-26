import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { CurrentUser, OptionalAuth } from '../../common/decorators/auth.decorators';
import { GuestToken } from '../../common/decorators/guest-token.decorator';
import { CartService } from './cart.service';

export class AddCartItemDto {
  @IsString() productId!: string;
  @IsOptional() @IsString() variantId?: string;
  @Type(() => Number) @IsInt() @Min(1) quantity!: number;
}

@ApiTags('cart')
@ApiBearerAuth()
@OptionalAuth() // user có Bearer token hoặc guest qua X-Guest-Token
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  private async resolveCart(userId?: string, guestToken?: string) {
    return this.cartService.getOrCreate(userId, guestToken);
  }

  @Get()
  @ApiOperation({ summary: 'Xem giỏ hàng (user hoặc guest qua X-Guest-Token)' })
  get(@CurrentUser('id') userId: string | undefined, @GuestToken() guestToken?: string) {
    return this.resolveCart(userId, guestToken);
  }

  @Post('items')
  addItem(
    @Body() dto: AddCartItemDto,
    @CurrentUser('id') userId: string | undefined,
    @GuestToken() guestToken?: string,
  ) {
    return this.resolveCart(userId, guestToken).then((cart) =>
      this.cartService.addItem(cart.id, dto),
    );
  }

  @Patch('items/:id')
  updateQty(
    @Param('id') itemId: string,
    @Body() dto: { quantity: number },
    @CurrentUser('id') userId: string | undefined,
    @GuestToken() guestToken?: string,
  ) {
    return this.resolveCart(userId, guestToken).then((cart) =>
      this.cartService.updateQuantity(cart.id, itemId, Number(dto.quantity)),
    );
  }

  @Delete('items/:id')
  removeItem(
    @Param('id') itemId: string,
    @CurrentUser('id') userId: string | undefined,
    @GuestToken() guestToken?: string,
  ) {
    return this.resolveCart(userId, guestToken).then((cart) => this.cartService.removeItem(cart.id, itemId));
  }

  /** Toggle save-for-later (also used to move saved item back to cart). */
  @Post('items/:id/save')
  toggleSave(
    @Param('id') itemId: string,
    @CurrentUser('id') userId: string | undefined,
    @GuestToken() guestToken?: string,
  ) {
    return this.resolveCart(userId, guestToken).then((cart) => this.cartService.toggleSaved(cart.id, itemId));
  }

  @ApiBearerAuth()
  @Post('merge')
  merge(@Body() dto: { guestToken: string }, @CurrentUser('id') userId?: string) {
    if (!userId) throw new UnauthorizedException('Login required to merge cart');
    return this.cartService.mergeGuestCart(userId, dto.guestToken);
  }
}
