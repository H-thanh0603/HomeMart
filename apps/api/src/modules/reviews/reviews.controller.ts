import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsString, IsUrl, Max, Min } from 'class-validator';
import { Role } from '@prisma/client';
import { CurrentUser, Public, Roles } from '../../common/decorators/auth.decorators';
import { Audit } from '../admin/audit.decorator';
import { ReviewsService } from './reviews.service';

export class CreateReviewDto {
  @IsString() orderItemId!: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(5) rating!: number;
  @IsOptional() @IsString() comment?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(5) @IsUrl({}, { each: true })
  imageUrls?: string[];
}

@ApiTags('reviews')
@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @ApiBearerAuth()
  @Post('reviews')
  create(@CurrentUser('id') userId: string, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(userId, dto);
  }

  /** Frontend contract: GET /products/:slug/reviews */
  @Public()
  @Get('products/:slug/reviews')
  listBySlug(@Param('slug') slug: string, @Query('page') page = '1', @Query('limit') limit = '10') {
    return this.reviewsService.listByProductSlug(slug, Number(page), Number(limit));
  }

  @Public()
  @Get('products/:productId/reviews/by-id')
  list(@Param('productId') productId: string, @Query('page') page = '1', @Query('limit') limit = '10') {
    return this.reviewsService.listByProduct(productId, Number(page), Number(limit));
  }
}

@ApiTags('admin/reviews')
@ApiBearerAuth()
@Roles(Role.STAFF)
@Controller('admin/reviews')
export class AdminReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Patch(':id/moderate') @Audit('review.moderate', 'Review')
  moderate(@Param('id') id: string, @Body() dto: { status: 'APPROVED' | 'HIDDEN' }) {
    return this.reviewsService.moderate(id, dto.status);
  }
}
