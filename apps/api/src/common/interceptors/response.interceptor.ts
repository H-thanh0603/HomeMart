import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Envelope<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<Envelope<T>> {
    return next.handle().pipe(
      map((data) => {
        if (data && typeof data === 'object' && '__envelope' in (data as object)) {
          const { __envelope, ...rest } = data as T & { __envelope: Partial<Envelope<T>> };
          return { success: true, message: 'OK', data: rest as T, ...__envelope };
        }
        return { success: true, message: 'OK', data };
      }),
    );
  }
}
