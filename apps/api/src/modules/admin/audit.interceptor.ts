import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
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
        this.prisma.auditLog
          .create({
            data: {
              actorId,
              action: meta.action,
              entity: meta.entity,
              entityId,
              after: { body: request.body ?? null } as object,
              ip: request.ip,
            },
          })
          .catch(() => undefined); // never break request on audit failure
      }),
    );
  }
}
