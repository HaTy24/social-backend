import { Observable } from 'rxjs';

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';


@Injectable()
export class HttpLatencyInterceptor implements NestInterceptor {
  private logger = new Logger(this.constructor.name, { timestamp: true });

  public intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    const request: any = context.switchToHttp().getRequest();

    request.startTime = new Date();

    return next.handle();
  }
}
