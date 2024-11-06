import { Cache } from 'cache-manager';
import { Request } from 'express';
import { Observable, throwError } from 'rxjs';

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
  SetMetadata,
  UseInterceptors,
  applyDecorators,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RateLimitingInterceptor implements NestInterceptor {
  constructor(
    @Inject(CACHE_MANAGER) private cacheService: Cache,
    protected configService: ConfigService,
    protected reflector: Reflector,
  ) {}

  public async intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Promise<Observable<any>> {
    const rateLimit =
      this.reflector.get('rate_limiting', context.getHandler()) || 60;

    const request: Request = context.switchToHttp().getRequest();
    const requestIp = request.ips.length ? request.ips[0] : request.ip;
    const endpoint = context.switchToHttp().getRequest().originalUrl;
    const method = context.switchToHttp().getRequest().method;

    const key = `route_rate_limiting:${endpoint}:${method}:${requestIp}`;
    const userReqCount = (parseInt(await this.cacheService.get(key)) || 0) + 1;

    if (userReqCount > rateLimit) {
      return throwError(() => {
        return new BadRequestException('too many request');
      });
    }

    await this.cacheService.set(key, userReqCount, 60000);

    return next.handle();
  }
}

export const ReqPerMinute = (reqPerMinute: number) =>
  SetMetadata('rate_limiting', reqPerMinute);

export const ApplyRateLimiting = (req_per_minute = 60) => {
  return applyDecorators(
    UseInterceptors(RateLimitingInterceptor),
    ReqPerMinute(req_per_minute),
  );
};
