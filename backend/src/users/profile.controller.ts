import { Controller, Get, Patch, Post, Body, Request, UseGuards } from '@nestjs/common';
import { UsersService, UpdateProfileDto, ChangePasswordDto } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// Self-service endpoints for the currently authenticated user (any role).
@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getProfile(@Request() req) {
    return this.usersService.getProfile(req.user.id);
  }

  @Patch()
  updateProfile(@Request() req, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.id, dto);
  }

  @Post('change-password')
  changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(req.user.id, dto);
  }
}
