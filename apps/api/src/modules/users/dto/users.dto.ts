import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional() @Matches(/^0\d{9,10}$/)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(500) @Matches(/^https?:\/\//)
  avatarUrl?: string;
}

export class CreateAddressDto implements UsersAddressShape {
  @ApiProperty()
  @IsString() @MinLength(2) @MaxLength(100)
  fullName: string;

  @ApiProperty({ example: '0901234567' })
  @Matches(/^0\d{9,10}$/)
  phone: string;

  @ApiProperty({ example: 'Hà Nội' })
  @IsString()
  province: string;

  @ApiProperty({ example: 'Cầu Giấy' })
  @IsString()
  district: string;

  @ApiProperty({ example: 'Dịch Vọng' })
  @IsString()
  ward: string;

  @ApiProperty({ example: 'Số 12, ngõ 5, Xuân Thuỷ' })
  @IsString() @MinLength(4)
  line: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional() @Type(() => Boolean) @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAddressDto {
  @IsOptional() @IsString() @MinLength(2)
  fullName?: string;

  @IsOptional() @Matches(/^0\d{9,10}$/)
  phone?: string;

  @IsOptional() @IsString()
  province?: string;

  @IsOptional() @IsString()
  district?: string;

  @IsOptional() @IsString()
  ward?: string;

  @IsOptional() @IsString() @MinLength(4)
  line?: string;

  @IsOptional() @Type(() => Boolean) @IsBoolean()
  isDefault?: boolean;
}

export interface UsersAddressShape {
  fullName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  line: string;
  isDefault?: boolean;
}
