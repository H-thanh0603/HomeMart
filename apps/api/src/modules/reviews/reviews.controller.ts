import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, IsUrl, Max, MaxLength, Min } from 'class-validator';
import { Role } from '@prisma/client';
import { CurrentUser, Public, Roles } from '../../common/decorators/auth.decorators';
import { clampLimit, clampPage } from '../../common/utils/helpers';
import { Audit } from '../admin/audit.decorator';
import { ReviewsService } from './reviews.service';

export class CreateReviewDto {
  @IsString() @MaxLength(50) orderItemId!: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(5) rating!: number;
  @IsOptional() @IsString() @MaxLength(2000) comment?: string;
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
    return this.reviewsService.listByProductSlug(slug, clampPage(page), clampLimit(limit, 10));
  }

  @Public()
  @Get('products/:productId/reviews/by-id')
  list(@Param('productId') productId: string, @Query('page') page = '1', @Query('limit') limit = '10') {
    return this.reviewsService.listByProduct(productId, clampPage(page), clampLimit(limit, 10));
  }
}

export class ModerateReviewDto {
  @IsIn(['APPROVED', 'HIDDEN']) status!: 'APPROVED' | 'HIDDEN';
}

@ApiTags('admin/reviews')
@ApiBearerAuth()
@Roles(Role.STAFF)
@Controller('admin/reviews')
export class AdminReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Patch(':id/moderate') @Audit('review.moderate', 'Review')
  moderate(@Param('id') id: string, @Body() dto: ModerateReviewDto) {
    return this.reviewsService.moderate(id, dto.status);
  }
}
