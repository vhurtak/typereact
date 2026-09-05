import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Interceptors wrap the handler: they see the request on the way IN and the
 * response stream on the way OUT. That is what makes them the right place for
 * logging, timing, response shaping and caching — and the wrong place for
 * authorization (that is a Guard, which runs earlier and can short-circuit).
 *
 * Request lifecycle order, worth memorising:
 *   middleware -> guards -> interceptors (pre) -> pipes -> handler
 *              -> interceptors (post) -> exception filters
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ method: string; url: string }>();
    const startedAt = Date.now();

    return next
      .handle()
      .pipe(
        tap(() =>
          this.logger.log(`${request.method} ${request.url} — ${Date.now() - startedAt}ms`),
        ),
      );
  }
}
