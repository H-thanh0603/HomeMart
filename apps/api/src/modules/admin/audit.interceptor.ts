import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../infra/prisma.service';
import { AUDIT_KEY } from './audit.decorator';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get(AUDIT_KEY, context.getHandler());
    if (!meta) return next.handle();

    const request = context.switchToHttp().getRequest();
    const actorId: string | undefined = request.user?.id;
    const entityId: string | undefined =
      request.params?.id ?? request.body?.id ?? undefined;

    return next.handle().pipe(
      tap(() => {
        // Redact sensitive fields before persisting raw bodies
        const body = { ...(request.body ?? {}) };
        for (const key of ['password', 'newPassword', 'currentPassword', 'refreshToken', 'token']) {
          if (key in body) body[key] = '[REDACTED]';
        }
        this.prisma.auditLog
          .create({
            data: {
              actorId,
              action: meta.action,
              entity: meta.entity,
              entityId,
              after: { body } as object,
              ip: request.ip,
            },
          })
          .catch((e) => {
            // Never break the request, but never lose the trace silently either
            Logger.warn(`Audit log write failed for ${meta.action}: ${e?.message ?? e}`, 'AuditInterceptor');
          });
      }),
    );
  }
}
