import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { IS_PUBLIC_KEY, OPTIONAL_AUTH_KEY } from '../decorators/auth.decorators';

export interface RequestUser {
  id: string;
  email: string;
  role: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  type: 'access' | 'refresh';
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const optionalAuth = this.reflector.getAllAndOverride<boolean>(OPTIONAL_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const header: string | undefined = request.headers['authorization'];
    if (!header?.startsWith('Bearer ')) {
      // Optional-auth routes (vd: guest cart) cho phép đi tiếp không danh tính
      if (optionalAuth) return true;
      throw new UnauthorizedException('Missing access token');
    }

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(header.slice(7), {
        secret: process.env.JWT_ACCESS_SECRET,
      });
      if (payload.type !== 'access') throw new Error();
      request.user = { id: payload.sub, email: payload.email, role: payload.role };
    } catch {
      if (!optionalAuth) throw new UnauthorizedException('Invalid or expired access token');
      // Token hỏng/hết hạn trên route optional → coi như guest
    }
    return true;
  }
}
