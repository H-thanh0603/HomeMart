import { Body, Controller, Get, Ip, Post, Query, Req, Res, SetMetadata } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Public, CurrentUser, RequestUser } from '../../common/decorators/auth.decorators';
import { RATE_LIMIT_KEY } from '../../common/guards/rate-limit.guard';
import { getEnv } from '../../config/env';
import {
  AuthService,
} from './auth.service';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto/auth.dto';

/**
 * Refresh token transport: httpOnly cookie (`hm_rt`, scoped to /api/v1/auth)
 * instead of a JSON body the SPA would have to persist in localStorage.
 * The body field is still accepted on refresh/logout for backward compatibility
 * with clients issued before this change.
 */
const REFRESH_COOKIE = 'hm_rt';

// Per-endpoint auth rate limits scale with AUTH_THROTTLE_MULTIPLIER so load
// tests / flash sales can raise them without touching code.
const AUTH_RATE_LIMIT = (limit: number) =>
  SetMetadata(RATE_LIMIT_KEY, { limit: limit * getEnv().AUTH_THROTTLE_MULTIPLIER, ttlSeconds: 60 });

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setRefreshCookie(res: Response, refreshToken: string) {
    const ttlDays = getEnv().JWT_REFRESH_TTL_DAYS;
    res.cookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      secure: getEnv().NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth', // only sent to auth endpoints
      maxAge: ttlDays * 86400e3,
    });
  }

  private clearRefreshCookie(res: Response) {
    res.clearCookie(REFRESH_COOKIE, {
      httpOnly: true,
      secure: getEnv().NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth',
    });
  }

  @Public()
  @AUTH_RATE_LIMIT(10)
  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản' })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { refreshToken, ...rest } = await this.authService.register(dto);
    this.setRefreshCookie(res, refreshToken);
    return rest;
  }

  @Public()
  @AUTH_RATE_LIMIT(10)
  @Post('login')
  @ApiOperation({ summary: 'Đăng nhập' })
  async login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { refreshToken, ...rest } = await this.authService.login(dto.email, dto.password, {
      ip,
      userAgent: req.headers['user-agent'],
    });
    this.setRefreshCookie(res, refreshToken);
    return rest;
  }

  @Public()
  @AUTH_RATE_LIMIT(30) // rotation happens on every page load — generous but bounded
  @Post('refresh')
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const current = req.cookies?.[REFRESH_COOKIE] ?? dto.refreshToken;
    const { accessToken, refreshToken } = await this.authService.refresh(current);
    this.setRefreshCookie(res, refreshToken); // rotation — replace cookie
    return { accessToken };
  }

  @Public()
  @Post('logout')
  logout(@Body() dto: RefreshTokenDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE] ?? dto.refreshToken;
    void this.authService.logout(token);
    this.clearRefreshCookie(res);
    return { message: 'Logged out' };
  }

  @Public()
  @AUTH_RATE_LIMIT(5)
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @AUTH_RATE_LIMIT(10) // token-bearing password change — prevent brute force on tokens
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @ApiBearerAuth()
  @Post('change-password')
  changePassword(@CurrentUser('id') userId: string, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(userId, dto.currentPassword, dto.newPassword);
  }

  @Public()
  @AUTH_RATE_LIMIT(20)
  @Get('verify-email')
  verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return this.authService.getMe(user.id);
  }
}
