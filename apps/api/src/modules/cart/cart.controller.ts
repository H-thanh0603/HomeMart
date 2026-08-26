import { Body, Controller, Delete, Get, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { CurrentUser, OptionalAuth, Public } from '../../common/decorators/auth.decorators';
import { GuestToken } from '../../common/decorators/guest-token.decorator';
import { createGuestToken, isValidGuestToken } from '../../common/utils/helpers';
import { CartService } from './cart.service';

export class AddCartItemDto {
  @IsString() productId!: string;
  @IsOptional() @IsString() variantId?: string;
  @Type(() => Number) @IsInt() @Min(1) quantity!: number;
}

export class UpdateCartItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(99)
  quantity!: number;
}

export class MergeCartDto {
  @IsString()
  guestToken!: string;
}

@ApiTags('cart')
@ApiBearerAuth()
@OptionalAuth() // user có Bearer token hoặc guest qua X-Guest-Token
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  /** Guest tokens must be server-issued (id.hmac) — rejects forged/guessed values. */
  private assertValidGuestToken(guestToken?: string): string | undefined {
    if (guestToken && !isValidGuestToken(guestToken)) {
      throw new UnauthorizedException('Invalid guest token');
    }
    return guestToken;
  }

  private async resolveCart(userId?: string, guestToken?: string) {
    return this.cartService.getOrCreate(userId, this.assertValidGuestToken(guestToken));
  }

  @Public()
  @Get('guest-token')
  @ApiOperation({ summary: 'Cấp guest token (kèm chữ ký server) cho người dùng ẩn danh' })
  issueGuestToken() {
    return { guestToken: createGuestToken() };
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
    @Body() dto: UpdateCartItemDto,
    @CurrentUser('id') userId: string | undefined,
    @GuestToken() guestToken?: string,
  ) {
    return this.resolveCart(userId, guestToken).then((cart) =>
      this.cartService.updateQuantity(cart.id, itemId, dto.quantity),
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
  merge(@Body() dto: MergeCartDto, @CurrentUser('id') userId?: string) {
    if (!userId) throw new UnauthorizedException('Login required to merge cart');
    this.assertValidGuestToken(dto.guestToken);
    return this.cartService.mergeGuestCart(userId, dto.guestToken);
  }
}
