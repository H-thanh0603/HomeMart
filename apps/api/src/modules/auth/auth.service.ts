import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { UserStatus, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { PrismaService } from '../../infra/prisma.service';
import { randomToken } from '../../common/utils/helpers';

const BCRYPT_ROUNDS = 12;
const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly events: EventEmitter2,
  ) {}

  async register(dto: { email: string; password: string; fullName: string; phone?: string }) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new ConflictException('Email already registered');

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
        fullName: dto.fullName,
        phone: dto.phone,
      },
      select: this.userSelect,
    });

    // Email verification token (dev: logged; prod: emailed via listener)
    const verifyToken = randomToken(40);
    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: sha256(verifyToken), purpose: 'EMAIL_VERIFY', expiresAt: new Date(Date.now() + 24 * 3600e3) },
    });
    this.events.emit('auth.registered', { email: user.email, fullName: user.fullName, verifyToken });

    const tokens = await this.issueTokens(user.id, user.email as string, user.role);
    return { user, ...tokens };
  }

  async login(email: string, password: string, meta?: { ip?: string; userAgent?: string }) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      this.logger.warn(`Failed login attempt: ${email} ip=${meta?.ip ?? '?'}`);
      throw new UnauthorizedException('Invalid email or password');
    }
    if (user.status === UserStatus.BANNED) throw new UnauthorizedException('Account is banned');
    if (user.status === UserStatus.INACTIVE) throw new UnauthorizedException('Account is deactivated');

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const tokens = await this.issueTokens(user.id, user.email, user.role, meta);
    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
        emailVerifiedAt: user.emailVerifiedAt,
      },
      ...tokens,
    };
  }

  /**
   * Refresh token rotation. Reuse of a rotated token revokes the whole session chain.
   */
  async refresh(rawRefreshToken: string) {
    let payload: { sub: string; type: string };
    try {
      payload = await this.jwt.verifyAsync(rawRefreshToken, { secret: process.env.JWT_REFRESH_SECRET });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (payload.type !== 'refresh') throw new UnauthorizedException('Invalid token type');

    const tokenHash = sha256(rawRefreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored) {
      // Unknown token — could be expired/cleaned; reject.
      throw new UnauthorizedException('Refresh token not recognized');
    }
    if (stored.revokedAt) {
      // Token reuse detected → revoke entire chain for this user
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      this.logger.warn(`Refresh token reuse detected for user ${stored.userId} — chain revoked`);
      throw new UnauthorizedException('Session expired, please login again');
    }
    if (stored.expiresAt < new Date()) throw new UnauthorizedException('Refresh token expired');

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== UserStatus.ACTIVE) throw new UnauthorizedException('Account unavailable');

    const tokens = await this.issueTokens(user.id, user.email, user.role);
    // Rotate: revoke old
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date(), replacedBy: tokens.refreshToken ? 'rotated' : null },
    });
    return tokens;
  }

  async logout(refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash: sha256(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { message: 'Logged out' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    // Always succeed to avoid email enumeration
    if (user) {
      const resetToken = randomToken(40);
      await this.prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash: sha256(resetToken), purpose: 'PASSWORD_RESET', expiresAt: new Date(Date.now() + 3600e3) },
      });
      this.events.emit('auth.forgot-password', { email: user.email, fullName: user.fullName, resetToken });
    }
    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    const record = await this.prisma.passwordResetToken.findFirst({ where: { tokenHash: sha256(token), purpose: 'PASSWORD_RESET' } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS) },
      }),
      this.prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      // Revoke all sessions after password change
      this.prisma.refreshToken.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    return { message: 'Password reset successfully' };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS) },
      }),
      this.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    return { message: 'Password changed successfully' };
  }

  async verifyEmail(token: string) {
    const record = await this.prisma.passwordResetToken.findFirst({ where: { tokenHash: sha256(token), purpose: 'EMAIL_VERIFY' } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired verification token');
    }
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
      this.prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);
    return { message: 'Email verified' };
  }

  getMe(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId }, select: this.userSelect });
  }

  // ─── helpers ───

  private userSelect = {
    id: true,
    email: true,
    fullName: true,
    phone: true,
    role: true,
    status: true,
    avatarUrl: true,
    emailVerifiedAt: true,
    createdAt: true,
  };

  private async issueTokens(
    userId: string,
    email: string,
    role: Role,
    meta?: { ip?: string; userAgent?: string },
  ) {
    const envTtlDays = Number(process.env.JWT_REFRESH_TTL_DAYS ?? 7);
    const accessToken = await this.jwt.signAsync(
      { sub: userId, email, role, type: 'access' },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: process.env.JWT_ACCESS_TTL ?? '15m' },
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: userId, email, role, type: 'refresh', jti: randomToken(16) },
      { secret: process.env.JWT_REFRESH_SECRET, expiresIn: `${envTtlDays}d` },
    );
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: sha256(refreshToken),
        userAgent: meta?.userAgent,
        ip: meta?.ip,
        expiresAt: new Date(Date.now() + envTtlDays * 86400e3),
      },
    });
    return { accessToken, refreshToken };
  }
}
