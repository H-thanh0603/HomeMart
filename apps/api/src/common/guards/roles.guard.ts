import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/auth.decorators';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    const rank: Record<Role, number> = { CUSTOMER: 0, STAFF: 1, MANAGER: 2, ADMIN: 3 };
    const userRank = rank[user.role as Role] ?? -1;
    // Required roles are satisfied if user rank >= min required rank (hierarchical RBAC)
    const minRequired = Math.min(...required.map((r) => rank[r] ?? Infinity));
    if (userRank < minRequired) throw new ForbiddenException('Insufficient permissions');
    return true;
  }
}
