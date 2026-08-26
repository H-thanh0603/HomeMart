import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/auth.decorators';
import { UsersService } from './users.service';
import { CreateAddressDto, UpdateAddressDto, UpdateProfileDto } from './dto/users.dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users/me')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  me(@CurrentUser('id') userId: string) {
    return this.usersService.listAddresses(userId);
  }

  @Patch()
  updateMe(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateMe(userId, dto);
  }

  @Get('addresses')
  listAddresses(@CurrentUser('id') userId: string) {
    return this.usersService.listAddresses(userId);
  }

  @Post('addresses')
  createAddress(@CurrentUser('id') userId: string, @Body() dto: CreateAddressDto) {
    return this.usersService.createAddress(userId, dto);
  }

  @Patch('addresses/:id')
  updateAddress(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: UpdateAddressDto) {
    return this.usersService.updateAddress(userId, id, dto);
  }

  @Put('addresses/:id/default')
  setDefault(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.usersService.setDefaultAddress(userId, id);
  }

  @Delete('addresses/:id')
  deleteAddress(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.usersService.deleteAddress(userId, id);
  }
}
