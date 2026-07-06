import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Req,
  Param,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('customers')
  @Roles('ADMIN', 'MANAGER')
  async getCustomers() {
    return this.usersService.findAllCustomers();
  }

  @Patch('profile')
  async updateProfile(@Req() req: any, @Body() updateData: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.userId, updateData);
  }

  @Get()
  @Roles('ADMIN')
  async getAllUsers() {
    return this.usersService.findAllUsers();
  }

  @Patch(':id/role')
  @Roles('ADMIN')
  async updateUserRole(@Param('id') id: string, @Body('role') role: Role) {
    return this.usersService.updateUserRole(Number(id), role);
  }
}
