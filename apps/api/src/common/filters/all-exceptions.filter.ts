import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

interface FieldError {
  field: string;
  message: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: Record<string, unknown> = {
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse() as Record<string, unknown> | string;

      if (typeof res === 'string') {
        body = { success: false, message: res, code: HttpStatus[status] ?? 'ERROR' };
      } else if (Array.isArray(res.message) && (res.statusCode === 400 || status === 422)) {
        // class-validator errors
        const errors: FieldError[] = (res.message as unknown[]).map((m) => this.parseValidationError(m));
        body = { success: false, message: 'Validation failed', code: 'VALIDATION_ERROR', errors };
      } else {
        body = {
          success: false,
          message: (res.message as string) ?? exception.message,
          code: (res.code as string) ?? HttpStatus[status] ?? 'ERROR',
          ...(res.errors ? { errors: res.errors } : {}),
        };
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          body = { success: false, message: 'Duplicated record', code: 'CONFLICT' };
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          body = { success: false, message: 'Record not found', code: 'NOT_FOUND' };
          break;
        default:
          this.logger.error(`Prisma error ${exception.code}: ${exception.message}`);
      }
    }

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    // Never leak stack traces in production
    if (process.env.NODE_ENV !== 'production' && status >= 500 && body.code === 'INTERNAL_ERROR') {
      body.detail = exception instanceof Error ? exception.message : String(exception);
    }

    response.status(status).json(body);
  }

  private parseValidationError(m: unknown): FieldError {
    if (typeof m === 'string') return { field: '', message: m };
    const obj = m as Record<string, unknown>;
    const constraints = (obj.constraints ?? {}) as Record<string, string>;
    return {
      field: String(obj.property ?? ''),
      message: Object.values(constraints)[0] ?? 'Invalid value',
    };
  }
}
