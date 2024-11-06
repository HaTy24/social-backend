import { createId } from '@paralleldrive/cuid2';
import { Request } from 'express';
import { Observable, catchError, of, tap } from 'rxjs';

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
  createParamDecorator,
} from '@nestjs/common';

export const HEADER_KEY_LOG_ID = 'X-Trace-Id';

export const logStringify = (data) =>
  typeof data === 'string' ? data : JSON.stringify(data);

export const GetLogId = (request: Request) => {
  if (!request.headers[HEADER_KEY_LOG_ID]) {
    request.headers[HEADER_KEY_LOG_ID] = createId().toUpperCase();
  }
  return request.headers[HEADER_KEY_LOG_ID] as string;
};

export const LogId = createParamDecorator(
  (_: any, ctx: ExecutionContext): string => {
    const request: Request = ctx.switchToHttp().getRequest();
    return GetLogId(request);
  },
);

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private logger = new Logger(this.constructor.name);

  public intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    const request: Request = context.switchToHttp().getRequest();
    const logId = GetLogId(request);
    const user = request['activeUser'] as any;
    const userString = user
      ? `${user.id}/${user.socialId}/${user.twitterScreenName}`
      : 'anonymous';

    this.logger.verbose(`[${logId}]: User: ${userString}`);
    this.logger.verbose(
      `[${logId}]: Request: ${request.method} ${request.url} ${
        request.body ? JSON.stringify(request.body) : ''
      }`,
    );
    return next.handle().pipe(
      tap((responseBody: any) => {
        const body = JSON.stringify(responseBody);
        if (request.url.includes('/recent') && body?.length > 1024) {
          body.substring(0, 1024) + '...';
        }
        this.logger.verbose(`[${logId}]: Response: ${body}`);
      }),
      catchError((error) => {
        this.logger.error(`[${logId}]: ${error?.message}`, error.stack);
        return of(error);
      }),
    );
  }
}
